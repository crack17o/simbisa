# Référence API Simbisa — Rawbank

Documentation complète de l’API REST pour l’intégration **frontend web** (React/Vite) et **mobile** (Flutter).

**Version API** : `v1`  
**Base URL (dev)** : `http://localhost:8000`  
**Préfixe** : `/api/v1/`  
**Base de données** : MySQL 8 (`utf8mb4`)

---

## Table des matières

1. [Informations générales](#1-informations-générales)
2. [Devises (CDF / USD)](#2-devises-cdf--usd)
3. [Authentification JWT](#3-authentification-jwt)
4. [Rôles RBAC](#4-rôles-rbac)
5. [Endpoints — Authentification](#5-endpoints--authentification)
6. [Endpoints — Clients & KYC](#6-endpoints--clients--kyc)
7. [Endpoints — Wallets](#7-endpoints--wallets)
8. [Endpoints — Épargne](#8-endpoints--épargne)
9. [Endpoints — Crédits](#9-endpoints--crédits)
10. [Endpoints — Scoring](#10-endpoints--scoring)
11. [Endpoints — RAG](#11-endpoints--rag)
12. [Endpoints — Audit](#12-endpoints--audit)
13. [Endpoints — Configuration (taux de change)](#13-endpoints--configuration-taux-de-change)
14. [Santé & documentation interactive](#14-santé--documentation-interactive)
15. [Récapitulatif des routes](#15-récapitulatif-des-routes)
16. [Intégration frontend](#16-intégration-frontend)
17. [Codes HTTP & erreurs métier](#17-codes-http--erreurs-métier)

---

## 1. Informations générales

### Format

| Élément | Valeur |
|---------|--------|
| Content-Type requêtes | `application/json` (sauf upload KYC : `multipart/form-data`) |
| Content-Type réponses | `application/json` |
| Encodage | UTF-8 |
| Fuseau horaire serveur | `Africa/Kinshasa` |
| Pagination listes | `?page=1` — 20 éléments par page |

### Enveloppe de réponse — succès

```json
{
  "success": true,
  "message": "Message optionnel",
  "data": { }
}
```

Les vues `ListAPIView` avec pagination renvoient dans `data` :

```json
{
  "count": 42,
  "next": "http://localhost:8000/api/v1/clients/?page=2",
  "previous": null,
  "results": [ ]
}
```

### Enveloppe de réponse — erreur

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Résumé lisible",
    "details": { }
  }
}
```

### Rate limiting

| Scope | Limite |
|-------|--------|
| Anonyme | 20 req/min |
| Utilisateur authentifié | 200 req/min |
| Auth (`/auth/login`, `/auth/register`) | 10 req/min |
| Scoring (`/scoring/.../trigger/`) | 30 req/min |

### CORS (frontend web)

Variable `.env` backend :

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Le mobile Flutter n’est pas limité par CORS ; utilisez l’IP LAN du poste dev ou `10.0.2.2` (émulateur Android).

---

## 2. Devises (CDF / USD)

Chaque client dispose de **deux comptes** pour toutes les opérations financières :

| Code | Libellé | Symbole affiché |
|------|---------|-----------------|
| `USD` | Dollar américain | `$` |
| `CDF` | Franc congolais | `FC` |

### Où la devise s’applique

| Ressource | Champ `devise` | Comportement |
|-----------|----------------|--------------|
| Wallet Rawbank | Oui | 2 wallets par client (`USD` + `CDF`), créés à l’inscription |
| Compte épargne | Oui | Plusieurs comptes possibles, filtrables par devise |
| Compte Mobile Money | Oui | Un compte MM par opérateur **et** par devise |
| Demande de crédit | Oui | Montant et scoring dans la devise choisie |
| Crédit / remboursement | Hérité | Même devise que la demande |
| Revenus client | `revenu_estime_usd` / `revenu_estime_cdf` | Séparés dans le profil |

### Taux de change USD → CDF

| Élément | Valeur |
|---------|--------|
| Taux initial (Rawbank) | **2250 CDF = 1 USD** |
| Stockage | Table MySQL `platform_config` |
| Modification | **Administrateur** via API ou Django Admin |
| Lecture | Tout utilisateur connecté (`GET /settings/taux-change/`) |

Les plages crédit **CDF** sont recalculées automatiquement :  
`min_cdf = 50 × cdf_per_usd`, `max_cdf = 1500 × cdf_per_usd`.

Exemple à 2250 : FC112 500 – FC3 375 000.

### Plages de crédit par devise

| Devise | Minimum | Maximum |
|--------|---------|---------|
| `USD` | $50 | $1 500 |
| `CDF` | Dynamique (voir taux admin) | Dynamique |

### Règle crédit actif

Un client peut avoir **un crédit en cours en USD** et **un crédit en cours en CDF** simultanément. Un second crédit dans la **même** devise est refusé (`active_credit_exists`).

### Score client affiché

`GET /api/v1/scoring/me/` renvoie :

**`score_client` = moyenne (`score_usd` + `score_cdf`) / 2**

Chaque score par devise provient de la dernière demande scorée, ou d’un **score de profil** (MM + comportemental) si aucune demande n’existe pour cette devise.

---

## 3. Authentification JWT

### Header sur toutes les routes protégées

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Tokens

| Token | Durée (défaut `.env`) | Usage |
|-------|------------------------|--------|
| `access` | `JWT_ACCESS_MINUTES` = 30 min | Chaque requête API |
| `refresh` | `JWT_REFRESH_DAYS` = 7 jours | Renouvellement + blacklist à la déconnexion |

### Claims JWT personnalisés

`telephone`, `role`, `full_name`, `mfa_enabled`

### Flux recommandé

```
1. POST /auth/login/  → access + refresh + user
2. Requêtes avec Bearer access
3. Si 401 → POST /auth/token/refresh/
4. POST /auth/logout/ avec refresh → blacklist
```

### Refresh token (SimpleJWT)

**POST** `/api/v1/auth/token/refresh/` — sans Bearer

**Body**

```json
{
  "refresh": "<jwt_refresh>"
}
```

**Réponse 200**

```json
{
  "access": "<nouveau_access>",
  "refresh": "<nouveau_refresh_si_rotation>"
}
```

---

## 4. Rôles RBAC

| Rôle | `role_name` | Accès API principal |
|------|-------------|---------------------|
| Client | `Client` | Profil, wallets, épargne, crédits, scoring `/me/` |
| Agent de crédit | `Agent de crédit` | Clients, KYC, scoring détail/trigger, RAG |
| Responsable crédit | `Responsable crédit` | Idem agent |
| Analyste risque | `Analyste risque` | Extensions risque (futures) |
| Administrateur | `Administrateur` | Admin Django + accès objet étendu |
| Auditeur | `Auditeur` | `GET /audit/` |

Un **403 Forbidden** indique un token valide mais un rôle insuffisant.

---

## 5. Endpoints — Authentification

**Préfixe** : `/api/v1/auth/`

---

### POST `/auth/register/`

Inscription client (rôle `Client` assigné automatiquement). Crée le profil client, les 2 wallets (USD/CDF).

| | |
|---|---|
| **Auth** | Aucune |
| **Throttle** | 10/min |

**Body**

```json
{
  "telephone": "+243900000001",
  "nom": "Kabila",
  "postnom": "M",
  "prenom": "Jean",
  "email": "jean@example.cd",
  "password": "MonMotDePasse8",
  "password_confirm": "MonMotDePasse8"
}
```

| Champ | Règles |
|-------|--------|
| `telephone` | Format RDC : `+243…` ou `243…` |
| `password` | Min. 8 caractères |

**Réponse 201**

```json
{
  "success": true,
  "message": "Compte créé avec succès.",
  "data": {
    "user": {
      "id": 1,
      "telephone": "+243900000001",
      "nom": "Kabila",
      "postnom": "M",
      "prenom": "Jean",
      "email": "jean@example.cd",
      "role_name": "Client",
      "full_name": "Jean Kabila M",
      "statut": "actif",
      "mfa_enabled": false,
      "created_at": "2026-06-03T10:00:00Z"
    },
    "tokens": {
      "access": "eyJ...",
      "refresh": "eyJ..."
    }
  }
}
```

---

### POST `/auth/login/`

| | |
|---|---|
| **Auth** | Aucune |
| **Throttle** | 10/min |

**Body**

```json
{
  "telephone": "+243900000001",
  "password": "MonMotDePasse8",
  "mfa_token": "123456"
}
```

| Champ | Obligatoire |
|-------|-------------|
| `mfa_token` | Oui si `mfa_enabled` sur le compte |

**Réponse 200** : même structure que `register` (`user` + `tokens`).

**Erreurs possibles** : identifiants incorrects, compte verrouillé (30 min après échecs), compte inactif, OTP invalide.

---

### POST `/auth/logout/`

| | |
|---|---|
| **Auth** | Bearer |

**Body**

```json
{
  "refresh": "<jwt_refresh>"
}
```

**Réponse 200**

```json
{
  "success": true,
  "message": "Déconnexion réussie."
}
```

---

### GET `/auth/me/`

| | |
|---|---|
| **Auth** | Bearer |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "telephone": "+243900000001",
    "role_name": "Client",
    "full_name": "Jean Kabila M",
    "statut": "actif",
    "mfa_enabled": false
  }
}
```

---

### POST `/auth/change-password/`

| | |
|---|---|
| **Auth** | Bearer |

**Body**

```json
{
  "old_password": "ancien",
  "new_password": "nouveau123",
  "new_password_confirm": "nouveau123"
}
```

---

### POST `/auth/mfa/setup/`

Génère le secret TOTP et le QR code.

| | |
|---|---|
| **Auth** | Bearer |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "secret": "BASE32SECRET",
    "qr_code": "data:image/png;base64,...",
    "provisioning_uri": "otpauth://totp/..."
  }
}
```

---

### POST `/auth/mfa/verify/`

Active le MFA après scan du QR.

| | |
|---|---|
| **Auth** | Bearer |

**Body**

```json
{
  "otp_token": "123456"
}
```

---

## 6. Endpoints — Clients & KYC

**Préfixe** : `/api/v1/clients/`

---

### GET `/clients/me/`

Profil client connecté.

| | |
|---|---|
| **Rôle** | Client |

**Réponse 200** (`data`)

```json
{
  "id": 1,
  "utilisateur": {
    "id": 1,
    "telephone": "+243900000001",
    "role_name": "Client",
    "full_name": "Jean Kabila M"
  },
  "profession": "Commerçant",
  "adresse": "Kinshasa, Gombe",
  "date_naissance": "1990-05-15",
  "revenu_estime_usd": "500.00",
  "revenu_estime_cdf": "1400000.00",
  "niveau_risque": "moyen",
  "date_inscription": "2026-01-01T00:00:00Z",
  "identites": [],
  "age": 36,
  "kyc_valid": false
}
```

---

### PATCH `/clients/me/`

| | |
|---|---|
| **Rôle** | Client |

**Body (partiel)** : `profession`, `adresse`, `date_naissance`, `revenu_estime_usd`, `revenu_estime_cdf`

---

### POST `/clients/me/identite/`

Soumission document KYC.

| | |
|---|---|
| **Rôle** | Client |
| **Content-Type** | `multipart/form-data` ou `application/json` |

| Champ | Type | Description |
|-------|------|-------------|
| `type_piece` | string | `carte_electeur`, `passeport`, `permis_conduire`, `carte_consulaire` |
| `numero_piece` | string | Unique |
| `date_expiration` | date | Doit être dans le futur |
| `document_scan` | fichier | Optionnel |

**Réponse 201** : objet `Identite` créé (`statut_verification`: `en_attente`).

---

### GET `/clients/`

Liste tous les clients.

| | |
|---|---|
| **Rôle** | Agent, Responsable crédit |
| **Query** | `?niveau_risque=`, `?search=`, `?ordering=`, `?page=` |

---

### GET `/clients/{id}/`

| | |
|---|---|
| **Rôle** | Agent ou client propriétaire |

---

### PATCH `/clients/{id}/`

| | |
|---|---|
| **Rôle** | Agent ou client propriétaire |

---

### POST `/clients/kyc/{pk}/verify/`

Validation ou rejet KYC par un agent.

| | |
|---|---|
| **Rôle** | Agent |

**Body — validation**

```json
{
  "statut": "valide"
}
```

**Body — rejet**

```json
{
  "statut": "rejete",
  "rejection_reason": "Document illisible"
}
```

**Réponse 200**

```json
{
  "success": true,
  "message": "KYC valide.",
  "data": {
    "id": 3,
    "type_piece": "carte_electeur",
    "statut_verification": "valide",
    "is_expired": false
  }
}
```

---

## 7. Endpoints — Wallets

**Préfixe** : `/api/v1/wallets/`

---

### GET `/wallets/me/`

Retourne **les deux wallets** du client (USD + CDF). Les crée s’ils n’existent pas encore.

| | |
|---|---|
| **Rôle** | Client |

**Réponse 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "devise": "CDF",
      "symbole": "FC",
      "numero_wallet": "RWC12345678901",
      "solde": "250000.00",
      "statut": "actif",
      "date_creation": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "devise": "USD",
      "symbole": "$",
      "numero_wallet": "RWU98765432109",
      "solde": "150.00",
      "statut": "actif",
      "date_creation": "2026-01-01T00:00:00Z"
    }
  ]
}
```

| `statut` wallet | Description |
|-----------------|-------------|
| `actif` | Opérationnel |
| `gele` | Gelé |
| `inactif` | Inactif |

---

### GET `/wallets/mobile-money/`

| | |
|---|---|
| **Rôle** | Client |
| **Query** | `?devise=USD` ou `?devise=CDF` (filtre optionnel) |

**Réponse 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "operateur": "orange_money",
      "numero_telephone": "+243900000099",
      "devise": "CDF",
      "date_liaison": "2026-02-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

**Opérateurs** : `mpesa`, `orange_money`, `airtel_money`, `africell`

---

### POST `/wallets/mobile-money/`

| | |
|---|---|
| **Rôle** | Client |

**Body**

```json
{
  "operateur": "orange_money",
  "numero_telephone": "+243900000099",
  "devise": "CDF"
}
```

| Champ | Défaut |
|-------|--------|
| `devise` | `CDF` si omis |

**Réponse 201** : compte créé dans `data`.

---

## 8. Endpoints — Épargne

**Préfixe** : `/api/v1/savings/`

---

### GET `/savings/`

Liste les comptes épargne actifs du client.

| | |
|---|---|
| **Rôle** | Client |
| **Query** | `?devise=USD` ou `?devise=CDF` |

**Réponse 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "devise": "USD",
      "symbole": "$",
      "solde": "200.00",
      "objectif_montant": "1000.00",
      "objectif_description": "Fonds urgence",
      "date_objectif": "2026-12-31",
      "is_active": true,
      "date_creation": "2026-03-01T00:00:00Z",
      "progression_pct": 20.0
    }
  ]
}
```

---

### POST `/savings/`

| | |
|---|---|
| **Rôle** | Client |

**Body**

```json
{
  "devise": "CDF",
  "objectif_montant": "500000.00",
  "objectif_description": "Stock boutique",
  "date_objectif": "2026-12-31"
}
```

| Champ | Notes |
|-------|-------|
| `devise` | `USD` ou `CDF` — **obligatoire** |
| `solde` | Toujours `0` à la création (lecture seule) |

---

### POST `/savings/{pk}/depot/`

| | |
|---|---|
| **Rôle** | Client |

**Body**

```json
{
  "montant": "50000.00",
  "description": "Épargne hebdomadaire"
}
```

**Réponse 201**

```json
{
  "success": true,
  "message": "Dépôt de FC50000.00 effectué.",
  "data": {
    "devise": "CDF",
    "nouveau_solde": "150000.00",
    "progression": 30.0,
    "operation_id": 12
  }
}
```

---

### POST `/savings/{pk}/retrait/`

| | |
|---|---|
| **Rôle** | Client |

**Body** : identique au dépôt.

**Erreur 400** : `insufficient_balance` si solde insuffisant.

**Réponse 200**

```json
{
  "success": true,
  "message": "Retrait de FC10000.00 effectué.",
  "data": {
    "devise": "CDF",
    "nouveau_solde": "140000.00",
    "operation_id": 13
  }
}
```

---

## 9. Endpoints — Crédits

**Préfixe** : `/api/v1/credits/`

---

### POST `/credits/`

Soumettre une demande de micro-crédit. Lance le scoring **asynchrone** (Celery).

| | |
|---|---|
| **Rôle** | Client |
| **Prérequis** | `kyc_valid=true`, pas de crédit `en_cours` dans la **même devise**, âge 20–60 ans |

**Body**

```json
{
  "devise": "USD",
  "montant_demande": "500.00",
  "duree_mois": 6,
  "motif": "Stock marchandises"
}
```

| Champ | Règles |
|-------|--------|
| `devise` | `USD` ou `CDF` — défaut `USD` |
| `montant_demande` | Dans la plage de la devise |
| `duree_mois` | 1 à 12 |

**Réponse 201**

```json
{
  "success": true,
  "message": "Demande soumise. Analyse en cours…",
  "data": {
    "demande_id": 42,
    "devise": "USD",
    "statut": "en_analyse"
  }
}
```

**Statuts demande** : `en_analyse`, `approuve`, `rejete`, `cloture`, `annule`

> Après soumission, interroger `GET /scoring/me/` ou `GET /credits/me/` jusqu’à changement de `statut`.

---

### GET `/credits/me/`

| | |
|---|---|
| **Rôle** | Client |
| **Query** | `?devise=USD` ou `?devise=CDF` (filtre optionnel) |

**Réponse 200**

```json
{
  "success": true,
  "data": [
    {
      "demande_id": 42,
      "devise": "USD",
      "symbole": "$",
      "montant_demande": "500.00",
      "duree_mois": 6,
      "motif": "Stock",
      "statut": "approuve",
      "date_demande": "2026-06-01T12:00:00Z",
      "credit": {
        "id": 10,
        "devise": "USD",
        "symbole": "$",
        "montant_accorde": "450.00",
        "taux_interet": "2.50",
        "date_debut": "2026-06-02",
        "date_fin": "2026-12-02",
        "statut": "en_cours",
        "mensualite": "78.50",
        "solde_restant": "400.00",
        "progression_remboursement": 11.1
      }
    }
  ]
}
```

**Statuts crédit** : `en_cours`, `rembourse`, `defaut`, `radie`

---

### POST `/credits/{credit_pk}/remboursement/`

| | |
|---|---|
| **Rôle** | Client |
| **Prérequis** | Crédit `statut=en_cours`, propriétaire |

**Body**

```json
{
  "montant": "78.50",
  "mode_paiement": "illicocash"
}
```

`mode_paiement` : `illicocash` | `virement` | `agence` | `mobile_money`

**Réponse 201**

```json
{
  "success": true,
  "message": "Remboursement de $78.50 enregistré.",
  "data": {
    "remboursement_id": 5,
    "devise": "USD",
    "solde_restant": "321.50",
    "credit_statut": "en_cours"
  }
}
```

Le montant du remboursement est dans la **même devise** que le crédit.

---

## 10. Endpoints — Scoring

**Préfixe** : `/api/v1/scoring/`

### Pipeline (après `POST /credits/`)

1. Tâche Celery `process_credit_scoring`
2. Moteurs : **Règles** → **Mobile Money** (devise demande) → **Comportemental** (devise) → **IA XGBoost** (montant + `devise_demande`)
3. Agrégation pondérée (25 % chacun)
4. Décision : `approuve` (≥50), `mise_en_attente` (40–49), `rejete` (<40)
5. Si approuvé : création `Credit` + échéances
6. Mise à jour `niveau_risque` client via **moyenne USD/CDF**

---

### GET `/scoring/me/`

Score **agrégé** du client (moyenne des deux devises).

| | |
|---|---|
| **Rôle** | Client |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "score_client": 72.5,
    "calcul": "moyenne_usd_cdf",
    "score_usd": 75.0,
    "score_cdf": 70.0,
    "scores_par_devise": {
      "USD": {
        "devise": "USD",
        "score_global": 75.0,
        "source": "demande",
        "demande_id": 42,
        "decision": "approuve",
        "motif": "Score global 75/100…",
        "niveau_risque": "faible"
      },
      "CDF": {
        "devise": "CDF",
        "score_global": 70.0,
        "source": "profil",
        "demande_id": null
      }
    },
    "derniere_demande_id": 42,
    "derniere_demande_devise": "USD",
    "detail_derniere_demande": {
      "demande_id": 42,
      "devise": "USD",
      "montant_demande": "500.00",
      "statut": "approuve",
      "score_regles": { "score": "100.00", "date_calcul": "…" },
      "score_mobile_money": { "score": "68.00", "date_calcul": "…" },
      "score_comportemental": { "score": "75.00", "date_calcul": "…" },
      "score_ia": {
        "probabilite_defaut": "0.12",
        "niveau_risque": "faible",
        "score_normalise": "82.00",
        "shap_values": { "montant_demande": 0.05, "devise_demande": 0.02 },
        "lime_values": {},
        "modele_utilise": "XGBoost_v2"
      },
      "decision": {
        "decision": "approuve",
        "score_global": "75.00",
        "motif": "…",
        "explication_ia": "…",
        "is_automatic": true,
        "date_decision": "2026-06-01T12:06:00Z"
      }
    }
  }
}
```

| Champ | Description |
|-------|-------------|
| `score_client` | **Moyenne** `score_usd` et `score_cdf` |
| `source` (par devise) | `demande` = dernière décision crédit ; `profil` = MM + comportemental sans demande |
| `detail_derniere_demande` | Détail scoring de la demande la plus récente (toutes devises) |

> `modele_utilise` en mode simulation si les fichiers ML sont absents.

---

### GET `/scoring/{demande_pk}/`

Détail scoring d’**une** demande (devise de la demande).

| | |
|---|---|
| **Rôle** | Agent, Responsable crédit |

**Réponse 200** : structure `detail_derniere_demande` ci-dessus.

---

### POST `/scoring/{demande_pk}/trigger/`

Relance manuelle du scoring.

| | |
|---|---|
| **Rôle** | Agent |
| **Throttle** | 30/min |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "demande_id": 42,
    "score_global": 74.25,
    "decision": "approuve",
    "motif": "…",
    "explication_ia": "…",
    "scores_detail": {
      "regles": 100,
      "mobile_money": 68,
      "comportemental": 75,
      "ia": 82
    }
  }
}
```

---

## 11. Endpoints — RAG

**Préfixe** : `/api/v1/rag/`

Génération de mémos de crédit (OpenAI ou template local si `OPENAI_API_KEY` vide). Embeddings stockés en **JSONField** MySQL.

---

### GET `/rag/documents/`

| | |
|---|---|
| **Rôle** | Agent |

**Réponse 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Politique micro-crédit Rawbank",
      "content": "…",
      "source": "internal",
      "document_type": "policy",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/rag/memo/{demande_pk}/`

| | |
|---|---|
| **Rôle** | Agent |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "memo": "MÉMO DE CRÉDIT — Demande #42 (USD)…"
  }
}
```

---

## 12. Endpoints — Audit

**Préfixe** : `/api/v1/audit/`

---

### GET `/audit/`

Journal d’audit (middleware sur POST/PUT/PATCH/DELETE sensibles).

| | |
|---|---|
| **Rôle** | Auditeur uniquement |
| **Query** | `?action=`, `?id_utilisateur=`, `?search=`, `?ordering=`, `?page=` |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "count": 100,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "id_utilisateur": 2,
        "utilisateur_telephone": "+243900000001",
        "action": "POST /api/v1/credits/",
        "details": {},
        "adresse_ip": "127.0.0.1",
        "date_action": "2026-06-01T12:00:00Z"
      }
    ]
  }
}
```

---

## 13. Endpoints — Configuration (taux de change)

**Préfixe** : `/api/v1/settings/`

---

### GET `/settings/taux-change/`

Consulte le taux actuel et les plages crédit dérivées.

| | |
|---|---|
| **Rôle** | Tout utilisateur authentifié |

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "cdf_per_usd": 2250,
    "libelle": "1 USD = 2250 CDF",
    "usd_credit_min": 50,
    "usd_credit_max": 1500,
    "cdf_credit_min": 112500,
    "cdf_credit_max": 3375000,
    "updated_at": "2026-06-03T14:00:00Z",
    "updated_by": "Admin Système"
  }
}
```

---

### GET `/settings/admin/taux-change/`

| | |
|---|---|
| **Rôle** | Administrateur |

Même payload que ci-dessus (+ `updated_by_id`).

---

### PUT ou PATCH `/settings/admin/taux-change/`

Modifie le taux de conversion.

| | |
|---|---|
| **Rôle** | Administrateur |

**Body**

```json
{
  "cdf_per_usd": 2300
}
```

| Champ | Règles |
|-------|--------|
| `cdf_per_usd` | Entier ≥ 1 (nombre de CDF pour 1 USD) |

**Réponse 200**

```json
{
  "success": true,
  "message": "Taux mis à jour : 1 USD = 2300 CDF.",
  "data": {
    "cdf_per_usd": 2300,
    "libelle": "1 USD = 2300 CDF",
    "usd_credit_min": 50,
    "usd_credit_max": 1500,
    "cdf_credit_min": 115000,
    "cdf_credit_max": 3450000
  }
}
```

> Modifiable aussi dans **Django Admin** → Configuration plateforme.

---

## 14. Santé & documentation interactive

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| GET | `/health/` | Non | Health check API |
| GET | `/api/docs/` | Non | Swagger UI |
| GET | `/api/redoc/` | Non | ReDoc |
| GET | `/api/schema/` | Non | OpenAPI JSON/YAML |
| GET | `/admin/` | Session Django | Administration |

**GET `/health/`**

```json
{
  "status": "ok",
  "service": "simbisa-api"
}
```

---

## 15. Récapitulatif des routes

| Méthode | Endpoint | Rôle(s) |
|---------|----------|---------|
| **Auth** | | |
| POST | `/api/v1/auth/register/` | Public |
| POST | `/api/v1/auth/login/` | Public |
| POST | `/api/v1/auth/logout/` | Authentifié |
| GET | `/api/v1/auth/me/` | Authentifié |
| POST | `/api/v1/auth/token/refresh/` | Public |
| POST | `/api/v1/auth/change-password/` | Authentifié |
| POST | `/api/v1/auth/mfa/setup/` | Authentifié |
| POST | `/api/v1/auth/mfa/verify/` | Authentifié |
| **Clients** | | |
| GET | `/api/v1/clients/me/` | Client |
| PATCH | `/api/v1/clients/me/` | Client |
| POST | `/api/v1/clients/me/identite/` | Client |
| GET | `/api/v1/clients/` | Agent |
| GET/PATCH | `/api/v1/clients/{id}/` | Agent / propriétaire |
| POST | `/api/v1/clients/kyc/{pk}/verify/` | Agent |
| **Wallets** | | |
| GET | `/api/v1/wallets/me/` | Client |
| GET/POST | `/api/v1/wallets/mobile-money/` | Client |
| **Épargne** | | |
| GET/POST | `/api/v1/savings/` | Client |
| POST | `/api/v1/savings/{pk}/depot/` | Client |
| POST | `/api/v1/savings/{pk}/retrait/` | Client |
| **Crédits** | | |
| POST | `/api/v1/credits/` | Client |
| GET | `/api/v1/credits/me/` | Client |
| POST | `/api/v1/credits/{credit_pk}/remboursement/` | Client |
| **Scoring** | | |
| GET | `/api/v1/scoring/me/` | Client |
| GET | `/api/v1/scoring/{demande_pk}/` | Agent |
| POST | `/api/v1/scoring/{demande_pk}/trigger/` | Agent |
| **RAG** | | |
| GET | `/api/v1/rag/documents/` | Agent |
| POST | `/api/v1/rag/memo/{demande_pk}/` | Agent |
| **Audit** | | |
| GET | `/api/v1/audit/` | Auditeur |
| **Configuration** | | |
| GET | `/api/v1/settings/taux-change/` | Authentifié |
| GET | `/api/v1/settings/admin/taux-change/` | Administrateur |
| PUT/PATCH | `/api/v1/settings/admin/taux-change/` | Administrateur |

---

## 16. Intégration frontend

### Application mobile (Flutter — Client)

| Écran | Méthode | Endpoint |
|-------|---------|----------|
| Login | POST | `/auth/login/` |
| Register | POST | `/auth/register/` |
| Profil | GET/PATCH | `/clients/me/` |
| KYC | POST | `/clients/me/identite/` |
| Wallets USD+CDF | GET | `/wallets/me/` |
| Mobile Money | GET/POST | `/wallets/mobile-money/?devise=` |
| Épargne | GET/POST | `/savings/?devise=` |
| Dépôt / retrait | POST | `/savings/{id}/depot/`, `/retrait/` |
| Demande crédit | POST | `/credits/` (body avec `devise`) |
| Mes crédits | GET | `/credits/me/?devise=` |
| Remboursement | POST | `/credits/{id}/remboursement/` |
| Score (moyenne) | GET | `/scoring/me/` → `score_client` |
| Refresh token | POST | `/auth/token/refresh/` |

**Base URL Flutter (dev)**

```dart
// Émulateur Android → machine hôte
static const String baseUrl = 'http://10.0.2.2:8000';

// Appareil physique → IP LAN du PC
// static const String baseUrl = 'http://192.168.1.10:8000';
```

### Application web (React — multi-rôles)

| Zone | Endpoints |
|------|-----------|
| Auth | `/auth/login/`, `/register/`, `/me/`, `/logout/` |
| Client | `/clients/me/`, `/wallets/me/`, `/savings/`, `/credits/`, `/scoring/me/` |
| Agent | `/clients/`, `/clients/kyc/{id}/verify/`, `/scoring/{id}/`, `/rag/memo/{id}/` |
| Admin | `/settings/admin/taux-change/` |
| Auditeur | `/audit/` |

**Interceptor Axios (exemple)**

```javascript
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access_token');
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      const { data } = await axios.post(`${BASE}/api/v1/auth/token/refresh/`, { refresh });
      localStorage.setItem('access_token', data.access);
      error.config.headers.Authorization = `Bearer ${data.access}`;
      return axios(error.config);
    }
    throw error;
  }
);
```

### Affichage des montants côté UI

```javascript
const symbole = (devise) => (devise === 'USD' ? '$' : 'FC');
const formatMontant = (montant, devise) => `${symbole(devise)}${montant}`;
```

Utiliser `score_client` pour le dashboard ; `scores_par_devise` pour le détail par compte.

---

## 17. Codes HTTP & erreurs métier

| Code HTTP | Signification |
|-----------|---------------|
| 200 | OK |
| 201 | Créé |
| 400 | Validation / règle métier |
| 401 | Token absent, expiré ou invalide |
| 403 | Rôle insuffisant ou KYC non validé |
| 404 | Ressource introuvable |
| 429 | Rate limit dépassé |

| Code métier `error.code` | HTTP | Description |
|--------------------------|------|-------------|
| `validation_error` | 400 | Champs invalides (`details` présent) |
| `kyc_not_validated` | 403 | KYC requis avant demande crédit |
| `active_credit_exists` | 400 | Crédit en cours déjà existant **pour cette devise** |
| `montant_hors_plage` | 400 | Montant hors plage USD/CDF |
| `age_ineligible` | 400 | Âge hors 20–60 ans |
| `insufficient_balance` | 400 | Solde épargne insuffisant (retrait) |
| `invalid_otp` | 400 | Code MFA incorrect |
| `scoring_error` | 400 | Erreur pipeline scoring |
| `error` | 4xx | Erreur générique |

---

## Prérequis backend (checklist)

- [ ] MySQL démarré et migré — [MYSQL_SETUP.md](./MYSQL_SETUP.md)
- [ ] Données demo chargées — [SEEDERS.md](./SEEDERS.md) (`python manage.py seed_demo`)
- [ ] Rôles chargés : `python manage.py loaddata roles`
- [ ] Redis + worker Celery pour le scoring async
- [ ] CORS configuré pour l’URL du frontend web
- [ ] Modèle ML entraîné (optionnel) — [ML_ET_INTEGRATION.md](./ML_ET_INTEGRATION.md)
- [ ] Swagger testé : `http://localhost:8000/api/docs/`

---

## Voir aussi

- [MYSQL_SETUP.md](./MYSQL_SETUP.md) — Installation MySQL, migrations, Celery
- [SEEDERS.md](./SEEDERS.md) — Données de test (`python manage.py seed_demo`)
- [USSD_INTEGRATION.md](./USSD_INTEGRATION.md) — Architecture canal USSD
- [ML_ET_INTEGRATION.md](./ML_ET_INTEGRATION.md) — Entraînement XGBoost multi-devise
- [../README.md](../README.md) — Vue d’ensemble backend
