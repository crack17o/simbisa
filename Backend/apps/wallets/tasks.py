"""
Tâches Celery pour simuler l'activité Mobile Money des clients.

La tâche `simulate_mm_activity` est déclenchée périodiquement (via
django-celery-beat) et génère des transactions réalistes pour chaque
compte MM actif. Cela alimente le scoring comportemental des clients.
"""
import random
import logging
from decimal import Decimal
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('apps.wallets')

# Paramètres de simulation
_TYPES_ENTRANTS = ['reception', 'depot']
_TYPES_SORTANTS = ['transfert_sortant', 'paiement_facture', 'retrait']

_MONTANTS_CDF = [15000, 25000, 30000, 50000, 75000, 100000, 150000, 200000]
_MONTANTS_USD = [10, 20, 30, 50, 75, 100, 150, 200]


def _generate_reference() -> str:
    """Génère une référence de transaction unique."""
    import uuid
    return f"SIM-{uuid.uuid4().hex[:12].upper()}"


@shared_task(name='wallets.simulate_mm_activity', bind=True, max_retries=2)
def simulate_mm_activity(self):
    """
    Simule 1 à 3 transactions Mobile Money par compte actif.
    Exécutée toutes les heures par django-celery-beat.
    """
    from apps.wallets.models import MobileMoneyAccount, MobileMoneyTransaction

    accounts = MobileMoneyAccount.objects.filter(is_active=True).select_related('id_client')
    total = 0

    for account in accounts:
        # 40 % de chance de générer une transaction pour ce compte à chaque tick
        if random.random() > 0.40:
            continue

        nb_txns = random.randint(1, 2)
        montants = _MONTANTS_USD if account.devise == 'USD' else _MONTANTS_CDF

        # Trouver le dernier solde connu
        last_txn = account.transactions.order_by('-date_transaction').first()
        solde_courant = last_txn.solde_apres if last_txn else Decimal('50000' if account.devise == 'CDF' else '50')

        for _ in range(nb_txns):
            # Alterner entrées/sorties (légèrement biaisé vers les entrées)
            if random.random() < 0.55:
                typ = random.choice(_TYPES_ENTRANTS)
                montant = Decimal(str(random.choice(montants)))
                solde_courant += montant
            else:
                typ = random.choice(_TYPES_SORTANTS)
                montant = Decimal(str(random.choice(montants)))
                # Ne pas descendre en dessous de 0
                if solde_courant - montant < 0:
                    montant = solde_courant * Decimal('0.5')
                if montant < Decimal('1'):
                    continue
                solde_courant = max(Decimal('0'), solde_courant - montant)

            # Horodatage dans la dernière heure avec un peu de variance
            dt = timezone.now() - timedelta(minutes=random.randint(0, 55))

            try:
                MobileMoneyTransaction.objects.create(
                    id_mm_account=account,
                    devise=account.devise,
                    type_transaction=typ,
                    montant=montant.quantize(Decimal('0.01')),
                    solde_apres=solde_courant.quantize(Decimal('0.01')),
                    date_transaction=dt,
                    reference_externe=_generate_reference(),
                    description=f'Transaction automatique {account.operateur}',
                )
                total += 1
            except Exception as exc:
                logger.warning(f"Erreur simulation MM account #{account.pk}: {exc}")

    logger.info(f"Simulation MM : {total} transaction(s) créée(s) pour {accounts.count()} comptes.")
    return {'transactions_created': total}
