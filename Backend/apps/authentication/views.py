import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .serializers import (
    RegisterSerializer, LoginSerializer,
    UtilisateurPublicSerializer, ChangePasswordSerializer, MFASetupSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer, VerifyResetOtpSerializer, ResetPasswordSerializer,
)
from .services.login_context import extract_login_context
from .services.email_service import issue_and_send_otp, verify_otp, send_welcome_email, send_login_attempt_email
from .services.password_reset import request_password_reset, verify_password_reset_otp, reset_password
from .services.session_security import (
    otp_required, reason_messages, revoke_all_sessions, update_trusted_context,
)

logger = logging.getLogger('apps.authentication')


class AuthRateThrottle(ScopedRateThrottle):
    scope = 'auth'


def _login_success_response(user, refresh):
    return Response({
        'success': True,
        'message': 'Connexion réussie.',
        'requires_otp': False,
        'data': {
            'user': UtilisateurPublicSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
        },
    })


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    agent = None
    commune = getattr(user, '_registration_commune', None)
    if commune and hasattr(user, 'client_profile'):
        from apps.clients.services.territoire import assign_client_on_registration
        agent = assign_client_on_registration(user.client_profile, commune)

    refresh = RefreshToken.for_user(user)
    logger.info(f"Nouvel utilisateur enregistré : {user.telephone} (commune {commune})")

    welcome_sent = False
    if user.email:
        try:
            send_welcome_email(user)
            welcome_sent = True
        except Exception:
            logger.exception('E-mail bienvenue non envoye')

    return Response({
        'success': True,
        'message': 'Compte créé avec succès.',
        'data': {
            'user': UtilisateurPublicSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'welcome_email_sent': welcome_sent,
            'agent_assigne': UtilisateurPublicSerializer(agent).data if agent else None,
            'commune_kinshasa': commune,
        }
    }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    ctx = extract_login_context(request, request.data)

    otp_code = (
        request.data.get('otp_code')
        or request.data.get('mfa_token')
        or ''
    ).strip()

    needs_otp, reasons = otp_required(user, ctx)

    if needs_otp:
        if not user.email:
            return Response({
                'success': False,
                'error': {
                    'code': 'email_required',
                    'message': 'Une adresse e-mail est requise pour la vérification OTP.',
                },
            }, status=status.HTTP_400_BAD_REQUEST)

        if not otp_code:
            try:
                human_reasons = reason_messages(reasons)
                masked = issue_and_send_otp(
                    user,
                    'login',
                    {'reasons': human_reasons, 'country': ctx['country'], 'device_id': ctx['device_id']},
                )
                try:
                    send_login_attempt_email(user, ctx, human_reasons)
                except Exception:
                    logger.exception('Alerte connexion non envoyée')
            except Exception as e:
                logger.exception('Envoi OTP login échoué')
                return Response({
                    'success': False,
                    'error': {'code': 'otp_send_failed', 'message': str(e)},
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            return Response({
                'success': True,
                'requires_otp': True,
                'message': f'Code de vérification envoyé à {masked}.',
                'data': {
                    'otp_sent_to': masked,
                    'reasons': human_reasons,
                    'validity_minutes': 10,
                },
            })

        if not verify_otp(user.id, 'login', otp_code):
            return Response({
                'success': False,
                'error': {'code': 'invalid_otp', 'message': 'Code OTP invalide ou expiré.'},
            }, status=status.HTTP_400_BAD_REQUEST)

    revoke_all_sessions(user)
    update_trusted_context(user, ctx)

    refresh = CustomTokenObtainPairSerializer.get_token(user)
    logger.info(f"Connexion réussie : {user.telephone} depuis {ctx['ip']} ({ctx['country']})")

    return _login_success_response(user, refresh)


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'success': False, 'error': {'message': 'Refresh token requis.'}},
                            status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        token.blacklist()
        logger.info(f"Déconnexion : {request.user.telephone}")
        return Response({'success': True, 'message': 'Déconnexion réussie.'})
    except Exception as e:
        return Response({'success': False, 'error': {'message': str(e)}},
                        status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=['Authentication'])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UtilisateurPublicSerializer(request.user)
    return Response({'success': True, 'data': serializer.data})


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.password_changed_at = timezone.now()
    request.user.save(update_fields=['password', 'password_changed_at'])
    logger.info(f"Mot de passe modifié : {request.user.telephone}")
    return Response({'success': True, 'message': 'Mot de passe mis à jour avec succès.'})


@extend_schema(tags=['MFA'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_setup_view(request):
    user = request.user
    if not user.email:
        return Response({
            'success': False,
            'error': {
                'code': 'email_required',
                'message': 'Ajoutez une adresse e-mail à votre profil avant d\'activer le MFA.',
            },
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.mfa_enabled:
        return Response({
            'success': False,
            'error': {'message': 'Le MFA est déjà activé sur ce compte.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        masked = issue_and_send_otp(user, 'mfa_setup', {'reasons': ['Activation de la double authentification']})
    except Exception as e:
        logger.exception('Envoi OTP MFA setup échoué')
        return Response({
            'success': False,
            'error': {'message': str(e)},
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        'success': True,
        'message': f'Code de vérification envoyé à {masked}.',
        'data': {'otp_sent_to': masked},
    })


@extend_schema(tags=['MFA'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify_view(request):
    serializer = MFASetupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not verify_otp(user.id, 'mfa_setup', serializer.validated_data['otp_token']):
        return Response({
            'success': False,
            'error': {'code': 'invalid_otp', 'message': 'Code OTP invalide ou expiré.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    user.mfa_enabled = True
    user.mfa_verified = True
    user.save(update_fields=['mfa_enabled', 'mfa_verified'])

    return Response({'success': True, 'message': 'Authentification à deux facteurs activée par e-mail.'})


@extend_schema(tags=['MFA'])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_disable_view(request):
    user = request.user
    if not user.mfa_enabled:
        return Response({
            'success': False,
            'error': {'message': 'Le MFA n\'est pas activé sur ce compte.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get('password', '')
    if not password or not user.check_password(password):
        return Response({
            'success': False,
            'error': {'code': 'invalid_password', 'message': 'Mot de passe incorrect.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    user.mfa_enabled = False
    user.mfa_verified = False
    user.mfa_secret = ''
    user.save(update_fields=['mfa_enabled', 'mfa_verified', 'mfa_secret'])
    logger.info(f"MFA désactivé : {user.telephone}")

    return Response({'success': True, 'message': 'Authentification à deux facteurs désactivée.'})


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def password_forgot_view(request):
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = request_password_reset(serializer.validated_data['email'])
    return Response({
        'success': True,
        'message': result['message'],
        'data': {'otp_sent_to': result.get('otp_sent_to')},
    })


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def password_verify_otp_view(request):
    serializer = VerifyResetOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        result = verify_password_reset_otp(data['email'], data['otp_code'])
    except ValueError as e:
        return Response({
            'success': False,
            'error': {'code': 'invalid_otp', 'message': str(e)},
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'message': result['message'],
        'data': {
            'reset_token': result['reset_token'],
            'email': result['email'],
        },
    })


@extend_schema(tags=['Authentication'])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def password_reset_view(request):
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        reset_password(
            data['email'],
            data['reset_token'],
            data['new_password'],
        )
    except ValueError as e:
        return Response({
            'success': False,
            'error': {'code': 'reset_failed', 'message': str(e)},
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'message': 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
    })
