import pyotp
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from apps.core.models import TimestampedModel
from apps.core.kinshasa_communes import KINSHASA_COMMUNES


class Role(models.Model):
    ROLES = [
        ('Client', 'Client'),
        ('Agent de crédit', 'Agent de crédit'),
        ('Responsable crédit', 'Responsable crédit'),
        ('Analyste risque', 'Analyste risque'),
        ('Administrateur', 'Administrateur'),
        ('Auditeur', 'Auditeur'),
    ]
    nom_role = models.CharField(max_length=50, unique=True, choices=ROLES)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'role'
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'

    def __str__(self):
        return self.nom_role


class UtilisateurManager(BaseUserManager):
    def create_user(self, telephone, password=None, **extra_fields):
        if not telephone:
            raise ValueError('Le numéro de téléphone est requis.')
        user = self.model(telephone=telephone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, telephone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        role, _ = Role.objects.get_or_create(nom_role='Administrateur')
        extra_fields.setdefault('role', role)
        return self.create_user(telephone, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    STATUTS = [
        ('actif', 'Actif'),
        ('bloque', 'Bloqué'),
        ('suspendu', 'Suspendu'),
    ]

    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=True, related_name='utilisateurs')
    nom = models.CharField(max_length=100)
    postnom = models.CharField(max_length=100, blank=True)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True, null=True, blank=True)
    telephone = models.CharField(max_length=20, unique=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default='actif')

    mfa_secret = models.CharField(max_length=64, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_verified = models.BooleanField(default=False)

    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_country = models.CharField(max_length=2, blank=True, default='')
    last_device_id = models.CharField(max_length=128, blank=True, default='')
    password_changed_at = models.DateTimeField(null=True, blank=True)

    commune_kinshasa = models.CharField(
        max_length=40,
        choices=KINSHASA_COMMUNES,
        blank=True,
        default='',
        help_text='Commune Kinshasa (agents de crédit)',
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UtilisateurManager()

    USERNAME_FIELD = 'telephone'
    REQUIRED_FIELDS = ['nom', 'prenom']

    class Meta:
        db_table = 'utilisateur'
        verbose_name = 'Utilisateur'
        indexes = [
            models.Index(fields=['telephone']),
            models.Index(fields=['statut']),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.telephone})"

    @property
    def full_name(self):
        return f"{self.prenom} {self.postnom} {self.nom}".strip()

    def is_locked(self):
        return bool(self.locked_until and timezone.now() < self.locked_until)

    def record_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            from datetime import timedelta
            self.locked_until = timezone.now() + timedelta(minutes=30)
            self.statut = 'bloque'
        self.save(update_fields=['failed_login_attempts', 'locked_until', 'statut'])

    def reset_failed_logins(self):
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'locked_until'])

    def generate_mfa_secret(self):
        self.mfa_secret = pyotp.random_base32()
        self.save(update_fields=['mfa_secret'])
        return self.mfa_secret

    def verify_mfa_token(self, token):
        if not self.mfa_secret:
            return False
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token, valid_window=1)
