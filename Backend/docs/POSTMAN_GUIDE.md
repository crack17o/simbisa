# Simbisa — Guide Postman (requête → réponse)

Base URL : `http://localhost:8000`

**Comptes demo** (après `python manage.py seed_demo`) — mot de passe : `Test123!`

| Rôle | Téléphone |
|------|-----------|
| Admin | `+243900000000` |
| Agent | `+243900000002` |
| Auditeur | `+243900000005` |
| Client Jean | `+243900000010` |
| Client Marie (sans KYC) | `+243900000011` |
| Client Paul | `+243900000012` |

**Authentification Postman (routes protégées)**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Obtenir le token : `POST /api/v1/auth/login/` → copier `data.tokens.access`.

---

## 1. Health

### GET `/health/`

**Authorization :** aucune  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "status": "ok",
  "service": "simbisa-api"
}
```

---

## 2. Auth — `/api/v1/auth/`

### POST `/api/v1/auth/register/`

**Authorization :** aucune

**Corps de la requête**

```json
{
  "telephone": "+243900000099",
  "nom": "Kabila",
  "postnom": "M.",
  "prenom": "Patrick",
  "email": "patrick@example.cd",
  "password": "MonMotDePasse1!",
  "password_confirm": "MonMotDePasse1!"
}
```

**Résultat attendu (201)**

```json
{
  "success": true,
  "message": "Compte créé avec succès.",
  "data": {
    "user": {
      "id": 99,
      "telephone": "+243900000099",
      "nom": "Kabila",
      "postnom": "M.",
      "prenom": "Patrick",
      "email": "patrick@example.cd",
      "role_name": "Client",
      "full_name": "Kabila M. Patrick",
      "statut": "actif",
      "mfa_enabled": false,
      "created_at": "2026-06-03T20:00:00Z"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### POST `/api/v1/auth/login/`

**Authorization :** aucune

**Corps de la requête — Client Jean**

```json
{
  "telephone": "+243900000010",
  "password": "Test123!"
}
```

**Corps de la requête — Agent**

```json
{
  "telephone": "+243900000002",
  "password": "Test123!"
}
```

**Corps de la requête — Admin**

```json
{
  "telephone": "+243900000000",
  "password": "Test123!"
}
```

**Corps de la requête — si MFA activé**

```json
{
  "telephone": "+243900000010",
  "password": "Test123!",
  "mfa_token": "123456"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Connexion réussie.",
  "data": {
    "user": {
      "id": 10,
      "telephone": "+243900000010",
      "nom": "Mukendi",
      "postnom": "K.",
      "prenom": "Jean",
      "email": "jean@example.cd",
      "role_name": "Client",
      "full_name": "Mukendi K. Jean",
      "statut": "actif",
      "mfa_enabled": false,
      "created_at": "2026-06-01T10:00:00Z"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Résultat si mauvais mot de passe (400)**

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "password: Identifiants incorrects.",
    "details": {
      "password": ["Identifiants incorrects."]
    }
  }
}
```

---

### POST `/api/v1/auth/token/refresh/`

**Authorization :** aucune

**Corps de la requête**

```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Résultat attendu (200)**

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST `/api/v1/auth/logout/`

**Authorization :** Bearer (access token)

**Corps de la requête**

```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Déconnexion réussie."
}
```

---

### GET `/api/v1/auth/me/`

**Authorization :** Bearer  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "telephone": "+243900000010",
    "nom": "Mukendi",
    "postnom": "K.",
    "prenom": "Jean",
    "email": "jean@example.cd",
    "role_name": "Client",
    "full_name": "Mukendi K. Jean",
    "statut": "actif",
    "mfa_enabled": false,
    "created_at": "2026-06-01T10:00:00Z"
  }
}
```

---

### POST `/api/v1/auth/change-password/`

**Authorization :** Bearer

**Corps de la requête**

```json
{
  "old_password": "Test123!",
  "new_password": "NouveauMotDePasse1!",
  "new_password_confirm": "NouveauMotDePasse1!"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Mot de passe mis à jour avec succès."
}
```

---

### POST `/api/v1/auth/mfa/setup/`

**Authorization :** Bearer  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,iVBORw0KGgo...",
    "provisioning_uri": "otpauth://totp/Simbisa%20Rawbank:+243900000010?secret=JBSWY3DPEHPK3PXP&issuer=Simbisa%20Rawbank"
  }
}
```

---

### POST `/api/v1/auth/mfa/verify/`

**Authorization :** Bearer

**Corps de la requête**

```json
{
  "otp_token": "123456"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Authentification à deux facteurs activée."
}
```

**Résultat si code invalide (400)**

```json
{
  "success": false,
  "error": {
    "code": "invalid_otp",
    "message": "Code OTP invalide."
  }
}
```

---

## 3. Clients — `/api/v1/clients/`

### GET `/api/v1/clients/`

**Authorization :** Bearer (Agent ou Responsable crédit)  
**Corps :** aucun  
**Query params optionnels :** `?search=Jean&niveau_risque=modere&ordering=-date_inscription&page=1`

**Résultat attendu (200)**

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "utilisateur": {
        "id": 10,
        "telephone": "+243900000010",
        "nom": "Mukendi",
        "postnom": "K.",
        "prenom": "Jean",
        "email": "jean@example.cd",
        "role_name": "Client",
        "full_name": "Mukendi K. Jean",
        "statut": "actif",
        "mfa_enabled": false,
        "created_at": "2026-06-01T10:00:00Z"
      },
      "profession": "Commerçant",
      "adresse": "Gombe, Kinshasa",
      "date_naissance": "1990-05-15",
      "revenu_estime_usd": "850.00",
      "revenu_estime_cdf": "1912500.00",
      "niveau_risque": "modere",
      "date_inscription": "2026-06-01T10:00:00Z",
      "identites": [],
      "age": 36,
      "kyc_valid": true
    }
  ]
}
```

