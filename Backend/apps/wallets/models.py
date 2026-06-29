from decimal import Decimal
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimestampedModel
from apps.core.currency import DEVISE_CHOICES, symbole
from apps.clients.models import Client


class WalletRawbank(TimestampedModel):
    STATUTS = [('actif', 'Actif'), ('gele', 'Gelé'), ('inactif', 'Inactif')]

    id_client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='wallets')
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES)
    numero_wallet = models.CharField(max_length=30, unique=True)
    solde = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    statut = models.CharField(max_length=20, choices=STATUTS, default='actif')
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wallet_rawbank'
        unique_together = [['id_client', 'devise']]
        indexes = [models.Index(fields=['id_client', 'devise'])]

    def __str__(self):
        return f"Wallet {self.numero_wallet} — {symbole(self.devise)}{self.solde}"

    def save(self, *args, **kwargs):
        if not self.numero_wallet:
            suffix = self.devise[:1]
            self.numero_wallet = f"RW{suffix}{str(uuid.uuid4().int)[:11]}"
        super().save(*args, **kwargs)


class MobileMoneyAccount(TimestampedModel):
    OPERATEURS = [
        ('mpesa', 'Vodacom M-Pesa'),
        ('orange_money', 'Orange Money'),
        ('airtel_money', 'Airtel Money'),
        ('africell', 'Africell Money'),
    ]

    id_client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='mm_accounts')
    operateur = models.CharField(max_length=50, choices=OPERATEURS)
    numero_telephone = models.CharField(max_length=20)
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES, default='CDF')
    date_liaison = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'mobile_money_account'
        unique_together = [['id_client', 'operateur', 'numero_telephone', 'devise']]

    def __str__(self):
        return f"{self.operateur} — {self.numero_telephone} ({self.devise})"


MODES_PAIEMENT = [
    ('illicocash',   'Illico Cash'),
    ('mpesa',        'Vodacom M-Pesa'),
    ('orange_money', 'Orange Money'),
    ('airtel_money', 'Airtel Money'),
    ('africell',     'Africell Money'),
]


class WalletTransaction(TimestampedModel):
    """Journal des dépôts et retraits sur un wallet Rawbank."""
    TYPES = [('depot', 'Dépôt'), ('retrait', 'Retrait')]

    wallet = models.ForeignKey(
        WalletRawbank, on_delete=models.CASCADE, related_name='transactions'
    )
    type_transaction = models.CharField(max_length=20, choices=TYPES)
    montant = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    solde_avant = models.DecimalField(max_digits=15, decimal_places=2)
    solde_apres = models.DecimalField(max_digits=15, decimal_places=2)
    mode_paiement = models.CharField(max_length=50, choices=MODES_PAIEMENT)
    numero_paiement = models.CharField(max_length=20, blank=True)
    reference_externe = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'wallet_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', 'created_at']),
            models.Index(fields=['type_transaction']),
        ]

    def __str__(self):
        return f"{self.type_transaction} {symbole(self.wallet.devise)}{self.montant}"


class MobileMoneyTransaction(TimestampedModel):
    TYPES = [
        ('depot', 'Dépôt'),
        ('transfert_sortant', 'Transfert sortant'),
        ('reception', 'Réception'),
        ('paiement_facture', 'Paiement facture'),
        ('retrait', 'Retrait'),
    ]

    id_mm_account = models.ForeignKey(
        MobileMoneyAccount, on_delete=models.CASCADE, related_name='transactions'
    )
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES)
    type_transaction = models.CharField(max_length=30, choices=TYPES)
    montant = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    solde_apres = models.DecimalField(max_digits=15, decimal_places=2)
    date_transaction = models.DateTimeField()
    reference_externe = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'mobile_money_transaction'
        indexes = [
            models.Index(fields=['id_mm_account', 'date_transaction']),
            models.Index(fields=['type_transaction']),
            models.Index(fields=['devise']),
        ]

    def __str__(self):
        return f"{self.type_transaction} {symbole(self.devise)}{self.montant}"
