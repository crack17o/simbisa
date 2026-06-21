import logging

from django.conf import settings
from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.ussd.orchestrator import UssdOrchestrator
from apps.ussd.serializers import UssdCallbackSerializer
from apps.ussd.models import UssdInteractionLog
from apps.ussd.msisdn import normalize_msisdn

logger = logging.getLogger('apps.ussd')


def _check_simulator_secret(request) -> bool:
    if not getattr(settings, 'USSD_REQUIRE_SECRET', False):
        return True
    expected = getattr(settings, 'USSD_CALLBACK_SECRET', '')
    return request.headers.get('X-USSD-Secret', '') == expected


def _run_ussd(session_id, msisdn, user_input, channel: str) -> dict:
    orch = UssdOrchestrator(session_id=session_id or None, channel=channel)
    result = orch.process(msisdn, user_input)
    UssdInteractionLog.objects.create(
        session_id=result['session_id'],
        msisdn=normalize_msisdn(msisdn),
        user_input=user_input or '',
        response_type=result['response_type'],
        response_message=result['message'],
        channel=channel,
    )
    return result


def _handle_ussd_request(request) -> Response:
    """Logique commune callback telco + simulateur web."""
    if not _check_simulator_secret(request):
        return Response(
            {'success': False, 'error': {'message': 'Secret USSD invalide.'}},
            status=status.HTTP_403_FORBIDDEN,
        )

    ser = UssdCallbackSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data

    result = _run_ussd(
        session_id=data.get('session_id') or '',
        msisdn=data['msisdn'],
        user_input=data.get('input', ''),
        channel=f"callback:{data.get('operator', 'simulated')}",
    )

    logger.info(f"USSD callback {result['session_id']} -> {result['response_type']}")

    return Response({
        'success': True,
        'data': {
            'session_id': result['session_id'],
            'response_type': result['response_type'],
            'message': result['message'],
            'end_session': result['end_session'],
        },
    })


@extend_schema(tags=['USSD'])
@api_view(['POST'])
@permission_classes([AllowAny])
def ussd_callback_view(request):
    """
    Callback passerelle opérateur (simulé en dev).
    Corps: { session_id?, msisdn, input, service_code? }
    """
    return _handle_ussd_request(request)


@extend_schema(tags=['USSD'])
@api_view(['POST'])
@permission_classes([AllowAny])
def ussd_simulate_view(request):
    """Même logique que callback — alias pour le simulateur web."""
    return _handle_ussd_request(request)


@extend_schema(tags=['USSD'])
@api_view(['GET'])
@permission_classes([AllowAny])
def ussd_simulator_page(request):
    """Interface web de simulation *123# (DEBUG)."""
    if not getattr(settings, 'USSD_SIMULATOR_ENABLED', settings.DEBUG):
        return Response({'error': 'Simulateur desactive.'}, status=403)

    demo_phones = [
        '+243900000010',
        '+243900000011',
        '+243900000012',
    ]
    return render(request, 'ussd/simulator.html', {
        'demo_phones': demo_phones,
        'default_pin': getattr(settings, 'USSD_DEFAULT_PIN', '0000'),
        'api_url': '/api/v1/ussd/simulate/',
    })