---

### GET `/api/v1/clients/me/`

**Authorization :** Bearer (Client Jean)  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "id": 5,
  "utilisateur": {
    "id": 10,
    "telephone": "+243900000010",
    "role_name": "Client",
    "full_name": "Mukendi K. Jean",
    "statut": "actif",
    "mfa_enabled": false
  },
  "profession": "Commerçant",
  "adresse": "Gombe, Kinshasa",
  "date_naissance": "1990-05-15",
  "revenu_estime_usd": "850.00",
  "revenu_estime_cdf": "1912500.00",
  "niveau_risque": "modere",
  "date_inscription": "2026-06-01T10:00:00Z",
  "identites": [
    {
      "id": 1,
      "type_piece": "carte_electeur",
      "numero_piece": "CE123456789",
      "date_expiration": "2028-12-31",
      "statut_verification": "valide",
      "date_verification": "2026-06-01T11:00:00Z",
      "document_scan": "/media/kyc/jean_ce.pdf",
      "rejection_reason": "",
      "is_expired": false,
      "created_at": "2026-06-01T10:30:00Z"
    }
  ],
  "age": 36,
  "kyc_valid": true
}
```

---

### PATCH `/api/v1/clients/me/`

**Authorization :** Bearer (Client)

**Corps de la requête**

```json
{
  "profession": "Entrepreneur",
  "adresse": "Limete, Kinshasa",
  "revenu_estime_usd": "1200.00",
  "revenu_estime_cdf": "2700000.00"
}
```

**Résultat attendu (200)** — même structure que GET `/clients/me/` avec champs mis à jour.

---

### POST `/api/v1/clients/me/identite/`

**Authorization :** Bearer (Client)  
**Content-Type :** `multipart/form-data` (Postman → Body → form-data)

| Clé | Type | Valeur |
|-----|------|--------|
| `type_piece` | Text | `carte_electeur` |
| `numero_piece` | Text | `CE987654321` |
| `date_expiration` | Text | `2029-06-30` |
| `document_scan` | File | *(PDF ou JPG)* |

**Résultat attendu (201)**

```json
{
  "id": 2,
  "type_piece": "carte_electeur",
  "numero_piece": "CE987654321",
  "date_expiration": "2029-06-30",
  "statut_verification": "en_attente",
  "date_verification": null,
  "document_scan": "/media/kyc/ce987654321.pdf",
  "rejection_reason": "",
  "is_expired": false,
  "created_at": "2026-06-03T20:00:00Z"
}
```

---

### POST `/api/v1/clients/kyc/{id}/verify/`

**Authorization :** Bearer (Agent `+243900000002`)  
**URL exemple :** `/api/v1/clients/kyc/2/verify/`

**Corps de la requête — valider**

```json
{
  "statut": "valide"
}
```

**Corps de la requête — rejeter**

```json
{
  "statut": "rejete",
  "rejection_reason": "Document illisible ou expiré."
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "KYC valide.",
  "data": {
    "id": 2,
    "type_piece": "carte_electeur",
    "numero_piece": "CE987654321",
    "date_expiration": "2029-06-30",
    "statut_verification": "valide",
    "date_verification": "2026-06-03T20:05:00Z",
    "document_scan": "/media/kyc/ce987654321.pdf",
    "rejection_reason": "",
    "is_expired": false,
    "created_at": "2026-06-03T20:00:00Z"
  }
}
```

---

### GET `/api/v1/clients/{id}/`

**Authorization :** Bearer (Agent ou le client lui-même)  
**URL exemple :** `/api/v1/clients/5/`  
**Corps :** aucun

**Résultat attendu (200)** — même objet client que dans la liste.

---

### PATCH `/api/v1/clients/{id}/`

**Authorization :** Bearer (Agent ou client concerné)

**Corps de la requête**

```json
{
  "profession": "Commerçant",
  "adresse": "Bandal, Kinshasa"
}
```

**Résultat attendu (200)** — profil client mis à jour.

---

## 4. Wallets — `/api/v1/wallets/`

### GET `/api/v1/wallets/me/`

**Authorization :** Bearer (Client Jean)  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "devise": "USD",
      "symbole": "$",
      "numero_wallet": "RW-USD-000010",
      "solde": "250.00",
      "statut": "actif",
      "date_creation": "2026-06-01T10:00:00Z"
    },
    {
      "id": 2,
      "devise": "CDF",
      "symbole": "FC",
      "numero_wallet": "RW-CDF-000010",
      "solde": "500000.00",
      "statut": "actif",
      "date_creation": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/v1/wallets/mobile-money/`

