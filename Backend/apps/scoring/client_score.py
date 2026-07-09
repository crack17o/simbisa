"""Score client agrégé : moyenne des scores globaux USD et CDF."""
import logging
from typing import Optional

from apps.core.currency import DEVISES
from apps.credits.models import DemandeCredit
from apps.scoring.engines.aggregator import ScoreAggregator
from apps.scoring.engines.behavioral_engine import BehavioralEngine
from apps.scoring.engines.mobile_money_engine import MobileMoneyEngine

logger = logging.getLogger('scoring')


def _score_from_demande(demande: DemandeCredit) -> Optional[float]:
    if hasattr(demande, 'decision') and demande.decision:
        return float(demande.decision.score_global)
    return None


def _score_profil_client(client, devise: str) -> float:
    """Score de profil (MM + comportemental + IA neutre) si aucune décision crédit."""
    mm = MobileMoneyEngine(client=client, devise=devise).run()
    behav = BehavioralEngine(client=client, devise=devise).run()

    aggregation = ScoreAggregator().aggregate(
        score_regles=100.0,
        score_mm=mm['score'],
        score_comportemental=behav['score'],
        score_ia=50.0,
        regles_ok=True,
    )
    return aggregation['score_global']


def score_pour_devise(client, devise: str) -> dict:
    """Score global pour une devise (dernière demande scorée ou profil)."""
    demande = (
        DemandeCredit.objects.filter(id_client=client, devise=devise)
        .select_related('decision', 'score_ia', 'score_regle', 'score_mobile_money', 'score_comportemental')
        .order_by('-date_demande')
        .first()
    )

    score_global = None
    source = 'profil'
    demande_id = None

    if demande:
        demande_id = demande.pk
        score_global = _score_from_demande(demande)
        if score_global is not None:
            source = 'demande'

    if score_global is None:
        try:
            score_global = _score_profil_client(client, devise)
            source = 'profil'
        except Exception as _e:
            logger.warning(f"Profil score échoué pour client #{client.pk} ({devise}): {_e}")
            score_global = 0.0
            source = 'aucun_historique'

    detail = {
        'devise': devise,
        'score_global': round(score_global, 2),
        'source': source,
        'demande_id': demande_id,
    }

    if demande and source == 'demande':
        if hasattr(demande, 'decision'):
            d = demande.decision
            detail['decision'] = d.decision
            detail['motif'] = d.motif
        if hasattr(demande, 'score_ia'):
            detail['niveau_risque'] = demande.score_ia.niveau_risque

    return detail


def score_client_agrege(client) -> dict:
    """
    Score affiché au client = moyenne arithmétique des scores USD et CDF.
    """
    par_devise = {devise: score_pour_devise(client, devise) for devise in DEVISES}
    scores = [par_devise[d]['score_global'] for d in DEVISES]
    score_moyen = round(sum(scores) / len(scores), 2)

    derniere_demande = (
        DemandeCredit.objects.filter(id_client=client)
        .select_related('decision', 'score_ia')
        .order_by('-date_demande')
        .first()
    )

    return {
        'score_client': score_moyen,
        'calcul': 'moyenne_usd_cdf',
        'scores_par_devise': par_devise,
        'score_usd': par_devise['USD']['score_global'],
        'score_cdf': par_devise['CDF']['score_global'],
        'derniere_demande_id': derniere_demande.pk if derniere_demande else None,
        'derniere_demande_devise': derniere_demande.devise if derniere_demande else None,
    }
