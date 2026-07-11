from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAdministrateur, IsAgentOrManager
from apps.authentication.services.session_security import revoke_all_sessions
from apps.core.kinshasa_communes import KINSHASA_COMMUNES, COMMUNE_CODES
from apps.authentication.models import Role, Utilisateur
from apps.authentication.serializers import UtilisateurPublicSerializer


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_users_view(request):
    statut = request.query_params.get('statut')
    role = request.query_params.get('role')

    qs = Utilisateur.objects.select_related('role').order_by('-created_at')
    if statut:
        qs = qs.filter(statut=statut)
    if role:
        qs = qs.filter(role__nom_role=role)

    data = []
    for u in qs[:500]:
        item = UtilisateurPublicSerializer(u).data
        item['name'] = u.full_name
        item['role'] = u.role.nom_role if u.role else None
        data.append(item)

    return Response({'success': True, 'data': data, 'count': len(data)})


@extend_schema(tags=['Admin'])
@api_view(['PATCH'])
@permission_classes([IsAdministrateur])
def admin_update_user_view(request, user_id):
    try:
        user = Utilisateur.objects.select_related('role').get(pk=user_id)
    except Utilisateur.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Utilisateur introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    updated_fields = ['updated_at']

    commune = request.data.get('commune_kinshasa')
    if commune is not None:
        role_nom = user.role.nom_role if user.role else ''
        if role_nom != 'Agent de crédit':
            return Response(
                {'success': False, 'error': {'message': 'Seuls les agents de crédit ont une commune.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if commune and commune not in COMMUNE_CODES:
            return Response(
                {'success': False, 'error': {'message': 'Commune Kinshasa invalide.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.commune_kinshasa = commune
        updated_fields.append('commune_kinshasa')

    new_role = request.data.get('role')
    if new_role is not None:
        try:
            role_obj = Role.objects.get(nom_role=new_role)
        except Role.DoesNotExist:
            valid = list(Role.objects.values_list('nom_role', flat=True))
            return Response(
                {'success': False, 'error': {'message': f'Rôle invalide. Valeurs acceptées : {valid}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.role = role_obj
        updated_fields.append('role')

    new_statut = request.data.get('statut')
    if new_statut is not None:
        valid_statuts = [s[0] for s in Utilisateur.STATUTS]
        if new_statut not in valid_statuts:
            return Response(
                {'success': False, 'error': {'message': f'Statut invalide. Valeurs acceptées : {valid_statuts}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.statut = new_statut
        updated_fields.append('statut')

    user.save(update_fields=updated_fields)

    return Response({
        'success': True,
        'message': 'Utilisateur mis à jour.',
        'data': UtilisateurPublicSerializer(user).data,
    })


_DEFAULT_PASSWORD = 'Simbisa2025!'


@extend_schema(tags=['Admin'])
@api_view(['POST'])
@permission_classes([IsAdministrateur])
def admin_reset_any_password_view(request, user_id):
    try:
        user = Utilisateur.objects.get(pk=user_id)
    except Utilisateur.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Utilisateur introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    user.set_password(_DEFAULT_PASSWORD)
    user.save(update_fields=['password', 'updated_at'])
    revoke_all_sessions(user)

    from apps.authentication.services.email_service import send_temp_password_email
    send_temp_password_email(user, actor_name=request.user.full_name, default_password=_DEFAULT_PASSWORD)

    return Response({
        'success': True,
        'message': f'Mot de passe réinitialisé. E-mail envoyé à {user.email or "adresse inconnue"}.',
    })


@extend_schema(tags=['Admin'])
@api_view(['POST'])
@permission_classes([IsAgentOrManager])
def agent_reset_client_password_view(request, client_id):
    from apps.clients.models import Client
    from apps.clients.services.territoire import can_agent_access_client

    try:
        client = Client.objects.select_related('id_utilisateur').get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Client introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_agent_access_client(request.user, client):
        return Response(
            {'success': False, 'error': {'message': 'Accès refusé : client hors de votre zone.'}},
            status=status.HTTP_403_FORBIDDEN,
        )

    user = client.id_utilisateur
    user.set_password(_DEFAULT_PASSWORD)
    user.save(update_fields=['password', 'updated_at'])
    revoke_all_sessions(user)

    from apps.authentication.services.email_service import send_temp_password_email
    send_temp_password_email(user, actor_name=request.user.full_name, default_password=_DEFAULT_PASSWORD)

    return Response({
        'success': True,
        'message': f'Mot de passe réinitialisé. E-mail envoyé à {user.email or "adresse inconnue"}.',
    })


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_communes_view(request):
    data = [{'code': code, 'label': label} for code, label in KINSHASA_COMMUNES]
    return Response({'success': True, 'data': data})


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_roles_view(request):
    roles = Role.objects.annotate(user_count=Count('utilisateurs')).order_by('nom_role')

    descriptions = {
        'Client': 'Accès crédits, épargne, scoring personnel',
        'Agent de crédit': 'Traitement opérationnel des dossiers de sa commune',
        'Responsable crédit': 'Validation dossiers sensibles et exceptions',
        'Analyste risque': 'Règles métier, seuils, modèles IA',
        'Administrateur': 'Gestion technique, agents et sécurité',
        'Auditeur': 'Contrôle interne et rapports',
    }

    data = [
        {
            'name': r.nom_role,
            'users': r.user_count,
            'desc': descriptions.get(r.nom_role, r.description or ''),
        }
        for r in roles
    ]
    return Response({'success': True, 'data': data})