**Authorization :** Bearer (Client)  
**Corps :** aucun  
**Query optionnel :** `?devise=CDF`

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "operateur": "orange",
      "numero_telephone": "+243812345678",
      "devise": "CDF",
      "date_liaison": "2026-06-01T10:00:00Z",
      "is_active": true
    }
  ]
}
```

---

### POST `/api/v1/wallets/mobile-money/`

**Authorization :** Bearer (Client)

**Corps de la requête**

```json
{
  "operateur": "orange",
  "numero_telephone": "+243899887766",
  "devise": "CDF"
}
```

**Résultat attendu (201)**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "operateur": "orange",
    "numero_telephone": "+243899887766",
    "devise": "CDF",
    "date_liaison": "2026-06-03T20:00:00Z",
    "is_active": true
  }
}
```

---

## 5. Épargne — `/api/v1/savings/`

### GET `/api/v1/savings/`

**Authorization :** Bearer (Client)  
**Corps :** aucun  
**Query optionnel :** `?devise=USD`

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "devise": "USD",
      "symbole": "$",
      "solde": "150.00",
      "objectif_montant": "1000.00",
      "objectif_description": "Fonds urgence",
      "date_objectif": "2026-12-31",
      "is_active": true,
      "date_creation": "2026-06-01T10:00:00Z",
      "progression_pct": 15.0
    },
    {
      "id": 2,
      "devise": "CDF",
      "symbole": "FC",
      "solde": "200000.00",
      "objectif_montant": "500000.00",
      "objectif_description": "Stock marché",
      "date_objectif": "2026-09-30",
      "is_active": true,
      "date_creation": "2026-06-01T10:00:00Z",
      "progression_pct": 40.0
    }
  ]
}
```

---

### POST `/api/v1/savings/`

**Authorization :** Bearer (Client)

**Corps de la requête**

```json
{
  "devise": "USD",
  "objectif_montant": "2000.00",
  "objectif_description": "Achat matériel",
  "date_objectif": "2027-01-31"
}
```

**Résultat attendu (201)**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "devise": "USD",
    "symbole": "$",
    "solde": "0.00",
    "objectif_montant": "2000.00",
    "objectif_description": "Achat matériel",
    "date_objectif": "2027-01-31",
    "is_active": true,
    "date_creation": "2026-06-03T20:00:00Z",
    "progression_pct": 0.0
  }
}
```

