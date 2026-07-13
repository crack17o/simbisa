from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
from apps.clients.models import Client


class UssdProfile(models.Model):
    """Profil USSD lié au client — PIN distinct du mot de passe app."""
    client = models.OneToOneField(
        Client, on_delete=models.CASCADE, related_name='ussd_profile',
    )
    pin_hash = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)
    failed_pin_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ussd_profile'

    def set_pin(self, raw_pin: str):
        self.pin_hash = make_password(str(raw_pin))
        self.failed_pin_attempts = 0
        self.locked_until = None
        self.save(update_fields=['pin_hash', 'failed_pin_attempts', 'locked_until'])

    def check_pin(self, raw_pin: str) -> bool:
        if not self.pin_hash:
            return False
        return check_password(str(raw_pin), self.pin_hash)

    def is_locked(self) -> bool:
        return bool(self.locked_until and timezone.now() < self.locked_until)

    def record_failed_pin(self):
        from datetime import timedelta
        self.failed_pin_attempts += 1
        if self.failed_pin_attempts >= 3:
            self.locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=['failed_pin_attempts', 'locked_until'])

    def reset_pin_attempts(self):
        self.failed_pin_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_pin_attempts', 'locked_until'])


class UssdInteractionLog(models.Model):
    """Journal des interactions (simulateur / callback)."""
    session_id = models.CharField(max_length=64, db_index=True)
    msisdn = models.CharField(max_length=20, db_index=True)
    user_input = models.CharField(max_length=32, blank=True)
    response_type = models.CharField(max_length=3)
    response_message = models.TextField()
    menu_state = models.CharField(max_length=40, blank=True)
    channel = models.CharField(max_length=100, default='simulator')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ussd_interaction_log'
        ordering = ['-created_at']
