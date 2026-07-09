from decimal import Decimal
from django.db import models
from apps.core.models import TimestampedModel
from apps.credits.models import DemandeCredit
from apps.authentication.models import Utilisateur


class ScoreRegle(TimestampedModel):
    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.CASCADE, related_name='score_regle')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    resultat = models.BooleanField(default=False)
    details = models.JSONField(default=dict)
    date_calcul = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_regle'


class ScoreMobileMoney(TimestampedModel):
    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.CASCADE, related_name='score_mobile_money')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    features_used = models.JSONField(default=dict)
    date_calcul = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_mobile_money'


class ScoreComportemental(TimestampedModel):
    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.CASCADE, related_name='score_comportemental')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    features_used = models.JSONField(default=dict)
    date_calcul = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_comportemental'


class ScoreIA(TimestampedModel):
    NIVEAUX_RISQUE = [
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('eleve', 'Élevé'),
    ]

    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.CASCADE, related_name='score_ia')
    probabilite_defaut = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0'))
    niveau_risque = models.CharField(max_length=20, choices=NIVEAUX_RISQUE, default='moyen')
    score_normalise = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    modele_utilise = models.CharField(max_length=100, default='XGBoost_v2')
    shap_values = models.JSONField(default=dict)
    lime_values = models.JSONField(default=dict)
    feature_vector = models.JSONField(default=dict)
    date_prediction = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_ia'


class DecisionCredit(TimestampedModel):
    DECISIONS = [
        ('approuve', 'Approuvé'),
        ('rejete', 'Rejeté'),
        ('mise_en_attente', 'Mise en attente'),
    ]
    RECOMMANDATIONS = [
        ('approuver', 'Approuver'),
        ('prudence', 'Prudence'),
        ('rejeter', 'Rejeter'),
    ]

    id_demande = models.OneToOneField(DemandeCredit, on_delete=models.CASCADE, related_name='decision')
    id_agent = models.ForeignKey(
        Utilisateur, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='decisions_prises'
    )
    decision = models.CharField(max_length=20, choices=DECISIONS)
    recommandation_ia = models.CharField(max_length=20, choices=RECOMMANDATIONS, blank=True, default='prudence')
    score_global = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    motif = models.TextField(blank=True)
    explication_ia = models.TextField(blank=True)
    is_automatic = models.BooleanField(default=True)
    date_decision = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'decision_credit'
        indexes = [models.Index(fields=['decision', 'date_decision'])]


class ScoringRule(models.Model):
    """Règle métier configurable (module risque)."""
    CATEGORIES = [
        ('kyc', 'KYC'),
        ('montant', 'Montant'),
        ('comportement', 'Comportement'),
        ('mobile_money', 'Mobile Money'),
        ('general', 'Général'),
    ]

    code = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=30, choices=CATEGORIES, default='general')
    is_active = models.BooleanField(default=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'scoring_rule'
        ordering = ['category', 'code']

    def __str__(self):
        return self.label


class ModelTrainingRun(TimestampedModel):
    """Historique des ré-entraînements du modèle IA."""
    STATUTS = [
        ('success', 'Succès'),
        ('skipped', 'Ignoré'),
        ('failed', 'Échec'),
    ]

    model_name = models.CharField(max_length=100, default='XGBoost')
    model_version = models.CharField(max_length=120, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUTS, default='success')
    n_samples = models.PositiveIntegerField(default=0)
    n_features = models.PositiveIntegerField(default=0)
    details = models.JSONField(default=dict)

    class Meta:
        db_table = 'model_training_run'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['model_name', 'status', 'created_at']),
        ]
