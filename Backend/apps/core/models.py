import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class TimestampedModel(models.Model):
    """Modèle abstrait de base avec horodatage automatique."""
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class UUIDTimestampedModel(TimestampedModel):
    """Modèle abstrait avec UUID comme clé primaire."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class PlatformConfig(models.Model):
    """
    Configuration globale Simbisa (singleton pk=1).
    Taux de change : nombre de CDF pour 1 USD (ex. 2250).
    """
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    cdf_per_usd = models.PositiveIntegerField(
        default=2250,
        validators=[MinValueValidator(1)],
        verbose_name='CDF pour 1 USD',
        help_text='Nombre de francs congolais équivalant à un dollar américain.',
    )
    usd_credit_min = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('1'))],
    )
    usd_credit_max = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('1500.00'),
        validators=[MinValueValidator(Decimal('1'))],
    )
    usd_agent_auto_max = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('400.00'),
        validators=[MinValueValidator(Decimal('1'))],
        verbose_name='Plafond auto-approbation agent (USD)',
    )
    usd_manager_max = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('1200.00'),
        validators=[MinValueValidator(Decimal('1'))],
        verbose_name='Plafond validation responsable (USD)',
    )
    mfa_obligatoire_agents = models.BooleanField(default=False)
    maintenance_mode = models.BooleanField(default=False)
    session_timeout_minutes = models.PositiveSmallIntegerField(default=30)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'authentication.Utilisateur',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='platform_config_updates',
    )

    class Meta:
        db_table = 'platform_config'
        verbose_name = 'Configuration plateforme'
        verbose_name_plural = 'Configuration plateforme'

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"1 USD = {self.cdf_per_usd} CDF"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'cdf_per_usd': 2250})
        return obj