---

### POST `/api/v1/savings/{id}/depot/`

**Authorization :** Bearer (Client)  
**URL exemple :** `/api/v1/savings/1/depot/`

**Corps de la requête**

```json
{
  "montant": "50.00",
  "description": "Versement mensuel"
}
```

**Résultat attendu (201)**

```json
{
  "success": true,
  "message": "Dépôt de $50.00 effectué.",
  "data": {
    "devise": "USD",
    "nouveau_solde": "200.00",
    "progression": 20.0,
    "operation_id": 12
  }
}
```

---

### POST `/api/v1/savings/{id}/retrait/`

**Authorization :** Bearer (Client)  
**URL exemple :** `/api/v1/savings/1/retrait/`

**Corps de la requête**

```json
{
  "montant": "25.00",
  "description": "Retrait partiel"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Retrait de $25.00 effectué.",
  "data": {
    "devise": "USD",
    "nouveau_solde": "175.00",
    "operation_id": 13
  }
}
```

**Résultat si solde insuffisant (400)**

```json
{
  "success": false,
  "error": {
    "code": "insufficient_balance",
    "message": "Solde insuffisant."
  }
}
```

---

## 6. Crédits — `/api/v1/credits/`

### POST `/api/v1/credits/`

**Authorization :** Bearer (Client avec KYC validé)

**Corps de la requête — USD**

```json
{
  "devise": "USD",
  "montant_demande": "400.00",
  "duree_mois": 6,
  "motif": "Renforcement stock boutique"
}
```

**Corps de la requête — CDF**

```json
{
  "devise": "CDF",
  "montant_demande": "500000.00",
  "duree_mois": 12,
  "motif": "Achat équipement"
}
```

**Résultat attendu (201)**

```json
{
  "success": true,
  "message": "Demande soumise. Analyse en cours…",
  "data": {
    "demande_id": 7,
    "devise": "USD",
    "statut": "en_analyse"
  }
}
```

**Résultat si KYC non validé — tester avec Marie `+243900000011` (403)**

```json
{
  "success": false,
  "error": {
    "code": "kyc_not_validated",
    "message": "Le KYC doit être validé avant de soumettre une demande."
  }
}
```

**Résultat si crédit actif déjà en cours pour la devise (400)**

```json
{
  "success": false,
  "error": {
    "code": "active_credit_exists",
    "message": "Un crédit actif est déjà en cours pour cette devise."
  }
}
```

---

### GET `/api/v1/credits/me/`

