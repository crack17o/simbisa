"""Décision manuelle agent / responsable sur une demande de crédit."""
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from apps.credits.models import DemandeCredit, Credit, Echeance
from apps.scoring.models import DecisionCredit

logger = logging.getLogger('credits')


def apply_manual_decision(demande: DemandeCredit, agent, decision: str, motif: str, observation: str = '') -> dict:
    """
    decision: approuve | rejete | mise_en_attente
    """
    if decision not in ('approuve', 'rejete', 'mise_en_attente'):
        raise ValueError('Décision invalide.')

    if demande.statut in ('cloture', 'annule'):
        raise ValueError('Cette demande est clôturée.')

    score_global = Decimal('0')
    if hasattr(demande, 'decision') and demande.decision:
        score_global = demande.decision.score_global

    statut_map = {
        'approuve': 'approuve',
        'rejete': 'rejete',
        'mise_en_attente': 'en_analyse',
    }

    with transaction.atomic():
        DecisionCredit.objects.update_or_create(
            id_demande=demande,
            defaults={
                'id_agent': agent,
                'decision': decision,
                'score_global': score_global,
                'motif': motif,
                'explication_ia': observation,
                'is_automatic': False,
            },
        )
        demande.statut = statut_map[decision]
        demande.save(update_fields=['statut', 'updated_at'])

        credit = None
        if decision == 'approuve' and not hasattr(demande, 'credit'):
            credit = _create_credit_from_demande(demande, float(score_global or 70))

    logger.info(f"Décision manuelle {decision} — demande #{demande.pk} par {agent.telephone}")

    return {
        'demande_id': demande.pk,
        'decision': decision,
        'statut': demande.statut,
        'motif': motif,
        'observation': observation,
        'credit_id': credit.pk if credit else getattr(getattr(demande, 'credit', None), 'pk', None),
        'is_automatic': False,
    }


def _create_credit_from_demande(demande: DemandeCredit, score_global: float) -> Credit:
    today = date.today()
    duree = demande.duree_mois

    if score_global >= 75:
        taux = Decimal('2.5')
    elif score_global >= 60:
        taux = Decimal('3.0')
    else:
        taux = Decimal('3.5')

    # Remise fidélité selon le niveau du compte (aligné avec scoring/services.py)
    _remises = {'pro': Decimal('0.25'), 'pro_plus': Decimal('0.5'), 'premium': Decimal('0.75')}
    niveau = demande.id_client.niveau_compte
    taux = max(Decimal('1.5'), taux - _remises.get(niveau, Decimal('0')))

    credit = Credit.objects.create(
        id_demande=demande,
        montant_accorde=demande.montant_demande,
        taux_interet=taux,
        date_debut=today,
        date_fin=today + timedelta(days=30 * duree),
    )

    mensualite = credit.mensualite
    for i in range(1, duree + 1):
        Echeance.objects.create(
            id_credit=credit,
            montant=mensualite,
            date_echeance=today + timedelta(days=30 * i),
        )
    return credit


def is_demande_sensible(demande: DemandeCredit) -> bool:
    """Dossier sensible : montant élevé ou risque IA élevé ou score faible."""
    from apps.core.currency import USD
    from django.conf import settings

    montant_usd = float(demande.montant_demande)
    if demande.devise != USD:
        from apps.core.exchange_rate import get_cdf_per_usd
        montant_usd = montant_usd / get_cdf_per_usd()

    if montant_usd >= 800:
        return True

    if hasattr(demande, 'score_ia') and demande.score_ia.niveau_risque == 'eleve':
        return True

    if hasattr(demande, 'decision') and demande.decision:
        # Aligné avec le barème : en dessous de 60 = validation humaine requise
        if float(demande.decision.score_global) < 60:
            return True

    return False
