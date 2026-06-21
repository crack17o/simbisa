"""
Peuple la base avec des données de démonstration pour tests REST / futur USSD.

Usage:
    python manage.py migrate
    python manage.py seed_demo
    python manage.py seed_demo --flush   # supprime les données demo avant re-seed
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

DEMO_PASSWORD = 'Test123!'
DEMO_PHONES = [
    '+243900000000',
    '+243900000002',
    '+243900000006',
    '+243900000003',
    '+243900000004',
    '+243900000005',
    '+243900000010',
    '+243900000011',
    '+243900000012',
]


class Command(BaseCommand):
    help = 'Charge rôles, utilisateurs demo, clients, wallets, épargne, crédits et scoring.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Supprime les utilisateurs demo (téléphones +243900000*) avant seed.',
        )
        parser.add_argument(
            '--no-scoring',
            action='store_true',
            help='Ne lance pas le scoring synchrone (plus rapide).',
        )

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
            demandes = self._seed_credits(users)
            self._seed_rag()
            self._seed_scoring_rules()
            self._seed_ussd_pins()
        if not options['no_scoring']:
            self._run_scoring_all()
            self._seed_exceptions(users)
            self._seed_audit_logs(users)
        self._print_summary()

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
        from apps.wallets.models import MobileMoneyAccount

        demo_users = Utilisateur.objects.filter(telephone__in=DEMO_PHONES)
        demo_clients = Client.objects.filter(id_utilisateur__in=demo_users)
        demande_ids = list(
            DemandeCredit.objects.filter(id_client__in=demo_clients).values_list('pk', flat=True)
        )
        if demande_ids:
            DecisionCredit.objects.filter(id_demande_id__in=demande_ids).delete()
            ScoreRegle.objects.filter(id_demande_id__in=demande_ids).delete()
            ScoreMobileMoney.objects.filter(id_demande_id__in=demande_ids).delete()
            ScoreComportemental.objects.filter(id_demande_id__in=demande_ids).delete()
            ScoreIA.objects.filter(id_demande_id__in=demande_ids).delete()
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
        AuditLog.objects.filter(id_utilisateur__in=demo_users).delete()
        deleted, _ = demo_users.delete()
        self.stdout.write(self.style.WARNING(f'Supprimé {deleted} enregistrement(s) demo.'))

    def _seed_roles(self):
        call_command('loaddata', 'roles', verbosity=0)
        self.stdout.write('  [OK] Rôles RBAC')

    def _seed_platform(self):
        from apps.core.models import PlatformConfig
        from apps.core.exchange_rate import set_cdf_per_usd
        admin = None
        config = PlatformConfig.load()
        config.usd_credit_min = Decimal('50.00')
        config.usd_credit_max = Decimal('1500.00')
        config.usd_agent_auto_max = Decimal('400.00')
        config.usd_manager_max = Decimal('1200.00')
        config.save()
        set_cdf_per_usd(2250, user=admin)
        self.stdout.write('  [OK] Taux 2250 CDF + plafonds crédit')

    def _seed_users(self):
        from apps.authentication.models import Role, Utilisateur

        specs = [
            ('+243900000000', 'Administrateur', 'Admin', 'Système', 'Rawbank'),
            ('+243900000002', 'Agent de crédit', 'Agent', 'Crédit', 'Kabongo', 'gombe'),
            ('+243900000006', 'Agent de crédit', 'Grace', 'Limete', 'Mputu', 'limete'),
            ('+243900000003', 'Responsable crédit', 'Responsable', 'Crédit', 'Mukendi'),
            ('+243900000004', 'Analyste risque', 'Analyste', 'Risque', 'Tshilombo'),
            ('+243900000005', 'Auditeur', 'Auditeur', 'Conformité', 'Ilunga'),
            ('+243900000010', 'Client', 'Jean', 'Client', 'Kabila'),
            ('+243900000011', 'Client', 'Marie', 'Nouvelle', 'Mbuyi'),
            ('+243900000012', 'Client', 'Paul', 'CDF', 'Mutombo'),
        ]
        users = {}
        for spec in specs:
            tel, role_name, prenom, postnom, nom = spec[:5]
            commune = spec[5] if len(spec) > 5 else ''
            role = Role.objects.get(nom_role=role_name)
            user, created = Utilisateur.objects.get_or_create(
                telephone=tel,
                defaults={
                    'role': role,
                    'prenom': prenom,
                    'postnom': postnom,
                    'nom': nom,
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
            if commune and role_name == 'Agent de crédit' and user.commune_kinshasa != commune:
                user.commune_kinshasa = commune
                user.save(update_fields=['commune_kinshasa'])
            users[tel] = user
        self.stdout.write(f'  [OK] {len(users)} utilisateurs (mot de passe : {DEMO_PASSWORD})')
        return users

    def _seed_clients(self, users):
        from apps.clients.models import Client, Identite
        from apps.clients.services.territoire import assign_client_to_agent
        from apps.wallets.views import ensure_client_wallets

        agent_gombe = users['+243900000002']
        today = timezone.now().date()

        client_specs = [
            ('+243900000010', 'Commerçant', 'Av. du Commerce', 'gombe', date(1992, 3, 15), '500', '1200000', 'moyen', True),
            ('+243900000011', 'Étudiante', 'Quartier Industriel', 'limete', date(2000, 7, 22), '0', '0', 'non_evalue', False),
            ('+243900000012', 'Fonctionnaire', 'Binza Pigeon', 'ngaliema', date(1988, 11, 5), '800', '2000000', 'faible', True),
        ]
        for tel, profession, adresse, commune, dob, rev_usd, rev_cdf, risque, kyc in client_specs:
            user = users[tel]
            if not hasattr(user, 'client_profile'):
                client = Client.objects.create(
                    id_utilisateur=user,
                    profession=profession,
                    adresse=adresse,
                    date_naissance=dob,
                    revenu_estime_usd=Decimal(rev_usd),
                    revenu_estime_cdf=Decimal(rev_cdf),
                    niveau_risque=risque,
                )
            else:
                client = user.client_profile
                Client.objects.filter(pk=client.pk).update(
                    profession=profession,
                    adresse=adresse,
                    revenu_estime_usd=Decimal(rev_usd),
                    revenu_estime_cdf=Decimal(rev_cdf),
                    niveau_risque=risque,
                )
                client.refresh_from_db()
            client.commune_kinshasa = commune
            client.save(update_fields=['commune_kinshasa', 'updated_at'])
            agent_map = {'gombe': '+243900000002', 'limete': '+243900000006'}
            tel_agent = agent_map.get(commune)
            if tel_agent and tel_agent in users:
                assign_client_to_agent(client, users[tel_agent])
            ensure_client_wallets(client)

            if kyc:
                Identite.objects.update_or_create(
                    numero_piece=f'KYC-{tel[-6:]}',
                    defaults={
                        'id_client': client,
                        'type_piece': 'carte_electeur',
                        'date_expiration': today + timedelta(days=365 * 3),
                        'statut_verification': 'valide',
                        'date_verification': timezone.now(),
                        'verified_by': users.get('+243900000002') if commune == 'gombe' else users.get('+243900000006', agent_gombe),
                    },
                )
        self.stdout.write('  [OK] Profils clients + communes + agents + KYC + wallets')

    def _seed_wallets_and_mm(self, users):
        from apps.wallets.models import WalletRawbank, MobileMoneyAccount, MobileMoneyTransaction

        jean = users['+243900000010'].client_profile
        paul = users['+243900000012'].client_profile
        now = timezone.now()

        for client, balances in [
            (jean, {'USD': '250.00', 'CDF': '500000.00'}),
            (paul, {'USD': '120.00', 'CDF': '800000.00'}),
        ]:
            for devise, solde in balances.items():
                WalletRawbank.objects.filter(id_client=client, devise=devise).update(
                    solde=Decimal(solde)
                )

        mm_jean, _ = MobileMoneyAccount.objects.get_or_create(
            id_client=jean,
            operateur='orange_money',
            numero_telephone='+243900000010',
            devise='CDF',
            defaults={'is_active': True},
        )
        for i, (typ, montant) in enumerate([
            ('reception', '150000'), ('reception', '200000'), ('transfert_sortant', '80000'),
            ('depot', '100000'), ('reception', '180000'),
        ]):
            dt = now - timedelta(days=30 - i * 5)
            if not MobileMoneyTransaction.objects.filter(
                id_mm_account=mm_jean,
                reference_externe=f'SEED-MM-{i}',
            ).exists():
                MobileMoneyTransaction.objects.create(
                    id_mm_account=mm_jean,
                    devise='CDF',
                    type_transaction=typ,
                    montant=Decimal(montant),
                    solde_apres=Decimal('400000') + Decimal(i * 10000),
                    date_transaction=dt,
                    reference_externe=f'SEED-MM-{i}',
                    description='Transaction demo seed',
                )

        MobileMoneyAccount.objects.get_or_create(
            id_client=jean,
            operateur='mpesa',
            numero_telephone='+243900000010',
            devise='USD',
            defaults={'is_active': True},
        )
        MobileMoneyAccount.objects.get_or_create(
            id_client=paul,
            operateur='airtel_money',
            numero_telephone='+243900000012',
            devise='CDF',
            defaults={'is_active': True},
        )
        mm_paul, _ = MobileMoneyAccount.objects.get_or_create(
            id_client=paul,
            operateur='orange_money',
            numero_telephone='+243900000012',
            devise='CDF',
            defaults={'is_active': True},
        )
        for i, (typ, montant) in enumerate([
            ('reception', '250000'), ('transfert_sortant', '120000'), ('depot', '80000'),
        ]):
            ref = f'SEED-MM-PAUL-{i}'
            if not MobileMoneyTransaction.objects.filter(reference_externe=ref).exists():
                MobileMoneyTransaction.objects.create(
                    id_mm_account=mm_paul,
                    devise='CDF',
                    type_transaction=typ,
                    montant=Decimal(montant),
                    solde_apres=Decimal('600000') + Decimal(i * 15000),
                    date_transaction=now - timedelta(days=20 - i * 4),
                    reference_externe=ref,
                    description='Transaction demo Paul',
                )
        self.stdout.write('  [OK] Soldes wallets + historique Mobile Money (Jean & Paul)')

    def _seed_savings(self, users):
        from apps.savings.models import CompteEpargne

        jean = users['+243900000010'].client_profile
        paul = users['+243900000012'].client_profile

        for client, devise, solde, obj, desc in [
            (jean, 'USD', '75.00', '500.00', 'Fonds urgence USD'),
            (jean, 'CDF', '150000.00', '500000.00', 'Stock boutique'),
            (paul, 'CDF', '300000.00', '1000000.00', 'Épargne Paul'),
        ]:
            compte, created = CompteEpargne.objects.get_or_create(
                id_client=client,
                devise=devise,
                defaults={'objectif_description': desc, 'is_active': True},
            )
            compte.solde = Decimal(solde)
            compte.objectif_montant = Decimal(obj)
            compte.is_active = True
            compte.save()
        self.stdout.write('  [OK] Comptes épargne USD/CDF')

    def _seed_savings_operations(self, users):
        from apps.savings.models import CompteEpargne, OperationEpargne

        specs = [
            ('+243900000010', 'USD', [
                ('depot', '25.00'), ('depot', '30.00'), ('depot', '20.00'),
            ]),
            ('+243900000010', 'CDF', [
                ('depot', '50000.00'), ('depot', '60000.00'), ('depot', '40000.00'),
            ]),
            ('+243900000012', 'CDF', [
                ('depot', '100000.00'), ('depot', '80000.00'), ('depot', '120000.00'),
            ]),
        ]
        now = timezone.now()
        count = 0
        for tel, devise, ops in specs:
            client = users[tel].client_profile
            compte = CompteEpargne.objects.filter(id_client=client, devise=devise).first()
            if not compte:
                continue
            if compte.operations.exists():
                continue
            solde = Decimal('0')
            for i, (typ, montant) in enumerate(ops):
                m = Decimal(montant)
                solde_avant = solde
                solde = solde + m if typ == 'depot' else solde - m
                OperationEpargne.objects.create(
                    id_compte_epargne=compte,
                    type_operation=typ,
                    montant=m,
                    solde_avant=solde_avant,
                    solde_apres=solde,
                    description=f'Seed épargne {typ} #{i + 1}',
                )
                count += 1
            compte.solde = solde
            compte.save(update_fields=['solde', 'updated_at'])
        self.stdout.write(f'  [OK] {count} opérations épargne (historique)')

    def _seed_credits(self, users):
        from apps.credits.models import DemandeCredit, Credit, Remboursement, Echeance

        jean = users['+243900000010'].client_profile
        marie = users['+243900000011'].client_profile
        paul = users['+243900000012'].client_profile
        demandes = []

        credit_specs = [
            (jean, Decimal('400.00'), 'USD', 6, 'Achat stock USD — boutique Gombe', 'en_analyse'),
            (jean, Decimal('500000.00'), 'CDF', 3, 'Équipement boutique CDF', 'en_analyse'),
            (jean, Decimal('150.00'), 'USD', 4, 'Ancienne demande refusée (seed)', 'rejete'),
            (marie, Decimal('200.00'), 'USD', 3, 'Premier crédit — sans KYC', 'en_analyse'),
            (paul, Decimal('900.00'), 'USD', 6, 'Extension activité — dossier sensible', 'en_analyse'),
            (paul, Decimal('1800000.00'), 'CDF', 4, 'Matériel bureau Lubumbashi', 'en_analyse'),
        ]
        for client, montant, devise, duree, motif, statut in credit_specs:
            d, _ = DemandeCredit.objects.update_or_create(
                id_client=client,
                montant_demande=montant,
                devise=devise,
                defaults={'duree_mois': duree, 'motif': motif, 'statut': statut},
            )
            if statut == 'en_analyse':
                demandes.append(d)

        # Crédit déjà approuvé (historique) pour Paul
        d_paul, _ = DemandeCredit.objects.update_or_create(
            id_client=paul,
            montant_demande=Decimal('300.00'),
            devise='USD',
            defaults={
                'duree_mois': 4,
                'motif': 'Crédit consommation — en cours de remboursement',
                'statut': 'approuve',
            },
        )
        credit, _ = Credit.objects.get_or_create(
            id_demande=d_paul,
            defaults={
                'montant_accorde': Decimal('280.00'),
                'taux_interet': Decimal('3.00'),
                'date_debut': date.today() - timedelta(days=60),
                'date_fin': date.today() + timedelta(days=60),
                'statut': 'en_cours',
            },
        )
        if not credit.echeances.exists():
            mensualite = credit.mensualite
            for i in range(1, d_paul.duree_mois + 1):
                Echeance.objects.create(
                    id_credit=credit,
                    montant=mensualite,
                    date_echeance=date.today() - timedelta(days=60) + timedelta(days=30 * i),
                    statut='paye' if i == 1 else 'non_paye',
                    montant_paye=mensualite if i == 1 else Decimal('0'),
                )
        if not Remboursement.objects.filter(id_credit=credit).exists():
            Remboursement.objects.create(
                id_credit=credit,
                montant=Decimal('50.00'),
                mode_paiement='mobile_money',
                reference_transaction='SEED-REM-PAUL-1',
            )

        # Décision manuelle historique (Jean — demande refusée)
        from apps.scoring.models import DecisionCredit
        d_rejet = DemandeCredit.objects.filter(
            id_client=jean, montant_demande=Decimal('150.00'), devise='USD',
        ).first()
        if d_rejet:
            agent = users['+243900000002']
            DecisionCredit.objects.update_or_create(
                id_demande=d_rejet,
                defaults={
                    'id_agent': agent,
                    'decision': 'rejete',
                    'score_global': Decimal('42.00'),
                    'motif': 'Historique seed — montant incompatible avec revenus déclarés',
                    'explication_ia': 'Score comportemental insuffisant au moment de la demande.',
                    'is_automatic': False,
                },
            )

        self.stdout.write(f'  [OK] {len(credit_specs) + 1} demandes crédit + crédit actif Paul')
        return demandes

    def _seed_ussd_pins(self):
        from apps.authentication.models import Utilisateur
        from apps.ussd.models import UssdProfile
        from django.conf import settings

        pin = getattr(settings, 'USSD_DEFAULT_PIN', '0000')
        count = 0
        for tel in ('+243900000010', '+243900000011', '+243900000012'):
            try:
                client = Utilisateur.objects.get(telephone=tel).client_profile
                profile, _ = UssdProfile.objects.get_or_create(client=client)
                profile.set_pin(pin)
                count += 1
            except Exception:
                pass
        self.stdout.write(f'  [OK] PIN USSD "{pin}" pour {count} client(s)')

    def _seed_rag(self):
        from apps.rag.models import VectorDocument

        docs = [
            ('Politique micro-crédit Rawbank', 'policy',
             'Les micro-crédits Simbisa vont de 50 à 1500 USD. KYC obligatoire. Âge 20-60 ans.'),
            ('Procédure KYC', 'policy',
             'Pièce d\'identité valide requise : carte électeur, passeport ou permis.'),
        ]
        for title, doc_type, content in docs:
            VectorDocument.objects.update_or_create(
                title=title,
                defaults={'content': content, 'document_type': doc_type, 'source': 'seed'},
            )
        self.stdout.write('  [OK] Documents RAG')

        try:
            from apps.rag.services.embedder import DocumentEmbedder
            embedder = DocumentEmbedder()
            if embedder.is_available():
                result = embedder.embed_all(document_type='policy', force=True)
                self.stdout.write(f'  [OK] Embeddings RAG ({result})')
            else:
                self.stdout.write('  [SKIP] Embeddings RAG (clé API absente)')
        except Exception as exc:
            self.stdout.write(f'  [WARN] Embeddings RAG non générés : {exc}')

    def _seed_scoring_rules(self):
        from apps.scoring.models import ScoringRule

        rules = [
            ('kyc', 'KYC obligatoire', 'Pièce d\'identité validée requise', 'kyc'),
            ('age', 'Âge éligible (20-60 ans)', 'Conformité BCC micro-crédit', 'general'),
            ('credit_actif', 'Un seul crédit actif', 'Pas de cumul de crédits en cours', 'general'),
            ('anciennete', 'Ancienneté plateforme ≥ 30j', 'Malus si non respecté (-20 pts)', 'comportement'),
            ('montant', 'Plage 50–1 500 USD', 'Limites Rawbank v4.2', 'montant'),
        ]
        for code, label, desc, category in rules:
            ScoringRule.objects.update_or_create(
                code=code,
                defaults={'label': label, 'description': desc, 'category': category, 'is_active': True},
            )
        self.stdout.write('  [OK] Règles scoring (module risque)')

    def _run_scoring_all(self):
        from apps.scoring.services import ScoringOrchestrator
        from apps.credits.models import DemandeCredit

        demandes = DemandeCredit.objects.filter(statut='en_analyse').select_related('id_client')
        if not demandes.exists():
            self.stdout.write('  [--] Aucune demande en_analyse a scorer')
            return
        for demande in demandes:
            try:
                result = ScoringOrchestrator(demande).run()
                self.stdout.write(
                    f'  [OK] Scoring #{demande.pk} ({demande.devise} {demande.montant_demande}) '
                    f"-> {result.get('decision')} ({result.get('score_global')})"
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERR] Scoring #{demande.pk}: {e}'))

    def _seed_exceptions(self, users):
        from apps.credits.models import DemandeCredit, CreditException

        paul = users['+243900000012'].client_profile
        agent = users['+243900000002']
        manager = users['+243900000003']

        demande_sensible = DemandeCredit.objects.filter(
            id_client=paul, montant_demande=Decimal('900.00'), devise='USD',
        ).first()
        if demande_sensible and not CreditException.objects.filter(
            id_demande=demande_sensible, type_exception='plafond',
        ).exists():
            CreditException.objects.create(
                id_demande=demande_sensible,
                id_client=paul,
                type_exception='plafond',
                motif='Montant 900 USD — dépasse plafond agent auto (400 USD)',
                statut='ouverte',
                observation='Escalade responsable crédit requise.',
                created_by=agent,
            )

        demande_cdf = DemandeCredit.objects.filter(
            id_client=paul, montant_demande=Decimal('1800000.00'), devise='CDF',
        ).first()
        if demande_cdf and not CreditException.objects.filter(
            id_demande=demande_cdf, type_exception='delai',
        ).exists():
            CreditException.objects.create(
                id_demande=demande_cdf,
                id_client=paul,
                type_exception='delai',
                motif='Demande délai de grâce sur première échéance',
                statut='approuvee',
                observation='Exception validée en seed demo.',
                created_by=agent,
                resolved_by=manager,
                resolved_at=timezone.now() - timedelta(days=2),
            )
        count = CreditException.objects.filter(id_client__in=[paul]).count()
        self.stdout.write(f'  [OK] {count} exception(s) crédit (manager)')

    def _seed_audit_logs(self, users):
        from apps.audit.models import AuditLog
        from apps.scoring.models import DecisionCredit

        if AuditLog.objects.filter(action='credit.scoring', details='Scoring automatique demandes demo').exists():
            self.stdout.write('  [--] Journal audit seed deja present')
            return

        now = timezone.now()
        specs = [
            (users['+243900000010'], 'auth.login', 'Connexion client Jean — Kinshasa'),
            (users['+243900000002'], 'auth.login', 'Connexion agent crédit Kabongo'),
            (users['+243900000002'], 'kyc.validate', 'Validation KYC Jean Kabila'),
            (users['+243900000002'], 'credit.scoring', 'Scoring automatique demandes demo'),
            (users['+243900000003'], 'manager.exception', 'Revue exception plafond Paul 900 USD'),
            (users['+243900000005'], 'audit.view', 'Consultation journal décisions crédit'),
        ]
        for i, (user, action, details) in enumerate(specs):
            log = AuditLog.objects.create(
                id_utilisateur=user,
                action=action,
                details=details,
                adresse_ip='127.0.0.1',
            )
            AuditLog.objects.filter(pk=log.pk).update(
                date_action=now - timedelta(hours=len(specs) - i),
            )

        for decision in DecisionCredit.objects.select_related('id_demande')[:8]:
            agent = decision.id_agent or users['+243900000002']
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

    def _run_scoring(self, demandes):
        from apps.scoring.services import ScoringOrchestrator
        from apps.credits.models import DemandeCredit

        for d in demandes:
            demande = DemandeCredit.objects.select_related('id_client').get(pk=d.pk)
            try:
                result = ScoringOrchestrator(demande).run()
                self.stdout.write(
                    f'  [OK] Scoring demande #{demande.pk} ({demande.devise}) '
                    f"-> {result.get('decision')} ({result.get('score_global')})"
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERR] Scoring #{demande.pk}: {e}'))

    def _print_summary(self):
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== Seed terminé ==='))
        self.stdout.write(f'Mot de passe commun : {DEMO_PASSWORD}')
        self.stdout.write('')
        self.stdout.write('Comptes :')
        lines = [
            ('Administrateur', '+243900000000', 'PATCH /settings/admin/taux-change/'),
            ('Agent crédit', '+243900000002', 'Demandes, stats, dossiers sensibles'),
            ('Responsable crédit', '+243900000003', 'Exceptions, plafonds, dashboard'),
            ('Analyste risque', '+243900000004', 'Règles scoring, modèles IA'),
            ('Auditeur', '+243900000005', 'Décisions crédit + journal audit'),
            ('Client complet (Jean)', '+243900000010', 'KYC OK, wallets, MM, 2 demandes scorées'),
            ('Client sans KYC (Marie)', '+243900000011', 'Demande credit -> rejet regles KYC'),
            ('Client CDF (Paul)', '+243900000012', 'Crédit actif + dossiers sensibles 900 USD'),
        ]
        for role, tel, note in lines:
            self.stdout.write(f'  - {role}: {tel} - {note}')
        self.stdout.write('')
        self.stdout.write('Login: POST /api/v1/auth/login/')
        self.stdout.write('Doc: backend/docs/SEEDERS.md | USSD: backend/docs/USSD_INTEGRATION.md')
