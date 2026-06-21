"""Devises supportées : comptes et montants en CDF et USD."""
from decimal import Decimal

USD = 'USD'
CDF = 'CDF'

DEVISE_CHOICES = [
    (USD, 'Dollar américain (USD)'),
    (CDF, 'Franc congolais (CDF)'),
]

DEVISES = (USD, CDF)


def symbole(devise: str) -> str:
    return '$' if devise == USD else 'FC'


def libelle_devise(devise: str) -> str:
    return dict(DEVISE_CHOICES).get(devise, devise)


def get_credit_limits(devise: str) -> dict:
    """
    Plages crédit : USD depuis PlatformConfig, CDF dérivé du taux admin.
    """
    from django.conf import settings
    from apps.core.exchange_rate import get_cdf_per_usd
    from apps.core.models import PlatformConfig

    config = PlatformConfig.load()
    usd_min = float(config.usd_credit_min)
    usd_max = float(config.usd_credit_max)
    if devise == USD:
        return {'min': usd_min, 'max': usd_max}
    if devise == CDF:
        rate = get_cdf_per_usd()
        return {
            'min': int(usd_min * rate),
            'max': int(usd_max * rate),
        }
    raise ValueError(f"Devise non supportée : {devise}")


def valider_montant_credit(montant, devise: str) -> None:
    """Lève ValueError si le montant est hors plage pour la devise."""
    limits = get_credit_limits(devise)
    m = Decimal(str(montant))
    if m < limits['min'] or m > limits['max']:
        raise ValueError(
            f"Montant {symbole(devise)}{m} hors plage "
            f"({symbole(devise)}{limits['min']} – {symbole(devise)}{limits['max']})."
        )


def devise_demande_encoded(devise: str) -> float:
    """Feature ML : 1.0 = USD, 0.0 = CDF."""
    return 1.0 if devise == USD else 0.0
