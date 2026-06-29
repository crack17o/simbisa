"""
Garantit qu'un agent de crédit actif couvre chaque commune de Kinshasa (24 communes).
Idempotent — ignore les communes déjà couvertes par un agent existant.

Usage:
    python manage.py seed_agents_communes
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authentication.models import Role, Utilisateur
from apps.core.kinshasa_communes import KINSHASA_COMMUNES

DEFAULT_PASSWORD = 'Simbisa2025!'
PHONE_PREFIX = '+243810000'  # + index à 3 chiffres (101..124)


class Command(BaseCommand):
    help = "Crée un agent de crédit par commune de Kinshasa (24 agents max)."

    def handle(self, *args, **options):
        role, _ = Role.objects.get_or_create(nom_role='Agent de crédit')
        created_count = 0

        with transaction.atomic():
            for i, (code, label) in enumerate(KINSHASA_COMMUNES, start=101):
                existing = Utilisateur.objects.filter(
                    role=role, commune_kinshasa=code, statut='actif',
                ).first()
                if existing:
                    self.stdout.write(f'  — {label:15s} déjà couverte par {existing.telephone}')
                    continue

                telephone = f'{PHONE_PREFIX}{i}'
                user = Utilisateur.objects.create_user(
                    telephone=telephone,
                    password=DEFAULT_PASSWORD,
                    nom='AGENT',
                    prenom=label.upper(),
                    postnom='',
                    email=f'agent.{code}@rawbank.cd',
                    role=role,
                    statut='actif',
                    is_staff=False,
                    commune_kinshasa=code,
                )
                created_count += 1
                self.stdout.write(f'  ✓ {label:15s} → agent créé ({telephone})')

        self.stdout.write(self.style.SUCCESS(
            f'\n{created_count} nouveaux agents créés / {len(KINSHASA_COMMUNES)} communes couvertes.'
            f'\nMot de passe par défaut : {DEFAULT_PASSWORD}'
        ))
