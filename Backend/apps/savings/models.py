from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimestampedModel
from apps.core.currency import DEVISE_CHOICES, symbole
from apps.clients.models import Client


class CompteEpargne(TimestampedModel):
    id_client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='comptes_epargne')
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES)
    solde = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    PERIODICITE_CHOICES = [('mensuel', 'Mensuel'), ('annuel', 'Annuel')]

    objectif_montant = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    objectif_description = models.CharField(max_length=255, blank=True)
    objectif_periodicite = models.CharField(
        max_length=10, choices=PERIODICITE_CHOICES, default='mensuel', blank=True
    )
    date_objectif = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compte_epargne'
        indexes = [models.Index(fields=['id_client', 'devise'])]

    def __str__(self):
        return f"Épargne #{self.pk} ({self.devise}) — {symbole(self.devise)}{self.solde}"

    @property
    def progression_pct(self):
        if not self.objectif_montant or self.objectif_montant == 0:
            return 0
        return min(round(float(self.solde) / float(self.objectif_montant) * 100, 1), 100)


class OperationEpargne(TimestampedModel):
    TYPES = [('depot', 'Dépôt'), ('retrait', 'Retrait')]

    MODES_PAIEMENT = [
        ('',             'Interne / virement'),
        ('illicocash',   'Illico Cash'),
        ('mpesa',        'Vodacom M-Pesa'),
        ('orange_money', 'Orange Money'),
        ('airtel_money', 'Airtel Money'),
        ('africell',     'Africell Money'),
    ]

    id_compte_epargne = models.ForeignKey(
        CompteEpargne, on_delete=models.CASCADE, related_name='operations'
    )
    type_operation = models.CharField(max_length=20, choices=TYPES)
    montant = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    solde_avant = models.DecimalField(max_digits=15, decimal_places=2)
    solde_apres = models.DecimalField(max_digits=15, decimal_places=2)
    mode_paiement = models.CharField(max_length=50, choices=MODES_PAIEMENT, default='', blank=True)
    numero_paiement = models.CharField(max_length=20, blank=True)
    reference_externe = models.CharField(max_length=100, blank=True)
    date_operation = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'operation_epargne'
        ordering = ['-date_operation']
