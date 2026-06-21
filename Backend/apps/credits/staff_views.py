import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import Serializer, CharField, ChoiceField
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAgentOrManager, IsManager
from apps.clients.services.territoire import filter_demandes_queryset, can_agent_access_client
from apps.scoring.models import DecisionCredit
from .models import DemandeCredit
from .serializers_staff import serialize_demande
from .services import apply_manual_decision, is_demande_sensible

logger = logging.getLogger('apps.credits')


def _demande_queryset(user=None):
    qs = DemandeCredit.objects.select_related(
        'id_client__id_utilisateur',
    ).prefetch_related('decision', 'score_ia', 'credit')
    if user and user.is_authenticated:
        qs = filter_demandes_queryset(qs, user)
    return qs


@extend_schema(tags=['Credits — Agent'])
@api_view(['GET'])
@permission_classes([IsAgentOrManager])
def list_demandes_view(request):
    qs = _demande_queryset(request.user).order_by('-date_demande')

    statut = request.query_params.get('statut')
    if statut:
        qs = qs.filter(statut=statut)
    devise = request.query_params.get('devise')
    if devise:
        qs = qs.filter(devise=devise.upper())

    data = [serialize_demande(d) for d in qs[:200]]
    return Response({'success': True, 'data': data, 'count': len(data)})


@extend_schema(tags=['Credits — Agent'])
@api_view(['GET'])
@permission_classes([IsAgentOrManager])
def demandes_stats_view(request):
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    base = filter_demandes_queryset(DemandeCredit.objects.all(), request.user)
    en_attente = base.filter(statut='en_analyse').count()
    approuves_mois = base.filter(statut='approuve', updated_at__gte=month_start).count()
    rejetes_mois = base.filter(statut='rejete', updated_at__gte=month_start).count()
    clients_actifs = base.values('id_client').distinct().count()

    return Response({
        'success': True,
        'data': {
            'dossiers_en_attente': en_attente,
            'approuves_ce_mois': approuves_mois,
            'rejetes_ce_mois': rejetes_mois,
            'clients_actifs': clients_actifs,
        },
    })


@extend_schema(tags=['Credits — Manager'])
@api_view(['GET'])
@permission_classes([IsManager])
def list_demandes_sensibles_view(request):
    demandes = [
        d for d in _demande_queryset(request.user).filter(statut='en_analyse').order_by('-date_demande')
        if is_demande_sensible(d)
    ]
    data = [serialize_demande(d, include_sensible_motif=True) for d in demandes[:100]]
    return Response({'success': True, 'data': data, 'count': len(data)})


class DecisionInputSerializer(Serializer):
    decision = ChoiceField(choices=['approuve', 'rejete', 'mise_en_attente'])
    motif = CharField(max_length=500, required=False, allow_blank=True, default='')
    observation = CharField(max_length=2000, required=False, allow_blank=True, default='')


@extend_schema(tags=['Credits — Agent'])
@api_view(['POST'])
@permission_classes([IsAgentOrManager])
def demande_decision_view(request, demande_pk):
    try:
        demande = _demande_queryset(request.user).get(pk=demande_pk)
    except DemandeCredit.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Demande introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not can_agent_access_client(request.user, demande.id_client):
        return Response(
            {'success': False, 'error': {'message': 'Ce dossier n\'est pas dans votre zone.'}},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = DecisionInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    motif = serializer.validated_data['motif'] or f"Décision manuelle : {serializer.validated_data['decision']}"

    try:
        result = apply_manual_decision(
            demande,
            request.user,
            serializer.validated_data['decision'],
            motif,
            serializer.validated_data['observation'],
        )
    except ValueError as e:
        return Response(
            {'success': False, 'error': {'code': 'invalid_decision', 'message': str(e)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.info(f"Décision manuelle demande #{demande_pk} par {request.user.telephone}")
    return Response({'success': True, 'message': 'Décision enregistrée.', 'data': result})
