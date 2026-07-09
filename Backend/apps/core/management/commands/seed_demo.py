"""
Peuple la base avec des données de démonstration réalistes.

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --flush     # supprime les données demo avant re-seed
    python manage.py seed_demo --no-scoring
"""
import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

DEMO_PASSWORD = 'Test123!'

# Téléphones staff
TEL_ADMIN    = '+243900000000'
TEL_AGENT1   = '+243900000002'   # Gombe
TEL_AGENT2   = '+243900000006'   # Limete
TEL_AGENT3   = '+243900000007'   # Bandal
TEL_MANAGER  = '+243900000003'
TEL_ANALYSTE = '+243900000004'
TEL_AUDITEUR = '+243900000005'

DEMO_STAFF_PHONES = [TEL_ADMIN, TEL_AGENT1, TEL_AGENT2, TEL_AGENT3, TEL_MANAGER, TEL_ANALYSTE, TEL_AUDITEUR]

# 20 clients demo — préfixes réseau DRC pour détecter auto l'opérateur
CLIENT_SPECS = [
    # (téléphone, prenom, postnom, nom, commune, dob, revenu_usd, revenu_cdf, risque, niveau, kyc)
    ('+243810000001', 'Jean',    'Kabila',   'Mutombo',  'gombe',     date(1990, 3, 15), 500,  1200000, 'moyen',      'pro',      True),
    ('+243820000002', 'Marie',   'Mbuyi',    'Lukusa',   'limete',    date(1995, 7, 22), 0,    0,       'non_evalue', 'standard', False),
    ('+243830000003', 'Paul',    'Tshilombo','Nkusu',    'ngaliema',  date(1988, 11, 5), 800,  2000000, 'faible',     'pro_plus', True),
    ('+243840000004', 'Alice',   'Ilunga',   'Kasongo',  'kinshasa',  date(1993, 5, 10), 1200, 2800000, 'faible',     'premium',  True),
    ('+243850000005', 'Robert',  'Kabongo',  'Matamba',  'gombe',     date(1985, 9, 30), 350,  800000,  'moyen',      'pro',      True),
    ('+243860000006', 'Grace',   'Mputu',    'Nsimba',   'kalamu',    date(1998, 2, 14), 200,  450000,  'non_evalue', 'standard', False),
    ('+243870000007', 'Pierre',  'Mukendi',  'Kazadi',   'lemba',     date(1992, 8, 20), 650,  1500000, 'faible',     'pro',      True),
    ('+243880000008', 'Sophie',  'Ngoy',     'Kabeya',   'makala',    date(1991, 12, 1), 900,  2200000, 'faible',     'pro_plus', True),
    ('+243890000009', 'David',   'Luhaka',   'Mwamba',   'masina',    date(1987, 4, 18), 0,    0,       'non_evalue', 'standard', False),
    ('+243970000010', 'Claire',  'Basila',   'Tshianga', 'gombe',     date(1994, 6, 25), 700,  1800000, 'moyen',      'pro',      True),
    ('+243980000011', 'Michel',  'Kahindo',  'Bwana',    'limete',    date(1986, 1, 7),  1500, 3500000, 'faible',     'premium',  True),
    ('+243990000012', 'Jeanne',  'Mbala',    'Kilanda',  'ngaliema',  date(1999, 3, 28), 300,  700000,  'moyen',      'standard', True),
    ('+243810000013', 'Thomas',  'Nzuzi',    'Lutumba',  'kinshasa',  date(1989, 10, 15), 450, 1100000, 'faible',     'pro',      True),
    ('+243820000014', 'Anne',    'Kasumba',  'Mwana',    'kasa-vubu', date(1996, 7, 9),  600,  1400000, 'moyen',      'pro',      True),
    ('+243830000015', 'Justin',  'Malonda',  'Mpaka',    'gombe',     date(1983, 2, 22), 2000, 4500000, 'faible',     'premium',  True),
    ('+243840000016', 'Sandra',  'Bikeka',   'Luzolo',   'lemba',     date(2000, 5, 5),  0,    0,       'non_evalue', 'standard', False),
    ('+243850000017', 'Eric',    'Tshimanga','Diakiese',  'makala',    date(1991, 8, 30), 550,  1350000, 'moyen',      'pro',      True),
    ('+243860000018', 'Valerie', 'Mabiku',   'Nzinga',   'masina',    date(1988, 11, 18), 400, 950000,  'faible',     'pro',      True),
    ('+243870000019', 'Albert',  'Kanku',    'Mukeba',   'limete',    date(1985, 4, 12), 1100, 2600000, 'faible',     'pro_plus', True),
    ('+243900000020', 'Celine',  'Mwangu',   'Tshika',   'gombe',     date(1997, 9, 3),  750,  1750000, 'moyen',      'pro',      True),
]