**Authorization :** Bearer (Client)  
**Corps :** aucun  
**Query optionnel :** `?devise=USD`

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": [
    {
      "demande_id": 7,
      "devise": "USD",
      "symbole": "$",
      "montant_demande": "400.00",
      "duree_mois": 6,
      "motif": "Renforcement stock boutique",
      "statut": "approuvee",
      "date_demande": "2026-06-02T14:00:00Z",
      "credit": {
        "id": 3,
        "devise": "USD",
        "symbole": "$",
        "montant_accorde": "380.00",
        "taux_interet": "12.00",
        "date_debut": "2026-06-03",
        "date_fin": "2026-12-03",
        "statut": "en_cours",
        "mensualite": "67.50",
        "solde_restant": "320.00",
        "progression_remboursement": 15.8
      }
    },
    {
      "demande_id": 8,
      "devise": "CDF",
      "symbole": "FC",
      "montant_demande": "500000.00",
      "duree_mois": 12,
      "motif": "Achat équipement",
      "statut": "approuvee",
      "date_demande": "2026-06-02T15:00:00Z",
      "credit": null
    }
  ]
}
```

---

### POST `/api/v1/credits/{credit_id}/remboursement/`

**Authorization :** Bearer (Client propriétaire du crédit)  
**URL exemple :** `/api/v1/credits/3/remboursement/`

**Corps de la requête**

```json
{
  "montant": "67.50",
  "mode_paiement": "illicocash"
}
```

Valeurs `mode_paiement` : `illicocash` | `virement` | `agence` | `mobile_money`

**Résultat attendu (201)**

```json
{
  "success": true,
  "message": "Remboursement de $67.50 enregistré.",
  "data": {
    "remboursement_id": 5,
    "devise": "USD",
    "solde_restant": "252.50",
    "credit_statut": "en_cours"
  }
}
```

**Résultat si crédit introuvable (404)**

```json
{
  "success": false,
  "error": {
    "message": "Crédit introuvable ou déjà soldé."
  }
}
```

---

## 7. Scoring — `/api/v1/scoring/`

### GET `/api/v1/scoring/me/`

**Authorization :** Bearer (Client Jean)  
**Corps :** aucun

**Résultat attendu (200)**

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
        "demande_id": 7,
        "decision": "approuvee",
        "motif": "Profil solide",
        "niveau_risque": "faible"
      },
      "CDF": {
        "devise": "CDF",
        "score_global": 70.0,
        "source": "demande",
        "demande_id": 8,
        "decision": "approuvee",
        "motif": "Profil acceptable",
        "niveau_risque": "modere"
      }
    },
    "derniere_demande_id": 8,
    "derniere_demande_devise": "CDF",
    "detail_derniere_demande": {
      "demande_id": 8,
      "devise": "CDF",
      "montant_demande": "500000.00",
      "statut": "approuvee",
      "score_regles": {
        "score": "100.00",
        "date_calcul": "2026-06-02T15:00:00Z"
      },
      "score_mobile_money": {
        "score": "68.00",
        "date_calcul": "2026-06-02T15:00:00Z"
      },
      "score_comportemental": {
        "score": "72.00",
        "date_calcul": "2026-06-02T15:00:00Z"
      },
      "score_ia": {
        "probabilite_defaut": "0.1200",
        "niveau_risque": "modere",
        "score_normalise": "74.00",
        "shap_values": {},
        "lime_values": {},
        "modele_utilise": "xgboost_v2"
      },
      "decision": {
        "decision": "approuvee",
        "score_global": "70.00",
        "motif": "Profil acceptable",
        "explication_ia": "Flux Mobile Money réguliers, faible historique de défaut.",
        "is_automatic": true,
        "date_decision": "2026-06-02T15:00:05Z"
      }
    }
  }
}
```

> `score_client` = moyenne des scores USD et CDF.

---

### GET `/api/v1/scoring/{demande_id}/`

**Authorization :** Bearer (Agent)  
**URL exemple :** `/api/v1/scoring/7/`  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "demande_id": 7,
    "devise": "USD",
    "montant_demande": "400.00",
    "statut": "approuvee",
    "score_regles": {
      "score": "100.00",
      "date_calcul": "2026-06-02T14:00:00Z"
    },
    "score_mobile_money": {
      "score": "72.00",
      "date_calcul": "2026-06-02T14:00:00Z"
    },
    "score_comportemental": {
      "score": "78.00",
      "date_calcul": "2026-06-02T14:00:00Z"
    },
    "score_ia": {
      "probabilite_defaut": "0.0800",
      "niveau_risque": "faible",
      "score_normalise": "82.00",
      "shap_values": {
        "flux_entrants_moyen": 0.12,
        "regularite_revenus_pct": -0.08
      },
      "lime_values": {},
      "modele_utilise": "xgboost_v2"
    },
    "decision": {
      "decision": "approuvee",
      "score_global": "75.00",
      "motif": "Profil solide",
      "explication_ia": "Revenus stables, bon taux de remboursement.",
      "is_automatic": true,
      "date_decision": "2026-06-02T14:00:05Z"
    }
  }
}
```

---

### POST `/api/v1/scoring/{demande_id}/trigger/`

**Authorization :** Bearer (Agent)  
**URL exemple :** `/api/v1/scoring/7/trigger/`  
**Corps :** aucun (Body vide ou `{}`)

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "demande_id": 7,
    "devise": "USD",
    "decision": "approuvee",
    "score_global": 75.0,
    "score_regles": 100.0,
    "score_mobile_money": 72.0,
    "score_comportemental": 78.0,
    "score_ia": 82.0,
    "motif": "Profil solide"
  }
}
```

