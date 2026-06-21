from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAdministrateur
from apps.core.exchange_rate import get_cdf_per_usd, set_cdf_per_usd
from apps.core.currency import get_credit_limits, USD, CDF


def _exchange_rate_payload():
    rate = get_cdf_per_usd()
    usd_limits = get_credit_limits(USD)
    cdf_limits = get_credit_limits(CDF)
    return {
        'cdf_per_usd': rate,
        'libelle': f'1 USD = {rate} CDF',
        'usd_credit_min': usd_limits['min'],
        'usd_credit_max': usd_limits['max'],
        'cdf_credit_min': cdf_limits['min'],
        'cdf_credit_max': cdf_limits['max'],
    }


@extend_schema(tags=['Configuration'])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exchange_rate_view(request):
    """Taux de change actuel (lecture pour tous les utilisateurs connectés)."""
    from apps.core.models import PlatformConfig
    config = PlatformConfig.load()
    data = _exchange_rate_payload()
    data['updated_at'] = config.updated_at
    if config.updated_by_id:
        data['updated_by'] = config.updated_by.full_name
    return Response({'success': True, 'data': data})


@extend_schema(tags=['Configuration'])
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAdministrateur])
def admin_exchange_rate_view(request):
    """
    Consulter ou modifier le taux CDF/USD (administrateur uniquement).
    Body PUT/PATCH : { "cdf_per_usd": 2250 }
    """
    if request.method == 'GET':
        from apps.core.models import PlatformConfig
        config = PlatformConfig.load()
        data = _exchange_rate_payload()
        data['updated_at'] = config.updated_at
        data['updated_by_id'] = config.updated_by_id
        if config.updated_by:
            data['updated_by'] = config.updated_by.full_name
        return Response({'success': True, 'data': data})

    cdf_per_usd = request.data.get('cdf_per_usd')
    if cdf_per_usd is None:
        return Response({
            'success': False,
            'error': {'code': 'validation_error', 'message': 'Le champ cdf_per_usd est requis.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        rate = int(cdf_per_usd)
    except (TypeError, ValueError):
        return Response({
            'success': False,
            'error': {'code': 'validation_error', 'message': 'cdf_per_usd doit être un entier positif.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    if rate < 1:
        return Response({
            'success': False,
            'error': {'code': 'validation_error', 'message': 'Le taux doit être supérieur à 0.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    set_cdf_per_usd(rate, user=request.user)
    return Response({
        'success': True,
        'message': f'Taux mis à jour : 1 USD = {rate} CDF.',
        'data': _exchange_rate_payload(),
    })


def _security_payload(config):
    return {
        'mfa_obligatoire_agents': config.mfa_obligatoire_agents,
        'maintenance_mode': config.maintenance_mode,
        'session_timeout_minutes': config.session_timeout_minutes,
        'max_tentatives_connexion': 5,
        'updated_at': config.updated_at,
    }


@extend_schema(tags=['Configuration'])
@api_view(['GET', 'PATCH'])
@permission_classes([IsAdministrateur])
def admin_security_settings_view(request):
    from apps.core.models import PlatformConfig
    config = PlatformConfig.load()

    if request.method == 'GET':
        return Response({'success': True, 'data': _security_payload(config)})

    updated_fields = []
    if 'mfa_obligatoire_agents' in request.data:
        config.mfa_obligatoire_agents = bool(request.data['mfa_obligatoire_agents'])
        updated_fields.append('mfa_obligatoire_agents')
    if 'maintenance_mode' in request.data:
        config.maintenance_mode = bool(request.data['maintenance_mode'])
        updated_fields.append('maintenance_mode')
    if 'session_timeout_minutes' in request.data:
        try:
            timeout = int(request.data['session_timeout_minutes'])
        except (TypeError, ValueError):
            return Response({
                'success': False,
                'error': {'message': 'session_timeout_minutes doit être un entier.'},
            }, status=status.HTTP_400_BAD_REQUEST)
        if timeout < 5 or timeout > 480:
            return Response({
                'success': False,
                'error': {'message': 'Timeout entre 5 et 480 minutes.'},
            }, status=status.HTTP_400_BAD_REQUEST)
        config.session_timeout_minutes = timeout
        updated_fields.append('session_timeout_minutes')

    if not updated_fields:
        return Response({
            'success': False,
            'error': {'message': 'Aucun champ à mettre à jour.'},
        }, status=status.HTTP_400_BAD_REQUEST)

    config.updated_by = request.user
    config.save()
    return Response({
        'success': True,
        'message': 'Paramètres de sécurité enregistrés.',
        'data': _security_payload(config),
    })
