import logging
import numpy as np
from datetime import timedelta
from django.utils import timezone
from apps.core.currency import get_credit_limits
from apps.credits.models import DemandeCredit

logger = logging.getLogger('scoring')


class MobileMoneyEngine:
    """Analyse Mobile Money dans la devise ciblée (demande ou profil client)."""
    LOOKBACK_MONTHS = 6

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
        from apps.wallets.models import MobileMoneyTransaction, MobileMoneyAccount

        accounts = MobileMoneyAccount.objects.filter(
            id_client=self.client, is_active=True, devise=self.devise,
        )
        if not accounts.exists():
            return self._build_result(
                30.0, self._default_features(),
                f"Aucun compte Mobile Money {self.devise} lié.",
            )

        cutoff = timezone.now() - timedelta(days=30 * self.LOOKBACK_MONTHS)
        transactions = MobileMoneyTransaction.objects.filter(
            id_mm_account__in=accounts,
            devise=self.devise,
            date_transaction__gte=cutoff,
        ).values('type_transaction', 'montant', 'date_transaction', 'solde_apres')

        if not transactions.exists():
            return self._build_result(
                20.0, self._default_features(),
                f"Historique MM {self.devise} insuffisant.",
            )

        features = self._extract_features(list(transactions))
        score = self._compute_score(features)
        return self._build_result(
            score, features,
            f"Analyse Mobile Money ({self.devise}) réussie.",
        )

    def _extract_features(self, transactions: list) -> dict:
        revenus = [t for t in transactions if t['type_transaction'] in ('depot', 'reception')]
        depenses = [t for t in transactions if t['type_transaction'] in ('transfert_sortant', 'paiement_facture', 'retrait')]
        soldes = [float(t['solde_apres']) for t in transactions]

        revenus_montants = [float(t['montant']) for t in revenus]
        depenses_montants = [float(t['montant']) for t in depenses]

        flux_entrants_moyen = np.mean(revenus_montants) if revenus_montants else 0
        flux_sortants_moyen = np.mean(depenses_montants) if depenses_montants else 0

        if len(revenus_montants) >= 2:
            cv = np.std(revenus_montants) / np.mean(revenus_montants) if np.mean(revenus_montants) > 0 else 1
            regularite_revenus = max(0, min(100, (1 - cv) * 100))
        else:
            regularite_revenus = 20.0

        if len(depenses_montants) >= 2:
            cv_dep = np.std(depenses_montants) / np.mean(depenses_montants) if np.mean(depenses_montants) > 0 else 1
            volatilite_depenses = min(cv_dep * 100, 100)
        else:
            volatilite_depenses = 50.0

        return {
            'flux_entrants_moyen': round(flux_entrants_moyen, 2),
            'flux_sortants_moyen': round(flux_sortants_moyen, 2),
            'solde_moyen_mensuel': round(np.mean(soldes) if soldes else 0, 2),
            'solde_min': round(np.min(soldes) if soldes else 0, 2),
            'nb_transactions_total': len(transactions),
            'regularite_revenus_pct': round(regularite_revenus, 2),
            'volatilite_depenses_pct': round(volatilite_depenses, 2),
            'nb_mois_actifs': len({t['date_transaction'].strftime('%Y-%m') for t in transactions}),
            'devise': self.devise,
        }

    def _compute_score(self, features: dict) -> float:
        score = 0.0
        flux = features['flux_entrants_moyen']

        if self.devise == 'USD':
            seuils = [(500, 40), (300, 32), (150, 22), (50, 12), (0, 5)]
        else:
            cdf_limits = get_credit_limits('CDF')
            seuils = [
                (cdf_limits['max'] * 0.33, 40),
                (cdf_limits['max'] * 0.20, 32),
                (cdf_limits['max'] * 0.10, 22),
                (cdf_limits['min'], 12),
                (0, 5),
            ]

        for seuil, pts in seuils:
            if flux >= seuil:
                score += pts
                break

        reg = features['regularite_revenus_pct']
        score += reg * 0.30

        vol = features['volatilite_depenses_pct']
        score += max(0, (100 - vol) * 0.15)

        mois_actifs = features['nb_mois_actifs']
        score += min(mois_actifs / self.LOOKBACK_MONTHS, 1) * 15

        return round(min(score, 100.0), 2)

    def _default_features(self) -> dict:
        return {
            'flux_entrants_moyen': 0, 'flux_sortants_moyen': 0,
            'solde_moyen_mensuel': 0, 'solde_min': 0,
            'nb_transactions_total': 0, 'regularite_revenus_pct': 0,
            'volatilite_depenses_pct': 100, 'nb_mois_actifs': 0,
            'devise': self.devise,
        }

    def _build_result(self, score: float, features: dict, motif: str) -> dict:
        return {'score': score, 'features': features, 'motif': motif}