ALL_DEMO_PHONES = DEMO_STAFF_PHONES + [s[0] for s in CLIENT_SPECS]


class Command(BaseCommand):
    help = 'Charge rôles, 20 clients demo, wallets, épargne, crédits et scoring.'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true',
                            help='Supprime les données demo avant seed.')
        parser.add_argument('--no-scoring', action='store_true',
                            help='Ne lance pas le scoring synchrone (plus rapide).')

    def handle(self, *args, **options):
        if options['flush']:
            self._flush_demo()
        with transaction.atomic():
            self._seed_roles()
            self._seed_platform()
            users = self._seed_users()
            self._seed_clients(users)
            self._seed_wallets_and_mm(users)
            self._seed_savings(users)
            self._seed_savings_operations(users)
            self._seed_credits(users)
            self._seed_rag()
            self._seed_scoring_rules()
            self._seed_ussd_pins(users)
        if not options['no_scoring']:
            self._run_scoring_all()
            self._seed_exceptions(users)
            self._seed_audit_logs(users)
        self._print_summary(users)

    # ------------------------------------------------------------------ #
    #  FLUSH                                                               #
    # ------------------------------------------------------------------ #
    def _flush_demo(self):
        from apps.authentication.models import Utilisateur
        from apps.clients.models import Client
        from apps.credits.models import DemandeCredit, Credit, CreditException, Remboursement, Echeance
        from apps.audit.models import AuditLog
        from apps.scoring.models import (
            DecisionCredit, ScoreRegle, ScoreMobileMoney,
            ScoreComportemental, ScoreIA,
        )
        from apps.savings.models import CompteEpargne
        from apps.wallets.models import MobileMoneyAccount, WalletTransaction

        demo_users = Utilisateur.objects.filter(telephone__in=ALL_DEMO_PHONES)
        demo_clients = Client.objects.filter(id_utilisateur__in=demo_users)
        demande_ids = list(
            DemandeCredit.objects.filter(id_client__in=demo_clients).values_list('pk', flat=True)
        )
        if demande_ids:
            for M in [DecisionCredit, ScoreRegle, ScoreMobileMoney, ScoreComportemental, ScoreIA]:
                M.objects.filter(id_demande_id__in=demande_ids).delete()
        CreditException.objects.filter(id_client__in=demo_clients).delete()
        credit_ids = list(
            Credit.objects.filter(id_demande__id_client__in=demo_clients).values_list('pk', flat=True)
        )
        if credit_ids:
            Remboursement.objects.filter(id_credit_id__in=credit_ids).delete()
            Echeance.objects.filter(id_credit_id__in=credit_ids).delete()
        Credit.objects.filter(id_demande__id_client__in=demo_clients).delete()
        DemandeCredit.objects.filter(id_client__in=demo_clients).delete()
        CompteEpargne.objects.filter(id_client__in=demo_clients).delete()
        MobileMoneyAccount.objects.filter(id_client__in=demo_clients).delete()
        WalletTransaction.objects.filter(wallet__id_client__in=demo_clients).delete()
        AuditLog.objects.filter(id_utilisateur__in=demo_users).delete()
        deleted, _ = demo_users.delete()
        self.stdout.write(self.style.WARNING(f'Supprimé {deleted} enregistrement(s) demo.'))

    # ------------------------------------------------------------------ #
    #  ROLES + PLATFORM                                                    #
    # ------------------------------------------------------------------ #
    def _seed_roles(self):
        call_command('loaddata', 'roles', verbosity=0)
        self.stdout.write('  [OK] Rôles RBAC')

    def _seed_platform(self):
        from apps.core.models import PlatformConfig
        from apps.core.exchange_rate import set_cdf_per_usd
        config = PlatformConfig.load()
        config.usd_credit_min = Decimal('50.00')
        config.usd_credit_max = Decimal('2500.00')   # max niveau Premium
        config.usd_agent_auto_max = Decimal('400.00')
        config.usd_manager_max = Decimal('1200.00')
        config.save()
        set_cdf_per_usd(2250, user=None)
        self.stdout.write('  [OK] Taux 2500 CDF/USD + plafonds globaux crédit')

    # ------------------------------------------------------------------ #
    #  UTILISATEURS                                                        #
    # ------------------------------------------------------------------ #
    def _seed_users(self):
        from apps.authentication.models import Role, Utilisateur

        staff_specs = [
            (TEL_ADMIN,    'Administrateur',     'Admin',      'Système',  'Rawbank',   ''),
            (TEL_AGENT1,   'Agent de crédit',    'Agent',      'Crédit',   'Kabongo',   'gombe'),
            (TEL_AGENT2,   'Agent de crédit',    'Grace',      'Limete',   'Mputu',     'limete'),
            (TEL_AGENT3,   'Agent de crédit',    'Jonas',      'Bandal',   'Mukasa',    'bandal'),
            (TEL_MANAGER,  'Responsable crédit', 'Responsable','Crédit',   'Mukendi',   ''),
            (TEL_ANALYSTE, 'Analyste risque',    'Analyste',   'Risque',   'Tshilombo', ''),
            (TEL_AUDITEUR, 'Auditeur',           'Auditeur',   'Conformité','Ilunga',   ''),
        ]

        users = {}
        for tel, role_name, prenom, postnom, nom, commune in staff_specs:
            role = Role.objects.get(nom_role=role_name)
            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role, 'prenom': prenom, 'postnom': postnom, 'nom': nom,
                    'email': f'{tel.replace("+", "")}@demo.simbisa.cd',
                    'statut': 'actif',
                    'is_staff': role_name in ('Administrateur', 'Agent de crédit', 'Responsable crédit'),
                },
            )
            if created or not user.check_password(DEMO_PASSWORD):
                user.set_password(DEMO_PASSWORD)
                user.save()
            if not user.last_login_country:
                user.last_login_country = 'CD'
                user.save(update_fields=['last_login_country'])
            if commune and user.commune_kinshasa != commune:
                user.commune_kinshasa = commune
                user.save(update_fields=['commune_kinshasa'])
            users[tel] = user

        # Clients
        role_client = Role.objects.get(nom_role='Client')
        for (tel, prenom, postnom, nom, commune, dob, rev_usd, rev_cdf,
             risque, niveau, kyc) in CLIENT_SPECS:
            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role_client,
                    'prenom': prenom, 'postnom': postnom, 'nom': nom,
                    'email': f'{tel.replace("+", "")}@demo.simbisa.cd',
                    'statut': 'actif', 'is_staff': False,
                },
            )
            if created or not user.check_password(DEMO_PASSWORD):
                user.set_password(DEMO_PASSWORD)
                user.save()
            if not user.last_login_country:
                user.last_login_country = 'CD'
                user.save(update_fields=['last_login_country'])
            users[tel] = user

        self.stdout.write(f'  [OK] {len(users)} utilisateurs (mdp: {DEMO_PASSWORD})')
        return users

    # ------------------------------------------------------------------ #
    #  CLIENTS                                                             #
    # ------------------------------------------------------------------ #
    def _seed_clients(self, users):
        from apps.clients.models import Client, Identite
        from apps.clients.services.territoire import assign_client_to_agent
        from apps.wallets.views import ensure_client_wallets

        agent_gombe  = users[TEL_AGENT1]
        agent_limete = users[TEL_AGENT2]
        today = timezone.now().date()
        agent_map = {'gombe': agent_gombe, 'limete': agent_limete}

        for (tel, prenom, postnom, nom, commune, dob, rev_usd, rev_cdf,
             risque, niveau, kyc) in CLIENT_SPECS:
            user = users[tel]
            if not hasattr(user, 'client_profile'):
                client = Client.objects.create(
                    id_utilisateur=user,
                    profession=_random_profession(),
                    adresse=f'Av. {nom}, {commune.title()}',
                    date_naissance=dob,
                    revenu_estime_usd=Decimal(str(rev_usd)),
                    revenu_estime_cdf=Decimal(str(rev_cdf)),
                    niveau_risque=risque,
                    niveau_compte=niveau,
                )
            else:
                client = user.client_profile
                Client.objects.filter(pk=client.pk).update(
                    revenu_estime_usd=Decimal(str(rev_usd)),
                    revenu_estime_cdf=Decimal(str(rev_cdf)),
                    niveau_risque=risque,
                    niveau_compte=niveau,
                )
                client.refresh_from_db()

            client.commune_kinshasa = commune
            client.save(update_fields=['commune_kinshasa', 'updated_at'])

            agent = agent_map.get(commune, agent_gombe)
            assign_client_to_agent(client, agent)
            ensure_client_wallets(client)

            if kyc:
                Identite.objects.update_or_create(
                    numero_piece=f'KYC-{tel[-8:]}',
                    defaults={
                        'id_client': client,
                        'type_piece': random.choice(['carte_electeur', 'passeport', 'permis_conduire']),
                        'date_expiration': today + timedelta(days=365 * random.randint(1, 5)),
                        'statut_verification': 'valide',
                        'date_verification': timezone.now(),
                        'verified_by': agent,
                    },
                )

        self.stdout.write(f'  [OK] {len(CLIENT_SPECS)} clients avec profil, commune, KYC, wallets')

    # ------------------------------------------------------------------ #
    #  WALLETS & MOBILE MONEY                                              #
    # ------------------------------------------------------------------ #
    def _seed_wallets_and_mm(self, users):
        from apps.wallets.models import WalletRawbank, MobileMoneyAccount, MobileMoneyTransaction
        from apps.ussd.msisdn import detect_operateur

        now = timezone.now()

        for (tel, prenom, postnom, nom, commune, dob, rev_usd, rev_cdf,
             risque, niveau, kyc) in CLIENT_SPECS:
            if not rev_usd and not rev_cdf:
                continue  # clients sans revenus → wallets à 0
            client = users[tel].client_profile

            # Soldes wallets proportionnels au revenu
            solde_usd = Decimal(str(round(rev_usd * random.uniform(0.2, 0.8), 2)))
            solde_cdf = Decimal(str(round(rev_cdf * random.uniform(0.1, 0.5), 0)))

            WalletRawbank.objects.filter(id_client=client, devise='USD').update(solde=solde_usd)
            WalletRawbank.objects.filter(id_client=client, devise='CDF').update(solde=solde_cdf)

            # Compte Mobile Money détecté par préfixe du numéro
            operateur = detect_operateur(tel)
            if not operateur:
                continue

            mm_account, _ = MobileMoneyAccount.objects.get_or_create(
                id_client=client,
                operateur=operateur,
                numero_telephone=tel,
                devise='CDF',
                defaults={'is_active': True},
            )

            # Historique MM sur 90 jours — 15 à 30 transactions
            nb_txns = random.randint(15, 30)
            solde_mm = Decimal(str(round(rev_cdf * random.uniform(0.3, 0.6), 0)))

            for i in range(nb_txns):
                dt = now - timedelta(days=random.randint(1, 90),
                                     hours=random.randint(0, 23))
                if random.random() < 0.55:
                    typ = random.choice(['reception', 'depot'])
                    montant = Decimal(str(random.choice([15000, 25000, 50000, 75000, 100000, 150000])))
                    solde_mm += montant
                else:
                    typ = random.choice(['transfert_sortant', 'paiement_facture', 'retrait'])
                    montant = Decimal(str(random.choice([10000, 20000, 30000, 50000])))
                    if solde_mm <= montant:
                        continue
                    solde_mm -= montant

                ref = f'SEED-{tel[-6:]}-{i:03d}'
                if not MobileMoneyTransaction.objects.filter(reference_externe=ref).exists():
                    MobileMoneyTransaction.objects.create(
                        id_mm_account=mm_account,
                        devise='CDF',
                        type_transaction=typ,
                        montant=montant,
                        solde_apres=max(solde_mm, Decimal('0')),
                        date_transaction=dt,
                        reference_externe=ref,
                        description=f'Transaction demo {operateur}',
                    )

        self.stdout.write('  [OK] Wallets USD/CDF + historique MM 90 jours')

    # ------------------------------------------------------------------ #
    #  ÉPARGNE                                                             #
    # ------------------------------------------------------------------ #
    def _seed_savings(self, users):
        from apps.savings.models import CompteEpargne

        objectifs = [
            'Fonds urgence', 'Stock boutique', 'Éducation enfants',
            'Achat terrain', 'Mariage', 'Véhicule', 'Épargne retraite',
        ]

        for (tel, *_, rev_usd, rev_cdf, risque, niveau, kyc) in CLIENT_SPECS:
            if not rev_usd and not rev_cdf:
                continue
            client = users[tel].client_profile

            if rev_usd:
                CompteEpargne.objects.get_or_create(
                    id_client=client, devise='USD',
                    defaults={
                        'solde': Decimal(str(round(rev_usd * 0.15, 2))),
                        'objectif_montant': Decimal(str(rev_usd * 3)),
                        'objectif_description': random.choice(objectifs),
                        'is_active': True,
                    },
                )
            if rev_cdf:
                CompteEpargne.objects.get_or_create(
                    id_client=client, devise='CDF',
                    defaults={
                        'solde': Decimal(str(round(rev_cdf * 0.1, 0))),
                        'objectif_montant': Decimal(str(rev_cdf * 5)),
                        'objectif_description': random.choice(objectifs),
                        'is_active': True,
                    },
                )

        self.stdout.write('  [OK] Comptes épargne USD/CDF')

    def _seed_savings_operations(self, users):
        from apps.savings.models import CompteEpargne, OperationEpargne
        from apps.ussd.msisdn import detect_operateur

        modes = ['illicocash', 'mpesa', 'orange_money', 'airtel_money', 'africell']
        now = timezone.now()
        count = 0

        for (tel, *_) in CLIENT_SPECS:
            client = users[tel].client_profile
            operateur_client = detect_operateur(tel)

            for compte in CompteEpargne.objects.filter(id_client=client):
                if compte.operations.exists():
                    continue
                solde = Decimal('0')
                nb = random.randint(3, 8)
                for i in range(nb):
                    typ = 'depot' if random.random() < 0.7 else 'retrait'
                    if typ == 'depot':
                        m = Decimal(str(random.choice([25, 50, 75, 100, 150, 200]))) \
                            if compte.devise == 'USD' \
                            else Decimal(str(random.choice([25000, 50000, 75000, 100000])))
                        solde_avant = solde
                        solde += m
                    else:
                        if solde <= 0:
                            continue
                        m = min(
                            Decimal(str(random.choice([10, 20, 30]))) if compte.devise == 'USD'
                            else Decimal(str(random.choice([10000, 20000]))),
                            solde
                        )
                        solde_avant = solde
                        solde -= m

                    mode = operateur_client or random.choice(modes)
                    OperationEpargne.objects.create(
                        id_compte_epargne=compte,
                        type_operation=typ,
                        montant=m,
                        solde_avant=solde_avant,
                        solde_apres=solde,
                        mode_paiement=mode,
                        numero_paiement=tel,
                        description=f'Seed {typ} #{i + 1}',
                    )
                    count += 1

                compte.solde = solde
                compte.save(update_fields=['solde', 'updated_at'])

        self.stdout.write(f'  [OK] {count} opérations épargne avec mode de paiement')

    # ------------------------------------------------------------------ #
    #  CRÉDITS                                                             #
    # ------------------------------------------------------------------ #
    def _seed_credits(self, users):
        from apps.credits.models import DemandeCredit, Credit, Remboursement, Echeance

        now = timezone.now()

        # Quelques demandes représentatives par niveau
        credit_requests = [
            # (tel, montant, devise, duree, motif, statut)
            ('+243810000001', Decimal('250.00'),    'USD', 6, 'Achat stock boutique',        'en_analyse'),
            ('+243830000003', Decimal('500.00'),    'USD', 9, 'Extension activité',           'en_analyse'),
            ('+243840000004', Decimal('1500.00'),   'USD', 12, 'Investissement immobilier',  'en_analyse'),
            ('+243850000005', Decimal('300.00'),    'USD', 6, 'Fonds roulement',             'en_analyse'),
            ('+243870000007', Decimal('400.00'),    'USD', 6, 'Équipement bureau',           'approuve'),
            ('+243880000008', Decimal('700.00'),    'USD', 9, 'Véhicule commercial',         'approuve'),
            ('+243970000010', Decimal('200.00'),    'USD', 6, 'Matériel informatique',       'en_analyse'),
            ('+243980000011', Decimal('2000.00'),   'USD', 12, 'Construction boutique',      'en_analyse'),
            ('+243990000012', Decimal('100.00'),    'USD', 3, 'Micro-crédit consommation',   'en_analyse'),
            ('+243810000013', Decimal('1125000.00'),'CDF', 6, 'Stock marchandises CDF',     'en_analyse'),
            ('+243820000014', Decimal('600.00'),    'USD', 6, 'Formation professionnelle',   'rejete'),
            ('+243830000015', Decimal('2500.00'),   'USD', 12, 'Grand projet investissement','en_analyse'),
            ('+243850000017', Decimal('350.00'),    'USD', 6, 'Petit commerce',              'en_analyse'),
            ('+243860000018', Decimal('500000.00'), 'CDF', 6, 'Activité agricole',          'en_analyse'),
            ('+243870000019', Decimal('1000.00'),   'USD', 9, 'Expansion entreprise',       'approuve'),
            ('+243900000020', Decimal('600.00'),    'USD', 6, 'Équipement atelier',         'en_analyse'),
        ]

        for tel, montant, devise, duree, motif, statut in credit_requests:
            if tel not in users:
                continue
            client = users[tel].client_profile
            if not client.kyc_valid and statut != 'rejete':
                continue  # Skip clients sans KYC

            d, _ = DemandeCredit.objects.update_or_create(
                id_client=client, montant_demande=montant, devise=devise,
                defaults={'duree_mois': duree, 'motif': motif, 'statut': statut},
            )

            # Créer crédit + échéancier pour les demandes approuvées
            if statut == 'approuve':
                credit, c_created = Credit.objects.get_or_create(
                    id_demande=d,
                    defaults={
                        'montant_accorde': montant * Decimal('0.95'),
                        'taux_interet': Decimal('3.00'),
                        'date_debut': date.today() - timedelta(days=45),
                        'date_fin': date.today() + timedelta(days=30 * duree - 45),
                        'statut': 'en_cours',
                    },
                )
                if c_created and not credit.echeances.exists():
                    mensualite = credit.mensualite
                    for i in range(1, duree + 1):
                        Echeance.objects.create(
                            id_credit=credit,
                            montant=mensualite,
                            date_echeance=date.today() - timedelta(days=45) + timedelta(days=30 * i),
                            statut='paye' if i == 1 else 'non_paye',
                            montant_paye=mensualite if i == 1 else Decimal('0'),
                        )
                    Remboursement.objects.create(
                        id_credit=credit,
                        montant=mensualite,
                        mode_paiement='mobile_money',
                        reference_transaction=f'SEED-REM-{tel[-6:]}-1',
                    )

        self.stdout.write(f'  [OK] {len(credit_requests)} demandes crédit')

    # ------------------------------------------------------------------ #
    #  RAG + RÈGLES SCORING                                                #
    # ------------------------------------------------------------------ #
    def _seed_rag(self):
        from apps.rag.models import VectorDocument
        docs = [
            ('Politique micro-crédit Rawbank', 'policy',
             'Les micro-crédits Simbisa vont de 50 à 2500 USD selon le niveau de compte. '
             'KYC obligatoire. Âge 20-60 ans. Niveaux : Standard (300 USD), Pro (700 USD), '
             'Pro+ (1200 USD), Premium (2500 USD).'),
            ('Procédure KYC', 'policy',
             'Pièce d\'identité valide requise : carte électeur, passeport ou permis de conduire.'),
            ('Niveaux de compte Simbisa', 'policy',
             'Standard : max 300 USD, 6 mois. Pro : max 700 USD, 9 mois. '
             'Pro+ : max 1200 USD, 12 mois. Premium : max 2500 USD, 12 mois.'),
        ]
        for title, doc_type, content in docs:
            VectorDocument.objects.update_or_create(
                title=title, defaults={'content': content, 'document_type': doc_type, 'source': 'seed'},
            )
        self.stdout.write('  [OK] Documents RAG')

    def _seed_scoring_rules(self):
        from apps.scoring.models import ScoringRule
        rules = [
            ('kyc',         'KYC obligatoire',            'Pièce d\'identité validée requise',         'kyc'),
            ('age',         'Âge éligible (20-60 ans)',   'Conformité BCC micro-crédit',               'general'),
            ('credit_actif','Un seul crédit actif',       'Pas de cumul de crédits en cours',          'general'),
            ('anciennete',  'Ancienneté plateforme ≥ 30j','Malus si non respecté (-20 pts)',           'comportement'),
            ('montant',     'Plage selon niveau compte',  'Standard 300 / Pro 700 / Pro+ 1200 / Premium 2500', 'montant'),
        ]
        for code, label, desc, category in rules:
            ScoringRule.objects.update_or_create(
                code=code, defaults={'label': label, 'description': desc, 'category': category, 'is_active': True},
            )
        self.stdout.write('  [OK] Règles scoring')

    # ------------------------------------------------------------------ #
    #  USSD PINS                                                           #
    # ------------------------------------------------------------------ #
    def _seed_ussd_pins(self, users):
        from apps.ussd.models import UssdProfile
        from django.conf import settings
        pin = getattr(settings, 'USSD_DEFAULT_PIN', '0000')
        count = 0
        for tel in [s[0] for s in CLIENT_SPECS]:
            try:
                client = users[tel].client_profile
                profile, _ = UssdProfile.objects.get_or_create(client=client)
                profile.set_pin(pin)
                count += 1
            except Exception:
                pass
        self.stdout.write(f'  [OK] PIN USSD "{pin}" pour {count} client(s)')

    # ------------------------------------------------------------------ #
    #  SCORING                                                             #
    # ------------------------------------------------------------------ #
    def _run_scoring_all(self):
        from apps.scoring.services import ScoringOrchestrator
        from apps.credits.models import DemandeCredit
        demandes = DemandeCredit.objects.filter(statut='en_analyse').select_related('id_client')
        if not demandes.exists():
            self.stdout.write('  [--] Aucune demande en_analyse à scorer')
            return
        for demande in demandes:
            try:
                result = ScoringOrchestrator(demande).run()
                self.stdout.write(
                    f'  [OK] Scoring #{demande.pk} ({demande.devise} {demande.montant_demande}) '
                    f"→ {result.get('decision')} ({result.get('score_global')})"
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERR] Scoring #{demande.pk}: {e}'))

    # ------------------------------------------------------------------ #
    #  EXCEPTIONS                                                          #
    # ------------------------------------------------------------------ #
    def _seed_exceptions(self, users):
        from apps.credits.models import DemandeCredit, CreditException
        agent   = users[TEL_AGENT1]
        manager = users[TEL_MANAGER]

        # Exception plafond sur demande 2500 USD (Premium)
        d = DemandeCredit.objects.filter(
            montant_demande=Decimal('2500.00'), devise='USD',
        ).first()
        if d and not CreditException.objects.filter(id_demande=d, type_exception='plafond').exists():
            CreditException.objects.create(
                id_demande=d, id_client=d.id_client,
                type_exception='plafond',
                motif='Montant 2500 USD — dépasse plafond agent auto (400 USD)',
                statut='ouverte',
                observation='Escalade responsable crédit requise.',
                created_by=agent,
            )
        self.stdout.write('  [OK] Exceptions crédit')

    # ------------------------------------------------------------------ #
    #  AUDIT LOGS                                                          #
    # ------------------------------------------------------------------ #
    def _seed_audit_logs(self, users):
        from apps.audit.models import AuditLog
        from apps.scoring.models import DecisionCredit
        now = timezone.now()
        specs = [
            (users[TEL_AGENT1],   'auth.login',      'Connexion agent crédit Kabongo'),
            (users[TEL_AGENT1],   'kyc.validate',    'Validation KYC 20 clients demo'),
            (users[TEL_AGENT1],   'credit.scoring',  'Scoring batch demandes demo'),
            (users[TEL_MANAGER],  'manager.exception','Revue exception plafond'),
            (users[TEL_AUDITEUR], 'audit.view',      'Consultation journal décisions crédit'),
        ]
        for i, (user, action, details) in enumerate(specs):
            log = AuditLog.objects.create(
                id_utilisateur=user, action=action, details=details, adresse_ip='127.0.0.1',
            )
            AuditLog.objects.filter(pk=log.pk).update(date_action=now - timedelta(hours=len(specs) - i))

        for decision in DecisionCredit.objects.select_related('id_demande')[:10]:
            agent = decision.id_agent or users[TEL_AGENT1]
            AuditLog.objects.create(
                id_utilisateur=agent,
                action='credit.decision',
                details=(
                    f"Décision {decision.decision} — demande #{decision.id_demande_id} "
                    f"(score {decision.score_global}, auto={decision.is_automatic})"
                ),
                adresse_ip='10.0.0.50',
            )
        self.stdout.write(f'  [OK] {AuditLog.objects.count()} entrées journal audit')

    # ------------------------------------------------------------------ #
    #  RÉSUMÉ                                                              #
    # ------------------------------------------------------------------ #
    def _print_summary(self, users):
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== Seed terminé — Simbisa Demo ==='))
        self.stdout.write(f'Mot de passe commun : {DEMO_PASSWORD}')
        self.stdout.write('')
        self.stdout.write('Staff :')
        staff_info = [
            ('Administrateur',        TEL_ADMIN),
            ('Agent crédit (Gombe)',  TEL_AGENT1),
            ('Agent crédit (Limete)', TEL_AGENT2),
            ('Agent crédit (Bandal)', TEL_AGENT3),
            ('Responsable crédit',    TEL_MANAGER),
            ('Analyste risque',       TEL_ANALYSTE),
            ('Auditeur',              TEL_AUDITEUR),
        ]
        for role, tel in staff_info:
            user = users.get(tel)
            uid = f'id={user.pk}' if user else '?'
            self.stdout.write(f'  {role:30s} {tel}  [{uid}]')
        self.stdout.write('')
        self.stdout.write('Agents de crédit et leurs IDs :')
        for tel in [TEL_AGENT1, TEL_AGENT2, TEL_AGENT3]:
            user = users.get(tel)
            if user:
                self.stdout.write(self.style.SUCCESS(f'  id={user.pk:3d}  {user.prenom} {user.nom}  {tel}  (commune: {user.commune_kinshasa or "—"})'))
        self.stdout.write('')
        self.stdout.write(f'Clients : {len(CLIENT_SPECS)} comptes demo')
        self.stdout.write('  Niveaux : Standard / Pro / Pro+ / Premium')
        self.stdout.write('  Opérateurs MM : M-Pesa (081-085), Orange (086-089), Airtel (097-099), Africell (090)')
        self.stdout.write('')
        self.stdout.write('Login: POST /api/v1/auth/login/')
        self.stdout.write('Docs: /api/docs/')


def _random_profession():
    return random.choice([
        'Commerçant', 'Fonctionnaire', 'Entrepreneur', 'Enseignant',
        'Médecin', 'Chauffeur', 'Artisan', 'Agriculteur', 'Informaticien', 'Comptable',
    ])
