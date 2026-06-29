"""
Script one-shot pour charger la politique Rawbank dans la base RAG.
Exécution : python Backend/data/load_policy_documents.py
(depuis la racine du projet, avec le venv activé et Django configuré)

Ou depuis le shell Django :
    python manage.py shell < Backend/data/load_policy_documents.py
"""
import os
import sys
import django

# --- Setup Django ---
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.rag.models import VectorDocument

# Chaque entrée = un chunk de document (meilleurs embeddings que tout en un bloc)
DOCUMENTS = [
    {
        'title': 'Politique Rawbank — Éligibilité et conditions accès micro-crédit',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
ÉLIGIBILITÉ MICRO-CRÉDIT SIMBISA — RAWBANK v4.2 (2025)

Conditions générales :
- Compte actif Rawbank depuis au moins 3 mois
- Âge 18 à 65 ans révolus
- Résident RDC
- Pas de défaut actif ou crédit en cours sur Simbisa
- KYC valide (CNI, Passeport, Permis ou Carte réfugié)

KYC obligatoire avant tout décaissement — valable 24 mois. Contrôle OFAC/ONU/UE inclus.

Exclusions automatiques :
- Score IA < 25/100 → rejet automatique, aucun recours immédiat
- Compte suspendu pour activité suspecte
- Dette impayée Rawbank > 30 jours
- Procédure judiciaire / faillite
- Mineurs et personnes frappées d'incapacité légale
        """.strip(),
    },
    {
        'title': 'Politique Rawbank — Plafonds de crédit par niveau de compte',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
PLAFONDS DE CRÉDIT SELON NIVEAU DE COMPTE — RAWBANK SIMBISA v4.2

Montants autorisés :
- Standard : 50 à 300 USD, durée 1–6 mois
- Pro      : 50 à 700 USD, durée 1–9 mois
- Pro+     : 50 à 1 000 USD, durée 1–12 mois
- Premium  : 50 à 1 500 USD, durée 1–12 mois

Le plafond du niveau de compte est contraignant : même avec un excellent score,
un client Standard ne peut obtenir plus de 300 USD.

Devise : USD uniquement. Remboursement possible en CDF au taux BCC du jour.
        """.strip(),
    },
    {
        'title': 'Politique Rawbank — Taux d\'intérêt et calcul du coût du crédit',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
TAUX D'INTÉRÊT MICRO-CRÉDIT SIMBISA — RAWBANK v4.2

Calcul en deux étapes :

ÉTAPE 1 — Taux de base selon score IA XGBoost :
- Score ≥ 75/100 (faible risque)   → 2,5% mensuel
- Score 60–74/100 (risque modéré)  → 3,0% mensuel
- Score 40–59/100 (zone grise)     → 3,5% mensuel
- Score < 40/100                   → validation agent obligatoire

ÉTAPE 2 — Remise selon niveau de compte :
- Standard → 0% de remise
- Pro      → −0,25% sur le taux de base
- Pro+     → −0,50% sur le taux de base
- Premium  → −0,75% sur le taux de base

Taux plancher : 1,5% mensuel (minimum réglementaire BCC, non dérogeable)
Exemple : Client Pro+, score 80 → 2,5% − 0,5% = 2,0% mensuel

Amortissement linéaire, mensualités constantes. Remboursement anticipé sans pénalité.
        """.strip(),
    },
    {
        'title': 'Politique Rawbank — Seuils de décision scoring et rôles agents',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
SEUILS DE DÉCISION SCORING — RAWBANK SIMBISA v4.2

Score ≥ 60/100    → Approbation automatique, décaissement sans intervention humaine
Score 40–59/100   → Zone grise : revue obligatoire par un agent de crédit
Score 25–39/100   → Validation manager requise (exception crédit)
Score < 25/100    → Rejet automatique immédiat

Le moteur IA (XGBoost) fournit :
- Un score global 0–100 (probabilité de remboursement)
- Les 5 facteurs SHAP les plus influents (positif/négatif)

Variables du modèle : historique remboursements, ancienneté compte, régularité transactions,
ratio montant/revenu, KYC, Mobile Money, profession, épargne Simbisa.

Rôles :
- Agent    : valide KYC, revue dossiers zone grise (40–59)
- Manager  : valide exceptions (25–39), gère plafonds par zone géographique
- Analyste : surveille performance modèle, ajuste règles métier
- Auditeur : conformité décisions, rapports BCC
        """.strip(),
    },
    {
        'title': 'Politique Rawbank — Remboursement, pénalités et promotion de niveau',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
REMBOURSEMENT ET NIVEAUX DE COMPTE — RAWBANK SIMBISA v4.2

REMBOURSEMENT :
- Mobile Money : Airtel Money, M-Pesa, Orange Money (numéro enregistré)
- Virement Rawbank ou versement agence
- Retard 1–7j : notification, aucune pénalité
- Retard 8–30j : pénalité 0,5% du capital restant par semaine
- Retard > 30j : signalement bureau crédit BCC, blocage nouveaux crédits
- Retard > 90j : transfert contentieux, poursuites possibles

PROMOTION DE NIVEAU (évaluation trimestrielle automatique) :
Standard → Pro   : 1 crédit remboursé sans incident + ancienneté 6 mois + score ≥ 55
Pro → Pro+       : 2 crédits remboursés + ancienneté 12 mois + score ≥ 65 + épargne active
Pro+ → Premium   : 4 crédits remboursés + ancienneté 24 mois + score ≥ 75 + total ≥ 2 000 USD

RÉTROGRADATION : incident > 30 jours → perte d'un niveau automatique.

ÉPARGNE VIRTUELLE :
- Taux 4% annuel sur solde maintenu ≥ 30 jours
- Améliore le score IA (facteur comportemental positif)
- Peut servir de garantie partielle pour dossiers zone grise
        """.strip(),
    },
    {
        'title': 'Politique Rawbank — Conformité BCC, RGPD-RDC et sécurité',
        'source': 'rawbank_politique_microcredit_v4.2',
        'content': """
CONFORMITÉ ET SÉCURITÉ — RAWBANK SIMBISA v4.2

CADRE RÉGLEMENTAIRE :
- Circulaire BCC N°04/2023 : financement inclusif et micro-crédit
- Loi N°004/2002 : Code des investissements RDC
- Directives FATF/GAFI : LBC/FT (lutte contre blanchiment/financement terrorisme)
- RGPD-RDC : protection données personnelles clients

DROITS DES CLIENTS (décisions automatiques) :
- Droit d'accès aux données traitées
- Droit de correction des données inexactes
- Droit d'opposition au traitement automatisé
- Droit à l'information sur le fondement d'une décision défavorable

TRAÇABILITÉ : Toute décision journalisée pendant 7 ans (horodatage, score, SHAP, agent, version modèle).

SÉCURITÉ PLATEFORME :
- JWT access (30 min) + refresh (7 jours)
- MFA OTP e-mail (obligatoire agents/managers, optionnel clients)
- TLS 1.3 sur toutes les communications
- RBAC (6 rôles : Client, Agent, Manager, Analyste, Admin, Auditeur)
- Contrôle listes sanctions OFAC/ONU/UE lors du KYC
        """.strip(),
    },
]


def main():
    created = 0
    skipped = 0

    for doc_data in DOCUMENTS:
        obj, is_new = VectorDocument.objects.get_or_create(
            title=doc_data['title'],
            defaults={
                'content': doc_data['content'],
                'source': doc_data['source'],
                'document_type': 'policy',
            }
        )
        if is_new:
            created += 1
            print(f"  ✓ Créé : {obj.title[:60]}...")
        else:
            skipped += 1
            print(f"  — Existant : {obj.title[:60]}...")

    print(f"\n{created} document(s) créé(s), {skipped} déjà existant(s).")
    print("\nPour générer les embeddings :")
    print("  python manage.py rag_embed_documents --type policy")
    print("  python manage.py rag_embed_documents --type policy --force  (recalcule tout)")


if __name__ == '__main__':
    main()