---

## 8. RAG — `/api/v1/rag/`

### GET `/api/v1/rag/documents/`

**Authorization :** Bearer (Agent)  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "title": "Politique crédit Rawbank 2026",
        "content": "Les montants USD sont plafonnés à 1500 USD...",
        "source": "internal",
        "document_type": "policy",
        "created_at": "2026-06-01T10:00:00Z"
      },
      {
        "id": 2,
        "title": "Guide scoring Simbisa",
        "content": "Le score client est la moyenne USD/CDF...",
        "source": "internal",
        "document_type": "guide",
        "created_at": "2026-06-01T10:00:00Z"
      }
    ]
  }
}
```

---

### POST `/api/v1/rag/memo/{demande_id}/`

**Authorization :** Bearer (Agent)  
**URL exemple :** `/api/v1/rag/memo/7/`  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "memo": "MÉMO DE CRÉDIT — SIMBISA RAWBANK\n\nClient : Mukendi K. Jean (+243900000010)\nDemande : $400 USD sur 6 mois\nDécision : APPROUVÉE\nScore global : 75/100\n\nAnalyse :\n- Règles métier : conforme (100/100)\n- Mobile Money : flux réguliers (72/100)\n- Comportement épargne : bon (78/100)\n- IA XGBoost : risque faible, probabilité défaut 8%\n\nRecommandation : octroi de $380 USD."
  }
}
```

---

## 9. Audit — `/api/v1/audit/`

### GET `/api/v1/audit/`

**Authorization :** Bearer (Auditeur `+243900000005`)  
**Corps :** aucun  
**Query optionnels :** `?action=login&ordering=-date_action&page=1`

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "count": 42,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "id_utilisateur": 10,
        "utilisateur_telephone": "+243900000010",
        "action": "login",
        "details": {},
        "adresse_ip": "127.0.0.1",
        "date_action": "2026-06-03T20:00:00Z"
      },
      {
        "id": 2,
        "id_utilisateur": 2,
        "utilisateur_telephone": "+243900000002",
        "action": "kyc_verify",
        "details": {"identite_id": 1, "statut": "valide"},
        "adresse_ip": "127.0.0.1",
        "date_action": "2026-06-03T19:30:00Z"
      }
    ]
  }
}
```

---

## 10. Configuration — `/api/v1/settings/`

### GET `/api/v1/settings/taux-change/`

**Authorization :** Bearer (tout utilisateur connecté)  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "cdf_per_usd": 2250,
    "libelle": "1 USD = 2250 CDF",
    "usd_credit_min": "50.00",
    "usd_credit_max": "1500.00",
    "cdf_credit_min": "112500.00",
    "cdf_credit_max": "3375000.00",
    "updated_at": "2026-06-01T10:00:00Z",
    "updated_by": "Admin Simbisa"
  }
}
```

---

### GET `/api/v1/settings/admin/taux-change/`

**Authorization :** Bearer (Admin `+243900000000`)  
**Corps :** aucun

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "cdf_per_usd": 2250,
    "libelle": "1 USD = 2250 CDF",
    "usd_credit_min": "50.00",
    "usd_credit_max": "1500.00",
    "cdf_credit_min": "112500.00",
    "cdf_credit_max": "3375000.00",
    "updated_at": "2026-06-01T10:00:00Z",
    "updated_by_id": 1,
    "updated_by": "Admin Simbisa"
  }
}
```

---

### PATCH `/api/v1/settings/admin/taux-change/`

**Authorization :** Bearer (Admin)

**Corps de la requête**

```json
{
  "cdf_per_usd": 2300
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "message": "Taux mis à jour : 1 USD = 2300 CDF.",
  "data": {
    "cdf_per_usd": 2300,
    "libelle": "1 USD = 2300 CDF",
    "usd_credit_min": "50.00",
    "usd_credit_max": "1500.00",
    "cdf_credit_min": "115000.00",
    "cdf_credit_max": "3450000.00"
  }
}
```

**Résultat si champ manquant (400)**

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Le champ cdf_per_usd est requis."
  }
}
```

