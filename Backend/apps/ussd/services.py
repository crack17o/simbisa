"""Façade métier USSD — réutilise la logique existante."""
from decimal import Decimal, InvalidOperation

from django.db import transaction

from apps.authentication.models import Utilisateur
from apps.clients.models import Client
from apps.core.currency import symbole, get_credit_limits, valider_montant_credit, USD, CDF
from apps.core.exchange_rate import get_cdf_per_usd
from apps.credits.models import DemandeCredit, Credit
from apps.scoring.client_score import score_client_agrege
from apps.wallets.models import WalletRawbank
from apps.wallets.views import ensure_client_wallets
from apps.savings.models import CompteEpargne


class UssdBusinessError(Exception):
    def __init__(self, message: str, code: str = 'ussd_error'):
        self.message = message
        self.code = code
        super().__init__(message)


def get_client_by_msisdn(msisdn: str) -> Client | None:
    try:
        user = Utilisateur.objects.select_related('role', 'client_profile').get(telephone=msisdn)
    except Utilisateur.DoesNotExist:
        return None
    if not user.role or user.role.nom_role != 'Client':
        return None
    if user.statut != 'actif':
        raise UssdBusinessError('Compte non actif. Contactez Rawbank.')
    if not hasattr(user, 'client_profile'):
        return None
    return user.client_profile


def get_wallet_balance(client: Client, devise: str) -> str:
    ensure_client_wallets(client)
    wallet = WalletRawbank.objects.get(id_client=client, devise=devise)
    sym = symbole(devise)
    return f'{sym}{wallet.solde}'


def list_savings_summary(client: Client) -> list[dict]:
    comptes = CompteEpargne.objects.filter(id_client=client, is_active=True).order_by('devise')
    return [
        {
            'id': c.pk,
            'devise': c.devise,
            'symbole': symbole(c.devise),
            'solde': str(c.solde),
            'progression': c.progression_pct,
        }
        for c in comptes
    ]


def format_exchange_rate() -> str:
    rate = get_cdf_per_usd()
    limits_cdf = get_credit_limits(CDF)
    sym = symbole(CDF)
    return (
        f'Taux Rawbank:\n1 USD = {rate} CDF\n'
        f'Credit max: {sym}{limits_cdf["max"]}'
    )


def format_client_score(client: Client) -> str:
    data = score_client_agrege(client)
    return (
        f'Votre score: {data["score_client"]}/100\n'
        f'USD: {data["score_usd"]} | CDF: {data["score_cdf"]}'
    )


def submit_credit_request(client: Client, devise: str, montant: str, duree_mois: int) -> dict:
    if not client.kyc_valid:
        raise UssdBusinessError('KYC non valide. Rendez-vous en agence.')

    if Credit.objects.filter(
        id_demande__id_client=client,
        id_demande__devise=devise,
        statut='en_cours',
    ).exists():
        raise UssdBusinessError(f'Credit {devise} deja en cours.')

    try:
        montant_dec = Decimal(str(montant).replace(',', '.'))
        duree = int(duree_mois)
    except (InvalidOperation, ValueError):
        raise UssdBusinessError('Montant ou duree invalide.')

    if duree < 1 or duree > 12:
        raise UssdBusinessError('Duree: 1 a 12 mois.')

    try:
        valider_montant_credit(montant_dec, devise)
    except ValueError as e:
        raise UssdBusinessError(str(e))

    with transaction.atomic():
        demande = DemandeCredit.objects.create(
            id_client=client,
            devise=devise,
            montant_demande=montant_dec,
            duree_mois=duree,
            motif='Demande via USSD',
            statut='en_analyse',
        )

    try:
        from apps.credits.tasks import process_credit_scoring
        process_credit_scoring.delay(demande.pk)
        async_msg = 'Analyse en cours. Consultez votre score plus tard (opt.4).'
    except Exception:
        from apps.scoring.services import ScoringOrchestrator
        ScoringOrchestrator(demande).run()
        async_msg = 'Demande analysee. Opt.4 pour le score.'

    sym = symbole(devise)
    return {
        'demande_id': demande.pk,
        'message': (
            f'Demande #{demande.pk} enregistree.\n'
            f'{sym}{montant_dec} / {duree} mois.\n{async_msg}'
        ),
    }
