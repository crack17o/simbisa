from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import TimestampedModel
from apps.core.currency import DEVISE_CHOICES, symbole
from apps.clients.models import Client
from apps.authentication.models import Utilisateur


class DemandeCredit(TimestampedModel):
    STATUTS = [
        ('en_analyse', 'En analyse'),
        ('approuve', 'Approuvé'),
        ('rejete', 'Rejeté'),
        ('cloture', 'Clôturé'),
        ('annule', 'Annulé'),
    ]

    id_client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='demandes_credit')
    devise = models.CharField(max_length=3, choices=DEVISE_CHOICES, default='USD')
    montant_demande = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    duree_mois = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    motif = models.TextField(blank=True)
    motif_cloture = models.TextField(blank=True, default='')
    statut = models.CharField(max_length=30, choices=STATUTS, default='en_analyse')
    date_demande = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'demande_credit'
        indexes = [
            models.Index(fields=['id_client', 'statut']),
            models.Index(fields=['statut', 'date_demande']),
            models.Index(fields=['devise']),
        ]

    def __str__(self):
        return f"Demande #{self.pk} — {symbole(self.devise)}{self.montant_demande} — {self.statut}"


class Credit(TimestampedModel):
    STATUTS = [
        ('en_cours', 'En cours'),
        ('rembourse', 'Remboursé'),
        ('defaut', 'Défaut'),
        ('radie', 'Radié'),
    ]

    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.PROTECT, related_name='credit')
    montant_accorde = models.DecimalField(max_digits=15, decimal_places=2)
    taux_interet = models.DecimalField(
        max_digits=4, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='en_cours')

    class Meta:
        db_table = 'credit'

    @property
    def devise(self):
        return self.id_demande.devise

    def __str__(self):
        return f"Crédit #{self.pk} — {symbole(self.devise)}{self.montant_accorde}"

    @property
    def mensualite(self):
        M = float(self.montant_accorde)
        r = float(self.taux_interet) / 100
        n = self.id_demande.duree_mois
        if r == 0:
            return Decimal(str(round(M / n, 2)))
        mensualite = M * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
        return Decimal(str(round(mensualite, 2)))

    @property
    def solde_restant(self):
        total_paye = self.remboursements.aggregate(
            total=models.Sum('montant')
        )['total'] or Decimal('0')
        return max(self.montant_accorde - total_paye, Decimal('0'))


class Echeance(TimestampedModel):
    STATUTS = [
        ('non_paye', 'Non payé'),
        ('paye', 'Payé'),
        ('en_retard', 'En retard'),
        ('partiellement_paye', 'Partiellement payé'),
    ]

    id_credit = models.ForeignKey(Credit, on_delete=models.CASCADE, related_name='echeances')
    montant = models.DecimalField(max_digits=15, decimal_places=2)
    date_echeance = models.DateField(db_index=True)
    statut = models.CharField(max_length=30, choices=STATUTS, default='non_paye')
    montant_paye = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'echeance'
        ordering = ['date_echeance']


class Remboursement(TimestampedModel):
    MODES = [
        ('illicocash', 'illicocash'),
        ('virement', 'Virement bancaire'),
        ('agence', 'Agence Rawbank'),
        ('mobile_money', 'Mobile Money'),
    ]

    id_credit = models.ForeignKey(Credit, on_delete=models.PROTECT, related_name='remboursements')
    montant = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date_paiement = models.DateTimeField(auto_now_add=True)
    mode_paiement = models.CharField(max_length=50, choices=MODES, default='illicocash')
    reference_transaction = models.CharField(max_length=100, blank=True)
    echeance = models.ForeignKey(
        Echeance, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='remboursements'
    )

    class Meta:
        db_table = 'remboursement'


class CreditException(TimestampedModel):
    """Exception manuelle sur un dossier crédit (responsable crédit)."""
    STATUTS = [
        ('ouverte', 'Ouverte'),
        ('approuvee', 'Approuvée'),
        ('rejetee', 'Rejetée'),
        ('cloturee', 'Clôturée'),
    ]
    TYPES = [
        ('plafond', 'Dépassement plafond'),
        ('kyc', 'KYC exceptionnel'),
        ('delai', 'Délai de grâce'),
        ('autre', 'Autre'),
    ]

    id_demande = models.ForeignKey(
        DemandeCredit, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='exceptions',
    )
    id_client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='exceptions_credit')
    type_exception = models.CharField(max_length=30, choices=TYPES, default='autre')
    motif = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='ouverte')
    observation = models.TextField(blank=True)
    created_by = models.ForeignKey(
        Utilisateur, on_delete=models.SET_NULL, null=True, related_name='exceptions_creees',
    )
    resolved_by = models.ForeignKey(
        Utilisateur, null=True, blank=True, on_delete=models.SET_NULL, related_name='exceptions_resolues',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'credit_exception'
        ordering = ['-created_at']
