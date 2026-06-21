import logging
from apps.credits.models import DemandeCredit, Credit

logger = logging.getLogger('scoring')


class BehavioralEngine:
    """Score comportemental filtré par la devise (demande ou profil client)."""

    def __init__(self, demande: DemandeCredit = None, *, client=None, devise: str = None):
        if demande is not None:
            self.demande = demande
            self.client = demande.id_client
            self.devise = demande.devise
        else:
            self.demande = None
            self.client = client
            self.devise = devise

    def run(self) -> dict:
        features = {'devise': self.devise}
        score = 0.0

        epargne_score, epargne_features = self._score_epargne()
        score += epargne_score
        features.update(epargne_features)

        remb_score, remb_features = self._score_remboursement()
        score += remb_score
        features.update(remb_features)

        activite_score, activite_features = self._score_activite()
        score += activite_score
        features.update(activite_features)

        return {
            'score': round(min(score, 100.0), 2),
            'features': features,
        }

    def _score_epargne(self) -> tuple:
        from apps.savings.models import CompteEpargne
        comptes = CompteEpargne.objects.filter(
            id_client=self.client, is_active=True, devise=self.devise,
        )

        if not comptes.exists():
            return 10.0, {'nb_comptes_epargne': 0, 'progression_objectif_moy': 0}

        progressions = [c.progression_pct for c in comptes]
        progression_moy = sum(progressions) / len(progressions)
        nb_objectifs_atteints = sum(1 for c in comptes if c.progression_pct >= 80)

        score = (progression_moy / 100) * 30 + (nb_objectifs_atteints / max(len(comptes), 1)) * 10

        return score, {
            'nb_comptes_epargne': len(progressions),
            'progression_objectif_moy': round(progression_moy, 1),
            'nb_objectifs_atteints_80pct': nb_objectifs_atteints,
        }

    def _score_remboursement(self) -> tuple:
        credits_passes = Credit.objects.filter(
            id_demande__id_client=self.client,
            id_demande__devise=self.devise,
            statut__in=['rembourse', 'defaut'],
        )

        if not credits_passes.exists():
            return 20.0, {'nb_credits_passes': 0, 'taux_remboursement_pct': 50}

        total = credits_passes.count()
        rembourses = credits_passes.filter(statut='rembourse').count()
        taux = rembourses / total if total > 0 else 0
        defauts = total - rembourses
        penalite = defauts * 15
        score = taux * 40 - penalite

        return max(score, 0), {
            'nb_credits_passes': total,
            'nb_credits_rembourses': rembourses,
            'nb_defauts': defauts,
            'taux_remboursement_pct': round(taux * 100, 1),
        }

    def _score_activite(self) -> tuple:
        from django.utils import timezone
        anciennete = (timezone.now() - self.client.date_inscription).days
        anciennete_score = min(anciennete / 365, 1) * 20
        return anciennete_score, {'anciennete_jours': anciennete}
