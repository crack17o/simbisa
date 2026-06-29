"""
Script de seed — données de démonstration Simbisa FinTech
Crée : rôles, utilisateurs staff, clients, wallets, épargnes, crédits, scores

Exécution sur le VPS :
    docker compose exec api python data/seed_demo.py
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from django.utils import timezone
from apps.authentication.models import Role, Utilisateur
from apps.clients.models import Client, Identite
from apps.wallets.models import WalletRawbank, WalletTransaction, MobileMoneyAccount
from apps.savings.models import CompteEpargne, OperationEpargne
from apps.credits.models import DemandeCredit, Credit, Echeance, Remboursement
from apps.scoring.models import ScoreIA, DecisionCredit

random.seed(42)

# ── Helpers ────────────────────────────────────────────────────────────────────

def create_user(telephone, nom, postnom, prenom, email, role_nom, password='Simbisa2025!', **kwargs):
    if Utilisateur.objects.filter(telephone=telephone).exists():
        u = Utilisateur.objects.get(telephone=telephone)
        print(f'  — Existant : {u}')
        return u
    role, _ = Role.objects.get_or_create(nom_role=role_nom)
    u = Utilisateur.objects.create_user(
        telephone=telephone, password=password,
        nom=nom, postnom=postnom, prenom=prenom,
        email=email, role=role, **kwargs
    )
    print(f'  ✓ Créé : {u}')
    return u


def add_wallet_tx(wallet, type_tx, montant, mode):
    solde_avant = wallet.solde
    if type_tx == 'depot':
        wallet.solde += montant
    else:
        wallet.solde = max(Decimal('0'), wallet.solde - montant)
    wallet.save(update_fields=['solde'])
    WalletTransaction.objects.create(
        wallet=wallet,
        type_transaction=type_tx,
        montant=montant,
        solde_avant=solde_avant,
        solde_apres=wallet.solde,
        mode_paiement=mode,
    )


def add_epargne_op(compte, type_op, montant, mode=''):
    solde_avant = compte.solde
    if type_op == 'depot':
        compte.solde += montant
    else:
        compte.solde = max(Decimal('0'), compte.solde - montant)
    compte.save(update_fields=['solde'])
    OperationEpargne.objects.create(
        id_compte_epargne=compte,
        type_operation=type_op,
        montant=montant,
        solde_avant=solde_avant,
        solde_apres=compte.solde,
        mode_paiement=mode,
    )


def make_credit(client, montant_usd, duree, taux, score_val, decision, statut_credit='en_cours',
                agent=None, motif='Fonds de roulement'):
    demande = DemandeCredit.objects.create(
        id_client=client,
        devise='USD',
        montant_demande=Decimal(str(montant_usd)),
        duree_mois=duree,
        motif=motif,
        statut='approuve' if decision == 'approuve' else ('rejete' if decision == 'rejete' else 'en_analyse'),
    )
    niveau = 'faible' if score_val >= 70 else ('moyen' if score_val >= 45 else 'eleve')
    ScoreIA.objects.create(
        id_demande=demande,
        probabilite_defaut=Decimal(str(round((100 - score_val) / 100, 4))),
        niveau_risque=niveau,
        score_normalise=Decimal(str(score_val)),
        modele_utilise='XGBoost_v2',
        shap_values={
            'anciennete_compte': round(random.uniform(0.05, 0.25), 3),
            'regularite_transactions': round(random.uniform(0.03, 0.20), 3),
            'ratio_montant_revenu': round(random.uniform(-0.15, 0.10), 3),
            'historique_remboursements': round(random.uniform(0.02, 0.30), 3),
            'epargne_active': round(random.uniform(0.01, 0.12), 3),
        },
        feature_vector={'score': score_val},
    )
    DecisionCredit.objects.create(
        id_demande=demande,
        id_agent=agent,
        decision=decision,
        score_global=Decimal(str(score_val)),
        is_automatic=(score_val >= 60 or score_val < 25),
        motif='' if decision == 'approuve' else 'Profil de risque insuffisant',
    )
    if decision == 'approuve':
        debut = date.today() - timedelta(days=30 * duree // 2)
        fin = debut + timedelta(days=30 * duree)
        credit = Credit.objects.create(
            id_demande=demande,
            montant_accorde=Decimal(str(montant_usd)),
            taux_interet=Decimal(str(taux)),
            date_debut=debut,
            date_fin=fin,
            statut=statut_credit,
        )
        mensualite = credit.mensualite
        for i in range(duree):
            Echeance.objects.create(
                id_credit=credit,
                montant=mensualite,
                date_echeance=debut + timedelta(days=30 * (i + 1)),
                statut='paye' if statut_credit == 'rembourse' else (
                    'paye' if i < duree // 2 else 'non_paye'
                ),
            )
        if statut_credit == 'rembourse':
            Remboursement.objects.create(
                id_credit=credit,
                montant=credit.montant_accorde,
                mode_paiement='mobile_money',
                reference_transaction=f'REF{credit.pk:06d}',
            )
        return credit
    return None


# ── 1. Rôles ───────────────────────────────────────────────────────────────────
print('\n=== Rôles ===')
for nom in ['Client', 'Agent de crédit', 'Responsable crédit', 'Analyste risque', 'Administrateur', 'Auditeur']:
    r, created = Role.objects.get_or_create(nom_role=nom)
    print(f"  {'✓' if created else '—'} {nom}")


# ── 2. Staff ───────────────────────────────────────────────────────────────────
print('\n=== Utilisateurs staff ===')
agent1 = create_user(
    '0810000001', 'MBEMBA', 'LUZOLO', 'Patrick', 'p.mbemba@rawbank.cd',
    'Agent de crédit', is_staff=False, commune_kinshasa='gombe',
)
agent2 = create_user(
    '0810000002', 'KASONGO', 'MWAMBA', 'Cécile', 'c.kasongo@rawbank.cd',
    'Agent de crédit', is_staff=False, commune_kinshasa='limete',
)
create_user(
    '0810000003', 'DIALLO', 'BAMBA', 'Serge', 's.diallo@rawbank.cd',
    'Responsable crédit', is_staff=True, commune_kinshasa='gombe',
)
create_user(
    '0810000004', 'MULUMBA', '', 'Christine', 'c.mulumba@rawbank.cd',
    'Analyste risque', is_staff=True,
)
create_user(
    '0810000005', 'NKUNKU', '', 'Alain', 'a.nkunku@rawbank.cd',
    'Auditeur', is_staff=True,
)


# ── 3. Clients ─────────────────────────────────────────────────────────────────
print('\n=== Clients ===')

CLIENTS_DATA = [
    # (tel, nom, postnom, prenom, email, naissance, profession, revenu, niveau, commune, agent, kyc_statut)
    ('0897100001', 'KABILA', 'NGOY', 'Jean-Pierre', 'jp.kabila@gmail.com',
     date(1985, 3, 15), 'Commerçant', 450, 'standard', 'ngaliema', agent1, 'valide'),
    ('0897100002', 'MWANGI', 'AUMA', 'Fatou', 'fatou.mwangi@gmail.com',
     date(1992, 7, 22), 'Infirmière', 380, 'standard', 'gombe', agent1, 'valide'),
    ('0897100003', 'LUKUSA', 'TSHIMANGA', 'Théodore', 'theo.lukusa@gmail.com',
     date(1978, 11, 5), 'Mécanicien', 300, 'standard', 'kasa_vubu', agent2, 'en_attente'),
    ('0897100004', 'NTUMBA', 'ILUNGA', 'Mama Grace', 'grace.ntumba@gmail.com',
     date(1988, 1, 30), 'Couturière', 500, 'pro', 'kalamu', agent1, 'valide'),
    ('0897100005', 'BANZA', 'MUKANYA', 'Rodolphe', 'r.banza@gmail.com',
     date(1980, 6, 18), 'Entrepreneur', 900, 'pro', 'limete', agent2, 'valide'),
    ('0897100006', 'TSHISEKEDI', 'MULUMBA', 'Astride', 'a.tshisekedi@gmail.com',
     date(1990, 9, 12), 'Enseignante', 420, 'pro', 'barumbu', agent2, 'valide'),
    ('0897100007', 'MVUMBI', 'LELO', 'Christian', 'christian.mvumbi@gmail.com',
     date(1975, 4, 25), 'Architecte', 1200, 'pro_plus', 'ngaliema', agent1, 'valide'),
    ('0897100008', 'NZEZA', 'KIBAMBE', 'Joëlle', 'joelle.nzeza@gmail.com',
     date(1983, 8, 10), 'Avocate', 1500, 'pro_plus', 'gombe', agent2, 'valide'),
    ('0897100009', 'KAZADI', 'MBUYI', 'Éric', 'eric.kazadi@gmail.com',
     date(1972, 2, 14), 'Médecin', 2200, 'premium', 'gombe', agent1, 'valide'),
    ('0897100010', 'MUAMBA', 'KALOMBO', 'Sandra', 'sandra.muamba@gmail.com',
     date(1979, 12, 3), 'Chef d\'entreprise', 3000, 'premium', 'ngaliema', agent2, 'valide'),
]

clients = []
for (tel, nom, postnom, prenom, email, naissance, profession, revenu, niveau, commune, agent, kyc_st) in CLIENTS_DATA:
    user = create_user(tel, nom, postnom, prenom, email, 'Client')
    if Client.objects.filter(id_utilisateur=user).exists():
        client = Client.objects.get(id_utilisateur=user)
        print(f'  — Client existant : {client}')
    else:
        client = Client.objects.create(
            id_utilisateur=user,
            profession=profession,
            commune_kinshasa=commune,
            date_naissance=naissance,
            revenu_estime_usd=Decimal(str(revenu)),
            revenu_estime_cdf=Decimal(str(revenu * 2800)),
            niveau_compte=niveau,
            niveau_risque='faible' if niveau in ('pro_plus', 'premium') else 'moyen',
            id_agent_assigne=agent,
        )
        print(f'  ✓ Client créé : {client}')

        # KYC
        Identite.objects.create(
            id_client=client,
            type_piece='carte_electeur',
            numero_piece=f'CE{tel[-7:]}',
            date_expiration=date.today() + timedelta(days=365 * 3),
            statut_verification=kyc_st,
            date_verification=timezone.now() if kyc_st == 'valide' else None,
            verified_by=agent if kyc_st == 'valide' else None,
        )

        # Wallets USD + CDF
        wallet_usd = WalletRawbank.objects.create(id_client=client, devise='USD', solde=Decimal('0'))
        wallet_cdf = WalletRawbank.objects.create(id_client=client, devise='CDF', solde=Decimal('0'))

        # Dépôts initiaux
        depot_usd = Decimal(str(round(revenu * random.uniform(0.5, 2.0), 2)))
        add_wallet_tx(wallet_usd, 'depot', depot_usd, 'illicocash')
        add_wallet_tx(wallet_cdf, 'depot', Decimal(str(round(float(depot_usd) * 2800, 2))), 'mpesa')

        # Quelques transactions supplémentaires
        for _ in range(random.randint(2, 5)):
            tx_montant = Decimal(str(round(random.uniform(20, 200), 2)))
            add_wallet_tx(wallet_usd, random.choice(['depot', 'retrait']), tx_montant, 'airtel_money')

        # Mobile Money
        MobileMoneyAccount.objects.create(
            id_client=client,
            operateur=random.choice(['mpesa', 'orange_money', 'airtel_money']),
            numero_telephone=tel,
            devise='CDF',
        )

        # Épargne USD
        epargne = CompteEpargne.objects.create(
            id_client=client,
            devise='USD',
            objectif_montant=Decimal(str(revenu * 3)),
            objectif_description='Fonds d'urgence',
        )
        initial_epargne = Decimal(str(round(revenu * random.uniform(0.1, 0.5), 2)))
        add_epargne_op(epargne, 'depot', initial_epargne, 'illicocash')
        if random.random() > 0.5:
            add_epargne_op(epargne, 'depot', Decimal(str(round(float(initial_epargne) * 0.3, 2))), 'mpesa')

    clients.append(client)


# ── 4. Crédits & Scores ────────────────────────────────────────────────────────
print('\n=== Crédits ===')

if not DemandeCredit.objects.filter(id_client=clients[0]).exists():
    # Standard — 1 crédit approuvé en cours
    make_credit(clients[0], 200, 4, 3.0, 65, 'approuve', 'en_cours', agent1, 'Achat stock')

if not DemandeCredit.objects.filter(id_client=clients[1]).exists():
    # Standard — 1 demande rejetée (score bas)
    make_credit(clients[1], 150, 3, 3.5, 30, 'rejete', motif='Épargne insuffisante')

if not DemandeCredit.objects.filter(id_client=clients[2]).exists():
    # Standard — en analyse (score zone grise)
    make_credit(clients[2], 100, 3, 3.5, 47, 'mise_en_attente', motif='Achat matériel')

if not DemandeCredit.objects.filter(id_client=clients[3]).exists():
    # Pro — 1 crédit remboursé + 1 nouveau
    make_credit(clients[3], 400, 6, 2.75, 72, 'approuve', 'rembourse', agent1, 'Fonds roulement')
    make_credit(clients[3], 500, 6, 2.75, 75, 'approuve', 'en_cours', agent1, 'Extension atelier')

if not DemandeCredit.objects.filter(id_client=clients[4]).exists():
    # Pro — crédit approuvé en cours
    make_credit(clients[4], 600, 9, 2.75, 80, 'approuve', 'en_cours', agent2, 'Équipement')

if not DemandeCredit.objects.filter(id_client=clients[5]).exists():
    # Pro — demande en analyse
    make_credit(clients[5], 300, 6, 3.0, 61, 'approuve', 'en_cours', agent2, 'Formation')

if not DemandeCredit.objects.filter(id_client=clients[6]).exists():
    # Pro+ — 2 crédits remboursés + 1 en cours
    make_credit(clients[6], 700, 9, 2.5, 82, 'approuve', 'rembourse', agent1)
    make_credit(clients[6], 900, 12, 2.25, 84, 'approuve', 'en_cours', agent1, 'Rénovation')

if not DemandeCredit.objects.filter(id_client=clients[7]).exists():
    # Pro+ — crédit en cours
    make_credit(clients[7], 1000, 12, 2.0, 88, 'approuve', 'en_cours', agent2)

if not DemandeCredit.objects.filter(id_client=clients[8]).exists():
    # Premium — historique complet
    make_credit(clients[8], 1200, 12, 2.5, 90, 'approuve', 'rembourse', agent1)
    make_credit(clients[8], 1500, 12, 1.75, 92, 'approuve', 'en_cours', agent1, 'Investissement')

if not DemandeCredit.objects.filter(id_client=clients[9]).exists():
    # Premium — 2 crédits remboursés + gros crédit en cours
    make_credit(clients[9], 1000, 6, 2.5, 88, 'approuve', 'rembourse', agent2)
    make_credit(clients[9], 1500, 12, 1.75, 91, 'approuve', 'rembourse', agent2)
    make_credit(clients[9], 2000, 12, 1.75, 93, 'approuve', 'en_cours', agent2, 'Expansion business')

print('\n✅ Seed terminé.')
print(f'   {Utilisateur.objects.count()} utilisateurs')
print(f'   {Client.objects.count()} clients')
print(f'   {WalletRawbank.objects.count()} wallets')
print(f'   {CompteEpargne.objects.count()} comptes épargne')
print(f'   {DemandeCredit.objects.count()} demandes de crédit')
print(f'   {Credit.objects.count()} crédits')
print(f'\nMot de passe par défaut de tous les comptes : Simbisa2025!')
print(f'Admin : 0899672887 (mot de passe défini lors du createsuperuser)')
