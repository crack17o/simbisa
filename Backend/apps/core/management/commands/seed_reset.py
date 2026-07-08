"""
Réinitialisation complète de la base + seed minimal.

Usage:
    python manage.py seed_reset             # seed sans vider
    python manage.py seed_reset --flush     # vide TOUT puis seed

Crée :
  • 6 rôles (Admin, Agent de crédit, Responsable crédit, Analyste risque, Auditeur, Client)
  • 1 Administrateur, 1 Responsable crédit, 1 Analyste risque, 1 Auditeur
  • 24 Agents de crédit — un par commune de Kinshasa
  • 2 Clients : 1 KYC valide, 1 sans KYC

Mot de passe commun : Simbisa2025!
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

PASSWORD = 'Simbisa2025!'
PHONE_ADMIN    = '+243000000001'
PHONE_MANAGER  = '+243000000002'
PHONE_ANALYSTE = '+243000000003'
PHONE_AUDITEUR = '+243000000004'
# Agents : +243010000XX (01-24)
PHONE_CLIENT_KYC    = '+243800000001'
PHONE_CLIENT_NO_KYC = '+243800000002'


class Command(BaseCommand):
    help = 'Réinitialise la BDD et seed les données minimales (rôles, 24 agents, 2 clients).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush', action='store_true',
            help='Supprime TOUTES les données (hors superusers Django) avant de seeder.',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self._flush_all()

        with transaction.atomic():
            roles = self._seed_roles()
            self._seed_staff(roles)
            agents = self._seed_agents(roles)
            self._seed_clients(roles, agents)
            self._seed_scoring_rules()
            self._seed_rag_docs()

        self._print_summary()

    # ------------------------------------------------------------------ #
    #  FLUSH                                                               #
    # ------------------------------------------------------------------ #
    def _flush_all(self):
        self.stdout.write(self.style.WARNING('Suppression de toutes les données...'))

        # Import ici pour éviter les erreurs d'import circulaire au démarrage
        from apps.audit.models import AuditLog
        from apps.scoring.models import (
            DecisionCredit, ScoreRegle, ScoreMobileMoney,
            ScoreComportemental, ScoreIA, ScoringRule, ModelTrainingRun,
        )
        from apps.credits.models import (
            DemandeCredit, Credit, CreditException, Remboursement, Echeance,
        )
        from apps.savings.models import CompteEpargne, OperationEpargne
        from apps.wallets.models import (
            WalletRawbank, WalletTransaction, MobileMoneyAccount, MobileMoneyTransaction,
        )
        from apps.clients.models import Client, Identite
        from apps.authentication.models import Utilisateur, Role
        from apps.rag.models import VectorDocument
        try:
            from apps.ussd.models import UssdProfile, UssdSession
            UssdSession.objects.all().delete()
            UssdProfile.objects.all().delete()
        except Exception:
            pass

        # Ordre respectant les FK
        AuditLog.objects.all().delete()
        for M in [DecisionCredit, ScoreRegle, ScoreMobileMoney, ScoreComportemental, ScoreIA]:
            M.objects.all().delete()
        ScoringRule.objects.all().delete()
        ModelTrainingRun.objects.all().delete()
        Remboursement.objects.all().delete()
        Echeance.objects.all().delete()
        CreditException.objects.all().delete()
        Credit.objects.all().delete()
        DemandeCredit.objects.all().delete()
        OperationEpargne.objects.all().delete()
        CompteEpargne.objects.all().delete()
        MobileMoneyTransaction.objects.all().delete()
        MobileMoneyAccount.objects.all().delete()
        WalletTransaction.objects.all().delete()
        WalletRawbank.objects.all().delete()
        Identite.objects.all().delete()
        Client.objects.all().delete()
        # Supprimer tous les utilisateurs sauf superusers Django
        deleted, _ = Utilisateur.objects.filter(is_superuser=False).delete()
        # Les rôles ne sont pas supprimés : les superusers les référencent (FK protégée)
        # _seed_roles() utilise get_or_create, donc c'est idempotent
        VectorDocument.objects.all().delete()

        self.stdout.write(self.style.WARNING(f'  {deleted} utilisateur(s) non-superuser supprimé(s).'))
        self.stdout.write(self.style.WARNING('  Toutes les tables métier vidées.'))

    # ------------------------------------------------------------------ #
    #  RÔLES                                                               #
    # ------------------------------------------------------------------ #
    def _seed_roles(self):
        from apps.authentication.models import Role
        role_names = [
            ('Administrateur',     'Accès complet à toutes les fonctions de la plateforme.'),
            ('Agent de crédit',    'Traitement des demandes de crédit et suivi client.'),
            ('Responsable crédit', 'Validation des exceptions et supervision des agents.'),
            ('Analyste risque',    'Analyse et reporting des risques de crédit.'),
            ('Auditeur',           'Consultation des journaux d\'audit et conformité.'),
            ('Client',             'Accès client : épargne, crédit, profil.'),
        ]
        roles = {}
        for nom, desc in role_names:
            r, _ = Role.objects.get_or_create(nom_role=nom, defaults={'description': desc})
            roles[nom] = r
        self.stdout.write(f'  [OK] {len(roles)} rôles')
        return roles

    # ------------------------------------------------------------------ #
    #  STAFF (Admin, Manager, Analyste, Auditeur)                          #
    # ------------------------------------------------------------------ #
    def _seed_staff(self, roles):
        from apps.authentication.models import Utilisateur

        staff_specs = [
            (PHONE_ADMIN,    'Administrateur',     'Admin',      'Système',   'Rawbank',     True,  True),
            (PHONE_MANAGER,  'Responsable crédit', 'Responsable','Crédit',    'Mukendi',     True,  False),
            (PHONE_ANALYSTE, 'Analyste risque',    'Analyste',   'Risque',    'Tshilombo',   False, False),
            (PHONE_AUDITEUR, 'Auditeur',           'Auditeur',   'Conformité','Ilunga',      False, False),
        ]

        for tel, role_name, prenom, postnom, nom, is_staff, is_super in staff_specs:
            role = roles[role_name]
            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role,
                    'prenom': prenom, 'postnom': postnom, 'nom': nom,
                    'email': f'{role_name.lower().replace(" ", ".")}@simbisa.cd',
                    'statut': 'actif',
                    'is_staff': is_staff,
                    'is_superuser': is_super,
                    'last_login_country': 'CD',
                },
            )
            if not user.check_password(PASSWORD):
                user.set_password(PASSWORD)
                user.save()
            if user.role_id != role.pk:
                user.role = role
                user.save(update_fields=['role'])

        self.stdout.write(f'  [OK] 4 utilisateurs staff (Admin, Manager, Analyste, Auditeur)')

    # ------------------------------------------------------------------ #
    #  24 AGENTS — un par commune                                          #
    # ------------------------------------------------------------------ #
    def _seed_agents(self, roles):
        from apps.authentication.models import Utilisateur
        from apps.core.kinshasa_communes import KINSHASA_COMMUNES

        role_agent = roles['Agent de crédit']
        agents = {}

        for i, (code, label) in enumerate(KINSHASA_COMMUNES, start=1):
            tel = f'+24301{i:07d}'
            # Vérifie si un agent couvre déjà cette commune
            existing = Utilisateur.objects.filter(
                role=role_agent, commune_kinshasa=code, statut='actif',
            ).first()
            if existing:
                agents[code] = existing
                continue

            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role_agent,
                    'prenom': label.upper(),
                    'postnom': '',
                    'nom': 'AGENT',
                    'email': f'agent.{code}@simbisa.cd',
                    'statut': 'actif',
                    'commune_kinshasa': code,
                    'is_staff': True,
                    'last_login_country': 'CD',
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save()
            elif user.commune_kinshasa != code:
                user.commune_kinshasa = code
                user.save(update_fields=['commune_kinshasa'])
            agents[code] = user

        total = Utilisateur.objects.filter(role=role_agent, statut='actif').count()
        self.stdout.write(f'  [OK] {total} agents actifs (24 communes couvertes)')
        return agents

    # ------------------------------------------------------------------ #
    #  2 CLIENTS                                                           #
    # ------------------------------------------------------------------ #
    def _seed_clients(self, roles, agents):
        from apps.authentication.models import Utilisateur
        from apps.clients.models import Client, Identite
        from apps.wallets.views import ensure_client_wallets

        role_client = roles['Client']
        today = timezone.now().date()

        # Agent assigné par défaut → Gombe
        agent_gombe = agents.get('gombe')

        client_specs = [
            # (tel, prenom, postnom, nom, commune, dob, revenu_usd, revenu_cdf, kyc_valid)
            (
                PHONE_CLIENT_KYC, 'Joëlle', 'Tshimba', 'Ngoy',
                'gombe', date(1995, 6, 20),
                Decimal('450.00'), Decimal('1125000.00'), True,
            ),
            (
                PHONE_CLIENT_NO_KYC, 'Patient', 'Kabongo', 'Mwamba',
                'lemba', date(1998, 3, 11),
                Decimal('200.00'), Decimal('500000.00'), False,
            ),
        ]

        for tel, prenom, postnom, nom, commune, dob, rev_usd, rev_cdf, kyc_valid in client_specs:
            # Utilisateur
            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role_client,
                    'prenom': prenom, 'postnom': postnom, 'nom': nom,
                    'email': f'{prenom.lower()}.{nom.lower()}@demo.simbisa.cd',
                    'statut': 'actif',
                    'is_staff': False,
                    'last_login_country': 'CD',
                },
            )
            if not user.check_password(PASSWORD):
                user.set_password(PASSWORD)
                user.save()

            # Profil client
            if not hasattr(user, 'client_profile'):
                client = Client.objects.create(
                    id_utilisateur=user,
                    commune_kinshasa=commune,
                    date_naissance=dob,
                    revenu_estime_usd=rev_usd,
                    revenu_estime_cdf=rev_cdf,
                    profession='Commerçante' if prenom == 'Joëlle' else 'Fonctionnaire',
                    adresse=f'Av. {nom}, {commune.title()}',
                    id_agent_assigne=agents.get(commune, agent_gombe),
                    niveau_compte='pro',
                )
            else:
                client = user.client_profile

            # Wallets USD + CDF
            try:
                ensure_client_wallets(client)
            except Exception:
                pass

            # KYC
            if kyc_valid:
                Identite.objects.update_or_create(
                    numero_piece=f'KYC-RESET-{tel[-8:]}',
                    defaults={
                        'id_client': client,
                        'type_piece': 'carte_electeur',
                        'date_expiration': today + timedelta(days=365 * 3),
                        'statut_verification': 'valide',
                        'date_verification': timezone.now(),
                        'verified_by': agents.get(commune, agent_gombe),
                    },
                )
                kyc_label = 'KYC valide'
            else:
                kyc_label = 'sans KYC'

            self.stdout.write(
                f'  [OK] Client {prenom} {nom} ({tel}) — {commune} — {kyc_label}'
            )

        self.stdout.write('  [OK] 2 clients créés (wallets + KYC)')

    # ------------------------------------------------------------------ #
    #  RÈGLES SCORING                                                      #
    # ------------------------------------------------------------------ #
    def _seed_scoring_rules(self):
        from apps.scoring.models import ScoringRule
        rules = [
            ('kyc',          'KYC obligatoire',            'Pièce d\'identité validée requise',                   'kyc',          Decimal('25.00')),
            ('age',          'Âge éligible (20-60 ans)',   'Conformité BCC micro-crédit',                         'general',      Decimal('10.00')),
            ('credit_actif', 'Un seul crédit actif',       'Pas de cumul de crédits en cours',                    'general',      Decimal('15.00')),
            ('anciennete',   'Ancienneté plateforme ≥ 30j','Malus si moins de 30 jours sur la plateforme',        'comportement', Decimal('10.00')),
            ('montant',      'Plage selon niveau compte',  'Standard 300 / Pro 700 / Pro+ 1200 / Premium 2500 USD','montant',      Decimal('15.00')),
            ('mm_regularite','Régularité Mobile Money',    'Fréquence et régularité des transactions MM (90 j)',   'mobile_money', Decimal('15.00')),
            ('mm_volume',    'Volume Mobile Money',        'Volume mensuel moyen de transactions MM',              'mobile_money', Decimal('10.00')),
        ]
        for code, label, desc, category, weight in rules:
            ScoringRule.objects.update_or_create(
                code=code,
                defaults={
                    'label': label, 'description': desc,
                    'category': category, 'is_active': True, 'weight': weight,
                },
            )
        self.stdout.write(f'  [OK] {len(rules)} règles scoring')

    # ------------------------------------------------------------------ #
    #  DOCUMENTS RAG                                                       #
    # ------------------------------------------------------------------ #
    def _seed_rag_docs(self):
        from apps.rag.models import VectorDocument
        docs = [
            (
                'Politique micro-crédit Rawbank Simbisa', 'policy',
                'Les micro-crédits Simbisa vont de 50 à 2500 USD selon le niveau de compte. '
                'KYC obligatoire. Âge éligible : 20 à 60 ans. '
                'Niveaux : Standard (max 300 USD, 6 mois), Pro (700 USD, 9 mois), '
                'Pro+ (1200 USD, 12 mois), Premium (2500 USD, 12 mois). '
                'Taux mensuel indicatif : 3 %. Un seul crédit actif à la fois.',
            ),
            (
                'Procédure KYC Simbisa', 'policy',
                'Pièce d\'identité valide requise : carte d\'électeur, passeport ou permis de conduire. '
                'Vérification par l\'agent de crédit de la commune du client. '
                'Statuts possibles : en_attente, valide, rejete.',
            ),
            (
                'Grille des niveaux de compte Simbisa', 'policy',
                'Standard : max 300 USD, durée max 6 mois. '
                'Pro : max 700 USD, durée max 9 mois. '
                'Pro+ : max 1200 USD, durée max 12 mois. '
                'Premium : max 2500 USD, durée max 12 mois. '
                'Passage de niveau décidé par le responsable crédit.',
            ),
        ]
        for title, doc_type, content in docs:
            VectorDocument.objects.update_or_create(
                title=title,
                defaults={'content': content, 'document_type': doc_type, 'source': 'seed'},
            )
        self.stdout.write(f'  [OK] {len(docs)} documents RAG')

    # ------------------------------------------------------------------ #
    #  RÉSUMÉ                                                              #
    # ------------------------------------------------------------------ #
    def _print_summary(self):
        from apps.authentication.models import Utilisateur, Role
        from apps.clients.models import Client

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 55))
        self.stdout.write(self.style.SUCCESS('   Seed terminé — Simbisa Reset'))
        self.stdout.write(self.style.SUCCESS('=' * 55))
        self.stdout.write(f'  Mot de passe commun : {PASSWORD}')
        self.stdout.write('')
        self.stdout.write('  Staff :')
        for tel, label in [
            (PHONE_ADMIN,    'Administrateur'),
            (PHONE_MANAGER,  'Responsable crédit'),
            (PHONE_ANALYSTE, 'Analyste risque'),
            (PHONE_AUDITEUR, 'Auditeur'),
        ]:
            self.stdout.write(f'    {label:25s} {tel}')
        self.stdout.write('')
        self.stdout.write('  Clients :')
        self.stdout.write(f'    KYC valide   {PHONE_CLIENT_KYC}  (Joëlle Tshimba — Gombe)')
        self.stdout.write(f'    Sans KYC     {PHONE_CLIENT_NO_KYC}  (Patient Kabongo — Lemba)')
        self.stdout.write('')
        agent_count = Utilisateur.objects.filter(
            role__nom_role='Agent de crédit', statut='actif'
        ).count()
        self.stdout.write(f'  Agents actifs : {agent_count} (un par commune)')
        self.stdout.write('')
        self.stdout.write('  Login : POST /api/v1/auth/login/')
        self.stdout.write('  Docs  : /api/docs/')
        self.stdout.write('')
