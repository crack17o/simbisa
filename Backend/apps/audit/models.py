from django.db import models
from apps.authentication.models import Utilisateur


class AuditLog(models.Model):
    id_utilisateur = models.ForeignKey(
        Utilisateur, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs'
    )
    action = models.CharField(max_length=100, db_index=True)
    details = models.TextField(blank=True)
    adresse_ip = models.CharField(max_length=45, blank=True)
    date_action = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-date_action']
        indexes = [
            models.Index(fields=['id_utilisateur', 'date_action']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"[{self.date_action:%Y-%m-%d %H:%M}] {self.action} — {self.adresse_ip}"
