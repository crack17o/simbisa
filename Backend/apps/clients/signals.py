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
        defaults = {'date_naissance': date(1995, 1, 1)}
        dn = getattr(instance, '_registration_date_naissance', None)
        if dn:
            defaults['date_naissance'] = dn
        adresse = getattr(instance, '_registration_adresse', '')
        if adresse:
            defaults['adresse'] = adresse
        profession = getattr(instance, '_registration_profession', '')
        if profession:
            defaults['profession'] = profession
        Client.objects.get_or_create(id_utilisateur=instance, defaults=defaults)


@receiver(post_save, sender=Client)
def create_client_wallets(sender, instance, created, **kwargs):
    """Crée wallets Rawbank CDF/USD et compte Mobile Money pour chaque nouveau client."""
    if not created:
        return
    from apps.wallets.models import WalletRawbank, MobileMoneyAccount
    from apps.ussd.msisdn import detect_operateur

    for devise in DEVISES:
        WalletRawbank.objects.get_or_create(id_client=instance, devise=devise)

    telephone = getattr(instance.id_utilisateur, 'telephone', None)
    if telephone:
        operateur = detect_operateur(telephone)
        MobileMoneyAccount.objects.get_or_create(
            id_client=instance,
            defaults={
                'operateur': operateur or 'mpesa',
                'numero_telephone': telephone,
                'devise': 'CDF',
                'is_active': True,
            },
        )
