import logging
from django.conf import settings
from apps.core.currency import symbole, get_credit_limits
from apps.credits.models import Credit, DemandeCredit

logger = logging.getLogger('scoring')


class RulesEngine:
    """Moteur de règles métier déterministes Rawbank."""
    SCORE_MAX = 100.0

    def __init__(self, demande: DemandeCredit):
        self.demande = demande
        self.client = demande.id_client
        self.devise = demande.devise
        self.checks = {}

    def run(self) -> dict:
        score = self.SCORE_MAX
        sym = symbole(self.devise)

        kyc_valid = self.client.kyc_valid
        self.checks['kyc_valide'] = kyc_valid
        if not kyc_valid:
            return self._build_result(0.0, False, "KYC non validé : pièce d'identité requise.")

        age = self.client.age
        age_valid = settings.MIN_AGE <= age <= settings.MAX_AGE
        self.checks['age_valide'] = {'valide': age_valid, 'age': age}
        if not age_valid:
            return self._build_result(
                0.0, False,
                f"Âge {age} hors plage ({settings.MIN_AGE}-{settings.MAX_AGE} ans)."
            )

        credit_defaut = Credit.objects.filter(
            id_demande__id_client=self.client,
            id_demande__devise=self.devise,
            statut='defaut',
        ).exists()
        self.checks['pas_de_defaut_actif'] = not credit_defaut
        if credit_defaut:
            return self._build_result(0.0, False, f"Crédit en défaut actif ({self.devise}).")

        credit_actif = Credit.objects.filter(
            id_demande__id_client=self.client,
            id_demande__devise=self.devise,
            statut='en_cours',
        ).exclude(id_demande=self.demande).exists()
        self.checks['pas_de_credit_actif'] = not credit_actif
        if credit_actif:
            return self._build_result(
                0.0, False,
                f"Un crédit {self.devise} est déjà en cours pour ce client.",
            )

        limits = get_credit_limits(self.devise)
        montant = float(self.demande.montant_demande)
        montant_valid = float(limits['min']) <= montant <= float(limits['max'])
        self.checks['montant_valide'] = {
            'valide': montant_valid,
            'montant': montant,
            'devise': self.devise,
            'min': float(limits['min']),
            'max': float(limits['max']),
        }
        if not montant_valid:
            return self._build_result(
                0.0, False,
                f"Montant {sym}{montant} hors plage "
                f"({sym}{limits['min']}–{sym}{limits['max']}) en {self.devise}.",
            )

        from django.utils import timezone
        anciennete_jours = (timezone.now().date() - self.client.date_inscription.date()).days
        anciennete_ok = anciennete_jours >= 30
        self.checks['anciennete_plateforme'] = {'valide': anciennete_ok, 'jours': anciennete_jours}
        if not anciennete_ok:
            score -= 20

        self.checks['devise_demande'] = self.devise
        logger.debug(f"Rules engine — demande #{self.demande.pk} [{self.devise}]: score={score}")
        return self._build_result(score, True, "Toutes les règles d'éligibilité sont respectées.")

    def _build_result(self, score: float, resultat: bool, motif: str) -> dict:
        return {
            'score': round(score, 2),
            'resultat': resultat,
            'motif': motif,
            'details': self.checks,
        }
