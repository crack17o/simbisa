import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsClient, IsAgent
from .services import ScoringOrchestrator
from .client_score import score_client_agrege

logger = logging.getLogger('scoring')


class ScoringRateThrottle(ScopedRateThrottle):
    scope = 'scoring'


def build_score_response(demande) -> dict:
    response = {
        'demande_id': demande.pk,
        'devise': demande.devise,
        'montant_demande': str(demande.montant_demande),
        'statut': demande.statut,
    }

    for attr, label in [
        ('score_regle', 'score_regles'),
        ('score_mobile_money', 'score_mobile_money'),
        ('score_comportemental', 'score_comportemental'),
    ]:
        obj = getattr(demande, attr, None)
        if obj:
            response[label] = {'score': str(obj.score), 'date_calcul': obj.date_calcul}

    if hasattr(demande, 'score_ia'):
        ia = demande.score_ia
        response['score_ia'] = {
            'probabilite_defaut': str(ia.probabilite_defaut),
            'niveau_risque': ia.niveau_risque,
            'score_normalise': str(ia.score_normalise),
            'shap_values': ia.shap_values,
            'lime_values': ia.lime_values,
            'modele_utilise': ia.modele_utilise,
        }

    if hasattr(demande, 'decision'):
        d = demande.decision
        response['decision'] = {
            'decision': d.decision,
            'score_global': str(d.score_global),
            'motif': d.motif,
            'explication_ia': d.explication_ia,
            'is_automatic': d.is_automatic,
            'date_decision': d.date_decision,
        }

    return response


@extend_schema(tags=['Scoring'])
@api_view(['POST'])
@permission_classes([IsAgent])
@throttle_classes([ScoringRateThrottle])
def trigger_scoring_view(request, demande_pk):
    from apps.credits.models import DemandeCredit
    try:
        demande = DemandeCredit.objects.select_related('id_client').get(pk=demande_pk)
    except DemandeCredit.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Demande introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    result = ScoringOrchestrator(demande).run()
    return Response({'success': True, 'data': result})


@extend_schema(tags=['Scoring'])
@api_view(['GET'])
@permission_classes([IsClient])
def my_score_view(request):
    from apps.credits.models import DemandeCredit
    client = request.user.client_profile

    agrege = score_client_agrege(client)

    derniere_demande = None
    if agrege.get('derniere_demande_id'):
        derniere_demande = DemandeCredit.objects.filter(pk=agrege['derniere_demande_id']).first()

    data = {
        **agrege,
        'detail_derniere_demande': build_score_response(derniere_demande) if derniere_demande else None,
    }

    return Response({'success': True, 'data': data})


@extend_schema(tags=['Scoring'])
@api_view(['GET'])
@permission_classes([IsAgent])
def scoring_detail_view(request, demande_pk):
    from apps.credits.models import DemandeCredit
    try:
        demande = DemandeCredit.objects.get(pk=demande_pk)
    except DemandeCredit.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Demande introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    return Response({'success': True, 'data': build_score_response(demande)})
