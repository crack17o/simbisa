import logging
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import Serializer, CharField, ChoiceField, IntegerField
from drf_spectacular.utils import extend_schema

from apps.core.models import PlatformConfig
from apps.core.permissions import IsManager
from apps.core.currency import get_credit_limits, USD, CDF
from apps.core.exchange_rate import get_cdf_per_usd
from apps.scoring.models import DecisionCredit
from .models import CreditException, DemandeCredit
from .serializers_staff import serialize_demande

logger = logging.getLogger('apps.credits')


def _serialize_exception(exc: CreditException) -> dict:
    client = exc.id_client
    u = client.id_utilisateur
    return {
        'id': exc.pk,
        'ref': f'EX-{exc.pk:03d}',
        'demande_id': exc.id_demande_id,
        'client_id': client.pk,
        'client': u.full_name if u else f'Client #{client.pk}',
        'type_exception': exc.type_exception,
        'type_label': exc.get_type_exception_display(),
        'motif': exc.motif,
        'statut': exc.statut,
        'observation': exc.observation,
        'created_at': exc.created_at,
        'resolved_at': exc.resolved_at,
        'created_by': exc.created_by.full_name if exc.created_by else None,
        'resolved_by': exc.resolved_by.full_name if exc.resolved_by else None,
    }


class ExceptionCreateSerializer(Serializer):
    id_client = IntegerField()
    id_demande = IntegerField(required=False, allow_null=True)
    type_exception = ChoiceField(
        choices=['plafond', 'kyc', 'delai', 'autre'],
        default='autre',
    )
    motif = CharField(max_length=1000)


class ExceptionResolveSerializer(Serializer):
    statut = ChoiceField(choices=['approuvee', 'rejetee', 'cloturee'])
    observation = CharField(max_length=2000, required=False, allow_blank=True, default='')


@extend_schema(tags=['Manager'])
@api_view(['GET', 'POST'])
@permission_classes([IsManager])
def exceptions_view(request):
    if request.method == 'GET':
        statut = request.query_params.get('statut')
        qs = CreditException.objects.select_related(
            'id_client__id_utilisateur', 'id_demande', 'created_by', 'resolved_by',
        ).order_by('-created_at')
        if statut:
            qs = qs.filter(statut=statut)
        data = [_serialize_exception(e) for e in qs[:100]]
        return Response({'success': True, 'data': data, 'count': len(data)})

    serializer = ExceptionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    from apps.clients.models import Client
    try:
        client = Client.objects.get(pk=data['id_client'])
    except Client.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Client introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    demande = None
    if data.get('id_demande'):
        try:
            demande = DemandeCredit.objects.get(pk=data['id_demande'])
        except DemandeCredit.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Demande introuvable.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

    exc = CreditException.objects.create(
        id_client=client,
        id_demande=demande,
        type_exception=data['type_exception'],
        motif=data['motif'],
        created_by=request.user,
    )
    return Response(
        {'success': True, 'message': 'Exception créée.', 'data': _serialize_exception(exc)},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(tags=['Manager'])
@api_view(['GET', 'PATCH'])
@permission_classes([IsManager])
def exception_detail_view(request, pk):
    try:
        exc = CreditException.objects.select_related(
            'id_client__id_utilisateur', 'id_demande', 'created_by', 'resolved_by',
        ).get(pk=pk)
    except CreditException.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Exception introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        return Response({'success': True, 'data': _serialize_exception(exc)})

    serializer = ExceptionResolveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    exc.statut = serializer.validated_data['statut']
    exc.observation = serializer.validated_data['observation']
    exc.resolved_by = request.user
    exc.resolved_at = timezone.now()
    exc.save()

    return Response({
        'success': True,
        'message': 'Exception mise à jour.',
        'data': _serialize_exception(exc),
    })


def _plafonds_payload(config: PlatformConfig) -> dict:
    usd = get_credit_limits(USD)
    cdf = get_credit_limits(CDF)
    rate = get_cdf_per_usd()
    return {
        'usd_credit_min': float(config.usd_credit_min),
        'usd_credit_max': float(config.usd_credit_max),
        'usd_agent_auto_max': float(config.usd_agent_auto_max),
        'usd_manager_max': float(config.usd_manager_max),
        'cdf_credit_min': cdf['min'],
        'cdf_credit_max': cdf['max'],
        'cdf_per_usd': rate,
        'updated_at': config.updated_at,
    }


@extend_schema(tags=['Manager'])
@api_view(['GET', 'PATCH'])
@permission_classes([IsManager])
def plafonds_view(request):
    config = PlatformConfig.load()

    if request.method == 'GET':
        return Response({'success': True, 'data': _plafonds_payload(config)})

    fields = ['usd_credit_min', 'usd_credit_max', 'usd_agent_auto_max', 'usd_manager_max']
    updated = []
    for field in fields:
        value = request.data.get(field)
        if value is None:
            continue
        try:
            dec = Decimal(str(value))
        except Exception:
            return Response(
                {'success': False, 'error': {'message': f'{field} invalide.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if dec < Decimal('1'):
            return Response(
                {'success': False, 'error': {'message': f'{field} doit être ≥ 1.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        setattr(config, field, dec)
        updated.append(field)

    if not updated:
        return Response(
            {'success': False, 'error': {'message': 'Aucun champ à mettre à jour.'}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if config.usd_credit_min > config.usd_credit_max:
        return Response(
            {'success': False, 'error': {'message': 'Le minimum ne peut pas dépasser le maximum.'}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    config.updated_by = request.user
    config.save()
    logger.info(f"Plafonds mis à jour par {request.user.telephone}: {updated}")

    return Response({
        'success': True,
        'message': 'Plafonds enregistrés.',
        'data': _plafonds_payload(config),
    })


@extend_schema(tags=['Manager'])
@api_view(['GET'])
@permission_classes([IsManager])
def manager_dashboard_view(request):
    from apps.credits.services import is_demande_sensible
    from .models import DemandeCredit

    sensibles = [
        d for d in DemandeCredit.objects.filter(statut='en_analyse').select_related(
            'id_client__id_utilisateur',
        ).prefetch_related('decision', 'score_ia')[:200]
        if is_demande_sensible(d)
    ]
    exceptions_actives = CreditException.objects.filter(statut='ouverte').count()
    config = PlatformConfig.load()
    plafond_moyen = float(config.usd_manager_max)

    return Response({
        'success': True,
        'data': {
            'dossiers_sensibles': len(sensibles),
            'exceptions_actives': exceptions_actives,
            'decisions_supervisees_mois': DecisionCredit.objects.filter(
                is_automatic=False,
                date_decision__month=timezone.now().month,
            ).count(),
            'plafond_moyen_usd': plafond_moyen,
            'dossiers': [serialize_demande(d, include_sensible_motif=True) for d in sensibles[:20]],
        },
    })
