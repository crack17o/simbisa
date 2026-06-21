# Intégration API Frontend ↔ Backend

Référence détaillée : `backend/docs/POSTMAN_GUIDE.md`

## Configuration

```powershell
cd Frontend/Web
copy .env.example .env
npm install
npm run dev
```

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:8000` (`python manage.py runserver`)
- CORS : `CORS_ALLOWED_ORIGINS=http://localhost:5173` dans le `.env` backend
- Proxy Vite : `/api` et `/health` → port 8000

Comptes seed : `python manage.py seed_demo --flush` — mot de passe `Test123!`

| Rôle | Téléphone |
|------|-----------|
| Client (Jean) | `+243900000010` |
| Client sans KYC (Marie) | `+243900000011` |
| Client CDF (Paul) | `+243900000012` |
| Agent crédit | `+243900000002` |
| Responsable crédit | `+243900000003` |
| Analyste risque | `+243900000004` |
| Auditeur | `+243900000005` |
| Administrateur | `+243900000000` |

## Couche API (`src/api/`)

| Fichier | Endpoints |
|---------|-----------|
| `client.js` | fetch + JWT + refresh token + `device_id` localStorage |
| `auth.js` | login (OTP 2 étapes), register, logout, me, **MFA setup/verify**, **mot de passe oublié** |
| `clients.js` | profil, KYC |
| `wallets.js` | wallets, mobile money |
| `savings.js` | épargne, dépôt, retrait, **historique opérations** |
| `credits.js` | demande client, mes crédits, remboursement, **liste/stats/décision agent** |
| `manager.js` | dashboard, exceptions, plafonds |
| `scoring.js` | mon score, détail par demande, trigger |
| `risk.js` | dashboard, règles, modèles IA |
| `admin.js` | utilisateurs, rôles (lecture) |
| `settings.js` | taux CDF/USD, **paramètres sécurité** |
| `rag.js` | documents, mémo |
| `audit.js` | journal, **décisions crédit**, rapports |

## Authentification

### Login (OTP e-mail si requis)

1. `POST /api/v1/auth/login/` — `{ telephone, password, device_id? }`
2. Si `otp_required: true` → saisir le code reçu par e-mail
3. `POST /api/v1/auth/login/verify-otp/` — `{ telephone, otp, device_id? }`

OTP déclenché si : MFA activé, nouveau pays/appareil, ou politique agents.

### Mot de passe oublié

1. `POST /api/v1/auth/password/forgot/` — `{ telephone }`
2. `POST /api/v1/auth/password/verify-otp/` — `{ telephone, otp }` → `reset_token`
3. `POST /api/v1/auth/password/reset/` — `{ reset_token, new_password }`

Page frontend : `/forgot-password`

### MFA (profil client)

1. `POST /api/v1/auth/mfa/setup/` — envoie OTP par e-mail
2. `POST /api/v1/auth/mfa/verify/` — `{ otp }` — active MFA

Page frontend : **Profile** (section « Double authentification »)

## Pages branchées sur l'API

| Page | API utilisée |
|------|----------------|
| Login | login + verify-otp, device_id |
| ForgotPassword | password/forgot, verify-otp, reset |
| Register | `POST /auth/register/` |
| Dashboard (client) | credits, scoring, savings, clients |
| Profile | PATCH clients/me, KYC, MFA setup/verify |
| Savings | GET/POST savings, depot, retrait, **GET savings/{id}/operations/** |
| CreditRequest | POST credits + poll scoring |
| MyCredits | GET credits/me |
| Repayments | POST credits/{id}/remboursement |
| ScoringDetail (client) | GET scoring/me |
| ScoringDetail (staff) | GET scoring/{demande_id}/ |
| AIExplanations | GET scoring/me |
| **AgentDashboard** | GET credits/demandes/stats/, credits/demandes/sensibles/, POST decision |
| **AgentRequests** | GET credits/demandes/, POST credits/demandes/{id}/decision/ |
| **ManagerDashboard** | GET manager/dashboard/, POST decision |
| **ManagerExceptions** | GET/PATCH manager/exceptions/ |
| **ManagerPlafonds** | GET/PATCH manager/plafonds/ |
| **RiskDashboard** | GET risk/dashboard/ |
| **RiskRules** | GET/PATCH risk/rules/ |
| **RiskModels** | GET risk/models/ |
| **AdminUsers** | GET admin/users/ |
| **AdminRoles** | GET admin/roles/ |
| **AdminSettings** | GET/PATCH settings/admin/taux-change/ et **security/** |
| **AuditorDashboard** | GET audit/ (journal) |
| **AuditDecisions** | GET audit/decisions/ |
| **AuditReports** | GET/POST audit/reports/ (export JSON) |

## Encore en MOCK ou partiel

| Élément | Statut |
|---------|--------|
| **AdminUsers** — création / édition | Boutons désactivés (lecture seule API) |
| **AuditReports** — export PDF | JSON téléchargeable ; PDF non implémenté |
| **TopBar** notifications | Supprimé (pas d'endpoint backend) |
| **RiskModels** — métriques AUC/Gini | Valeurs dashboard statiques + fichiers modèle réels |

## Données seed (après `--flush`)

- **Jean** : KYC validé, wallets, 5 tx MM, épargne + historique, 2 demandes scorées + 1 refusée historique
- **Marie** : sans KYC, demande crédit → rejet règles
- **Paul** : crédit USD actif + remboursement, dossier sensible 900 USD, exception manager
- **Audit** : journal + décisions crédit automatiques/manuelles
- **Scoring** : règles actives, scores IA sur demandes `en_analyse`

## Exemples rapides

### Décision agent
```http
POST /api/v1/credits/demandes/1/decision/
Authorization: Bearer <token agent>
Content-Type: application/json

{
  "decision": "approuve",
  "motif": "Dossier conforme",
  "observation": "Client fidèle"
}
```

### Plafonds responsable
```http
PATCH /api/v1/manager/plafonds/
Authorization: Bearer <token responsable>

{
  "usd_credit_min": 50,
  "usd_credit_max": 1500,
  "usd_agent_auto_max": 400,
  "usd_manager_max": 1200
}
```

### Sécurité admin
```http
PATCH /api/v1/settings/admin/security/
Authorization: Bearer <token admin>

{
  "mfa_obligatoire_agents": true,
  "maintenance_mode": false,
  "session_timeout_minutes": 30
}
```

## Dépannage

- **401 Session expirée** : reconnectez-vous (refresh token échoué).
- **403 Accès refusé** : vérifiez le rôle du compte (agent vs client, etc.).
- **CORS** : backend doit autoriser `http://localhost:5173`.
- **Cache dev** : en `development`, cache LocMem (Redis non requis pour login/OTP/throttling).
- **E-mails dev** : les OTP et liens s'affichent dans la console Django (`EMAIL_BACKEND` console).
