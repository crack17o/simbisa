from datetime import date
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.authentication.models import Utilisateur
from apps.core.currency import DEVISES
from .models import Client


@receiver(post_save, sender=Utilisateur)
def create_client_profile(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.role and instance.role.nom_role == 'Client':
        Client.objects.get_or_create(
            id_utilisateur=instance,
            defaults={'date_naissance': date(1995, 1, 1)},
        )


@receiver(post_save, sender=Client)
def create_client_wallets(sender, instance, created, **kwargs):
    """Crée un wallet Rawbank CDF et USD pour chaque nouveau client."""
    from apps.wallets.models import WalletRawbank
    for devise in DEVISES:
        WalletRawbank.objects.get_or_create(id_client=instance, devise=devise)