---

### PUT `/api/v1/settings/admin/taux-change/`

Identique au PATCH ci-dessus (même corps, même réponse).

---

## 11. USSD — `/api/v1/ussd/`

Pas de Bearer token. PIN USSD demo : `0000`.

### POST `/api/v1/ussd/simulate/`

*(Alias identique : `/api/v1/ussd/callback/`)*

**Authorization :** aucune  
**Header optionnel** (si activé dans `.env`) : `X-USSD-Secret: votre_secret`

---

**Étape 1 — Composer *123#**

**Corps de la requête**

```json
{
  "session_id": "",
  "msisdn": "+243900000010",
  "input": "",
  "service_code": "*123#",
  "operator": "simulated"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "response_type": "CON",
    "message": "Bienvenue Simbisa Rawbank\nEntrez votre PIN USSD (4 chiffres):",
    "end_session": false
  }
}
```

---

**Étape 2 — Saisir le PIN**

**Corps de la requête**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "msisdn": "+243900000010",
  "input": "0000"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "response_type": "CON",
    "message": "Menu Simbisa\n1. Mon compte\n2. Epargne\n3. Credit\n4. Mon score\n5. Taux USD/CDF\n0. Quitter",
    "end_session": false
  }
}
```

---

**Étape 3 — Choisir « Mon score » (option 4)**

**Corps de la requête**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "msisdn": "+243900000010",
  "input": "4"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "response_type": "END",
    "message": "Votre score Simbisa : 72.5/100\nUSD : 75.0 | CDF : 70.0\nMerci.",
    "end_session": true
  }
}
```

---

**Étape 3 — Choisir « Taux USD/CDF » (option 5)**

**Corps de la requête**

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "msisdn": "+243900000010",
  "input": "5"
}
```

**Résultat attendu (200)**

```json
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "response_type": "END",
    "message": "Taux Rawbank :\n1 USD = 2250 CDF",
    "end_session": true
  }
}
```

---

### GET `/api/v1/ussd/simulator/`

**Authorization :** aucune  
**Corps :** aucun  
**Résultat :** page HTML (ouvrir dans le navigateur, pas Postman JSON)

```
http://localhost:8000/api/v1/ussd/simulator/
```

---

## 12. Ordre de test Postman recommandé

```
1.  POST /auth/login/              (Jean)     → copier access token
2.  GET  /auth/me/
3.  GET  /clients/me/
4.  GET  /wallets/me/
5.  GET  /savings/
6.  GET  /credits/me/
7.  GET  /scoring/me/
8.  GET  /settings/taux-change/

--- Changer de token (Agent) ---
9.  POST /auth/login/              (Agent)
10. GET  /clients/
11. GET  /scoring/7/
12. POST /scoring/7/trigger/       body vide
13. POST /rag/memo/7/              body vide

--- Changer de token (Admin) ---
14. POST /auth/login/              (Admin)
15. PATCH /settings/admin/taux-change/   { "cdf_per_usd": 2300 }

--- Sans token ---
16. POST /ussd/simulate/           étapes PIN + menu
```

---

## 13. CORS (frontend uniquement)

Si vous testez depuis un frontend sur `http://localhost:5173`, ajoutez dans `.env` :

```
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Postman ignore CORS — seul le navigateur en a besoin.

---

## 14. Erreurs communes

| Code | Cause | Exemple |
|------|-------|---------|
| 401 | Token absent ou expiré | Relancer login ou refresh |
| 403 | Mauvais rôle | Agent requis, vous êtes Client |
| 404 | ID inexistant | `demande_id` ou `credit_id` incorrect |
| 429 | Trop de requêtes | Attendre 1 minute (auth/scoring) |

Format erreur générique :

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Description lisible",
    "details": {}
  }
}
```
