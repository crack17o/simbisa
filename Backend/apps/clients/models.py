from django.db import models
from apps.core.models import TimestampedModel
from apps.core.kinshasa_communes import KINSHASA_COMMUNES
from apps.authentication.models import Utilisateur


class Client(TimestampedModel):
    NIVEAUX_RISQUE = [
        ('non_evalue', 'Non évalué'),
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('eleve', 'Élevé'),
    ]

    NIVEAUX_COMPTE = [
        ('standard', 'Standard'),
        ('pro', 'Pro'),
        ('pro_plus', 'Pro+'),
        ('premium', 'Premium'),
    ]

    # Plafonds crédit USD par niveau de compte
    PLAFONDS_PAR_NIVEAU = {
        'standard': {'max_usd': 300,   'max_mois': 6},
        'pro':      {'max_usd': 700,   'max_mois': 9},
        'pro_plus': {'max_usd': 1200,  'max_mois': 12},
        'premium':  {'max_usd': 2500,  'max_mois': 12},
    }

    id_utilisateur = models.OneToOneField(
        Utilisateur, on_delete=models.CASCADE,
        related_name='client_profile', db_column='id_utilisateur'
    )
    profession = models.CharField(max_length=150, blank=True)
    adresse = models.TextField(blank=True)
    commune_kinshasa = models.CharField(
        max_length=40, choices=KINSHASA_COMMUNES, blank=True, default='',
        db_index=True,
    )
    id_agent_assigne = models.ForeignKey(
        Utilisateur, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='clients_affectes',
    )
    date_naissance = models.DateField()
    revenu_estime_usd = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        verbose_name='Revenu estimé (USD)',
    )
    revenu_estime_cdf = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        verbose_name='Revenu estimé (CDF)',
    )
    niveau_risque = models.CharField(max_length=20, choices=NIVEAUX_RISQUE, default='non_evalue')
    niveau_compte = models.CharField(max_length=20, choices=NIVEAUX_COMPTE, default='standard', db_index=True)
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'client'
        verbose_name = 'Client'
        indexes = [
            models.Index(fields=['niveau_risque']),
            models.Index(fields=['date_inscription']),
            models.Index(fields=['commune_kinshasa']),
            models.Index(fields=['commune_kinshasa', 'id_agent_assigne']),
        ]

    def __str__(self):
        return f"Client #{self.pk} — {self.id_utilisateur.full_name}"

    @property
    def age(self):
        from django.utils import timezone
        today = timezone.now().date()
        dob = self.date_naissance
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @property
    def kyc_valid(self):
        return self.identites.filter(statut_verification='valide').exists()

    def revenu_pour_devise(self, devise: str):
        from apps.core.currency import CDF, USD
        if devise == CDF:
            return self.revenu_estime_cdf
        return self.revenu_estime_usd

    @property
    def plafond_credit_usd(self) -> int:
        return self.PLAFONDS_PAR_NIVEAU[self.niveau_compte]['max_usd']

    @property
    def plafond_duree_mois(self) -> int:
        return self.PLAFONDS_PAR_NIVEAU[self.niveau_compte]['max_mois']


class Identite(TimestampedModel):
    TYPES_PIECE = [
        ('carte_electeur', "Carte d'électeur"),
        ('passeport', 'Passeport'),
        ('permis_conduire', 'Permis de conduire'),
        ('carte_consulaire', 'Carte consulaire'),
    ]
    STATUTS_VERIFICATION = [
        ('en_attente', 'En attente'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    ]

    id_client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='identites')
    type_piece = models.CharField(max_length=50, choices=TYPES_PIECE)
    numero_piece = models.CharField(max_length=100, unique=True)
    date_expiration = models.DateField()
    statut_verification = models.CharField(max_length=30, choices=STATUTS_VERIFICATION, default='en_attente')
    date_verification = models.DateTimeField(null=True, blank=True)
    document_scan = models.FileField(upload_to='kyc/scans/%Y/%m/', null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    verified_by = models.ForeignKey(
        Utilisateur, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='kyc_verifications'
    )

    class Meta:
        db_table = 'identite'
        verbose_name = 'Identité'

    def __str__(self):
        return f"{self.type_piece} — {self.numero_piece}"

    def is_expired(self):
        from django.utils import timezone
        return self.date_expiration < timezone.now().date()
