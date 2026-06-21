# Modélisation Simbisa — BDD, Backend, Frontends Web & Mobile

Document de référence pour l'architecture métier et technique de la plateforme **Simbisa Rawbank** (micro-crédit intelligent, RDC).

---

## 1. Vue d'ensemble

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend Web** | React 18 + Vite | SPA multi-rôles (client, agent, manager, risque, admin, auditeur) — **branché API** |
| **Frontend Mobile** | Flutter 3 + Riverpod + go_router | App **client** Android/iOS — UI complète, **intégration API en cours** (mock local) |
| **API** | Django 5 + DRF | REST `/api/v1/`, JWT, RBAC 6 rôles |
| **BDD** | MySQL 8 | Données métier relationnelles |
| **Cache** | Redis / LocMem (dev) | OTP, taux CDF, throttling |
| **Async** | Celery | Scoring crédit (optionnel) |
| **ML** | XGBoost + scikit-learn | Score IA, SHAP/LIME |
| **IA** | OpenAI + RAG | Mémos crédit ancrés politiques Rawbank |
| **USSD** | Passerelle simulée | Menu *123# (MSISDN = téléphone) |

---

## 2. Modèle de données (MySQL)

### 2.1 Domaines principaux

```
authentication   → Utilisateur, Role
clients          → Client, Identite (KYC)
wallets          → WalletRawbank, MobileMoneyAccount, MobileMoneyTransaction
savings          → CompteEpargne, OperationEpargne
credits          → DemandeCredit, Credit, Echeance, Remboursement, CreditException
scoring          → ScoreRegle, ScoreMobileMoney, ScoreComportemental, ScoreIA, DecisionCredit, ScoringRule
rag              → VectorDocument
audit            → AuditLog
core             → PlatformConfig
ussd             → UssdProfile, UssdInteractionLog
```

### 2.2 Territoire Kinshasa (règle métier clé)

- **24 communes** codées (`gombe`, `limete`, `ngaliema`, …) — voir `apps/core/kinshasa_communes.py`.
- **Agent de crédit** : `Utilisateur.commune_kinshasa` — une commune par agent ; **plusieurs agents peuvent partager la même commune**.
- **Client** : `Client.commune_kinshasa` + `Client.id_agent_assigne` → **un seul agent responsable** (portefeuille).
- **Inscription en ligne** : répartition à l'agent actif le **moins chargé** de la commune.
- **CRUD client (agent)** : Create / Read / Update sur **ses** clients ; **Delete réservé à l'Administrateur**.

### 2.3 Cardinalités principales

| Relation | Cardinalité |
|----------|-------------|
| Role → Utilisateur | 1 — N |
| Utilisateur → Client | 1 — 0..1 |
| Agent → Client (portefeuille) | 1 — N |
| Commune → Agent | 1 — N |
| Client → DemandeCredit | 1 — N |
| DemandeCredit → Credit | 1 — 0..1 |
| DemandeCredit → DecisionCredit | 1 — 0..1 |
| Credit → Echeance / Remboursement | 1 — N |

---

## 3. Diagramme de classes UML

```mermaid
classDiagram
    direction TB

    class Role {
        +String nom_role
        +String description
    }

    class Utilisateur {
        +String telephone
        +String email
        +String commune_kinshasa
        +String statut
        +Boolean mfa_enabled
    }

    class Client {
        +String profession
        +String adresse
        +String commune_kinshasa
        +Date date_naissance
        +Decimal revenu_estime_usd
        +String niveau_risque
    }

    class Identite {
        +String type_piece
        +String numero_piece
        +String statut_verification
    }

    class DemandeCredit {
        +Decimal montant_demande
        +String devise
        +String statut
    }

    class Credit {
        +Decimal montant_accorde
        +Decimal taux_interet
        +String statut
    }

    class DecisionCredit {
        +String decision
        +Decimal score_global
        +Boolean is_automatic
    }

    class WalletRawbank {
        +String devise
        +Decimal solde
    }

    class CompteEpargne {
        +String devise
        +Decimal solde
    }

    Role "1" --> "*" Utilisateur : possède
    Utilisateur "1" --> "0..1" Client : profil
    Utilisateur "1" --> "*" Client : clients_affectes
    Client "1" --> "*" Identite : KYC
    Client "1" --> "*" DemandeCredit
    DemandeCredit "1" --> "0..1" Credit
    DemandeCredit "1" --> "0..1" DecisionCredit
    Utilisateur "1" --> "*" DecisionCredit : id_agent
    Client "1" --> "*" WalletRawbank
    Client "1" --> "*" CompteEpargne
```

---

## 4. Diagrammes de séquence UML

### 4.1 Inscription client + affectation agent

```mermaid
sequenceDiagram
    actor C as Client
    participant FE as Frontend React
    participant API as Django API
    participant BDD as MySQL

    C->>FE: Formulaire + commune Kinshasa
    FE->>API: POST /auth/register/
    API->>BDD: Créer Utilisateur (role Client)
    API->>BDD: Créer Client (signal)
    API->>BDD: Compter agents actifs commune
    API->>BDD: Affecter id_agent_assigne (moins chargé)
    API->>API: E-mail bienvenue (SMTP)
    API-->>FE: JWT + agent_assigne
    FE-->>C: Redirection dashboard
```

### 4.2 Agent — CRUD client (sans DELETE)

```mermaid
sequenceDiagram
    actor A as Agent crédit
    participant FE as Frontend
    participant API as Django API
    participant BDD as MySQL

    Note over A,BDD: CREATE
    A->>FE: Ajouter client
    FE->>API: POST /clients/create/
    API->>BDD: Utilisateur + Client
    API->>BDD: id_agent_assigne = agent courant
    API-->>FE: Client créé

    Note over A,BDD: READ
    A->>FE: Liste clients
    FE->>API: GET /clients/
    API->>BDD: WHERE id_agent_assigne = agent
    API-->>FE: Portefeuille agent

    Note over A,BDD: UPDATE
    A->>FE: Modifier client
    FE->>API: PATCH /clients/{id}/
    API->>BDD: Vérifier portefeuille
    API->>BDD: MAJ profil + utilisateur
    API-->>FE: OK

    Note over A,BDD: DELETE — Admin uniquement
```

### 4.3 Demande de crédit + scoring

```mermaid
sequenceDiagram
    actor C as Client
    participant API as Django API
    participant ORCH as ScoringOrchestrator
    participant ML as XGBoost
    participant RAG as RAGGenerator
    participant BDD as MySQL

    C->>API: POST /credits/
    API->>BDD: DemandeCredit (en_analyse)
    API->>ORCH: run()
    ORCH->>BDD: ScoreRegle (KYC, âge, plafonds)
    ORCH->>BDD: ScoreMobileMoney
    ORCH->>BDD: ScoreComportemental
    ORCH->>ML: Prédiction défaut
    ORCH->>BDD: ScoreIA + DecisionCredit
    ORCH->>RAG: Mémo explicatif
    alt approuve
        ORCH->>BDD: Credit + Echeances
    end
    API-->>C: Résultat scoring
```

### 4.4 Connexion avec OTP e-mail

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant FE as Frontend
    participant API as Django API
    participant Mail as SMTP Gmail

    U->>FE: telephone + password
    FE->>API: POST /auth/login/
    alt OTP requis (MFA / pays / appareil)
        API->>Mail: Code OTP + alerte connexion
        API-->>FE: requires_otp true
        U->>FE: Saisie OTP
        FE->>API: POST /auth/login/verify-otp/
    end
    API->>API: Révoquer anciennes sessions JWT
    API-->>FE: access + refresh tokens
```

---

## 5. Diagramme de déploiement UML

```mermaid
flowchart TB
    subgraph ClientDevices["Appareils clients"]
        Browser["Navigateur Web\nlocalhost:5173"]
        Mobile["App Flutter\nAndroid / iOS\nFrontend/Mobile"]
        USSD["Simulateur USSD\n/api/v1/ussd/"]
    end

    subgraph FrontendWeb["Frontend Web (Vite / Nginx)"]
        SPA["React SPA\nFrontend/Web"]
    end

    subgraph BackendHost["Serveur applicatif"]
        Gunicorn["Gunicorn + Django 5"]
        Celery["Celery workers"]
    end

    subgraph DataLayer["Données & services"]
        MySQL[(MySQL 8\nsimbisa_db)]
        Redis[(Redis 7\ncache + broker)]
        SMTP["SMTP Gmail\nOTP / mails"]
        OpenAI["OpenAI API\nRAG"]
        MLFiles["mltraining/models/\nXGBoost joblib"]
    end

    Browser --> SPA
    SPA -->|REST /api/v1/ JWT + CORS| Gunicorn
    Mobile -->|REST /api/v1/ JWT\npas de CORS| Gunicorn
    USSD --> Gunicorn
    Gunicorn --> MySQL
    Gunicorn --> Redis
    Gunicorn --> SMTP
    Gunicorn --> OpenAI
    Gunicorn --> MLFiles
    Celery --> Redis
    Celery --> MySQL
```

**URLs backend (dev)**

| Client | Base URL |
|--------|----------|
| Web (Vite proxy) | `http://localhost:5173` → proxy `/api` → `:8000` |
| Mobile émulateur Android | `http://10.0.2.2:8000` |
| Mobile appareil physique | `http://<IP-LAN-PC>:8000` |
| USSD simulateur | `http://localhost:8000/api/v1/ussd/` |

**Production (Docker)** : voir `docker-compose.yml` — services `web`, `celery`, `redis`, `db`, `nginx`.

---

## 6. Diagramme de temps (scoring crédit)

```mermaid
sequenceDiagram
    participant T as Timeline
    participant API as API REST
    participant R as RulesEngine
    participant MM as MobileMoneyEngine
    participant B as BehavioralEngine
    participant IA as AIEngine
    participant AG as Aggregator
    participant DB as MySQL

    T->>API: t0 Demande soumise
    API->>R: t1 Règles métier
    R-->>DB: ScoreRegle
    alt règles KO
        R-->>API: t2 rejet immédiat
    else règles OK
        API->>MM: t2 Features MM
        MM-->>DB: ScoreMobileMoney
        API->>B: t3 Comportement
        B-->>DB: ScoreComportemental
        API->>IA: t4 Inférence XGBoost
        IA-->>DB: ScoreIA
        API->>AG: t5 Agrégation 25%×4
        AG-->>DB: DecisionCredit
        API-->>T: t6 Réponse client
    end
```

---

## 7. Diagramme d'activité UML

### 7.1 Parcours crédit (client → décision)

```mermaid
flowchart TD
    Start([Client connecté]) --> KYC{KYC validé ?}
    KYC -->|Non| Profil[Compléter profil / KYC]
    Profil --> KYC
    KYC -->|Oui| Demande[Soumettre demande crédit]
    Demande --> Scoring[Pipeline scoring 4 moteurs]
    Scoring --> Auto{Décision auto}
    Auto -->|Approuvé| Credit[Création crédit + échéances]
    Auto -->|Rejeté| FinRejet([Fin — rejeté])
    Auto -->|En attente| AgentRev[Revue agent portefeuille]
    AgentRev --> Sens{Dossier sensible ?}
    Sens -->|Oui| Manager[Escalade responsable]
    Sens -->|Non| DecisionAgent[Décision manuelle agent]
    Manager --> DecisionMgr[Décision / exception]
    DecisionAgent --> Credit
    DecisionMgr --> Credit
    Credit --> Rembourse[Remboursements]
    Rembourse --> End([Crédit soldé])
```

### 7.2 Gestion portefeuille agent

```mermaid
flowchart TD
    Start([Agent connecté]) --> Commune{Commune assignée ?}
    Commune -->|Non| AdminContact[Contacter administrateur]
    Commune -->|Oui| Menu{Action}
    Menu -->|C| Créer[POST /clients/create/]
    Menu -->|R| Lire[GET /clients/ portefeuille]
    Menu -->|U| Modifier[PATCH /clients/id/]
    Menu -->|KYC| Valider[POST /clients/kyc/id/verify/]
    Créer --> Affect[Client rattaché à agent]
    Lire --> Menu
    Modifier --> Check{Client dans portefeuille ?}
    Check -->|Oui| Save[Sauvegarde]
    Check -->|Non| Refus[403 Forbidden]
    Valider --> Check
    Save --> Menu
    Note1[DELETE réservé Admin]
```

---

## 8. Backend — structure API

```
/api/v1/
├── auth/           login, register, MFA, reset password
├── clients/        CRUD portefeuille, communes, KYC
├── credits/        demandes client + staff (agent/manager)
├── scoring/        scores, trigger, règles
├── savings/        épargne virtuelle
├── wallets/        Rawbank + Mobile Money
├── manager/        exceptions, plafonds, dashboard
├── risk/           règles IA, modèles
├── admin/          users, rôles, communes agents
├── audit/          journal, décisions, rapports
├── settings/       taux, sécurité
├── ussd/           simulateur + callback
└── rag/            documents politique
```

### Permissions CRUD client

| Action | Client | Agent | Manager | Admin |
|--------|--------|-------|---------|-------|
| Lire soi-même | ✅ | — | — | — |
| Lire portefeuille | — | ✅ (siens) | ✅ (tous) | ✅ |
| Créer | — | ✅ (siens) | — | — |
| Modifier | ✅ (profil) | ✅ (siens) | ✅ | ✅ |
| Supprimer | — | ❌ | ❌ | ✅ |
| KYC valider | — | ✅ (siens) | ✅ | — |

---

## 9. Frontends — Web & Mobile

### 9.1 Vue comparative

| | **Web** (`Frontend/Web`) | **Mobile** (`Frontend/Mobile`) |
|--|--------------------------|--------------------------------|
| Stack | React 18, Vite, Tailwind | Flutter 3, Riverpod, go_router |
| Rôles | 6 rôles (client → auditeur) | **Client uniquement** |
| API | Intégrée (`src/api/`) | **Prévue** — écrans + `mock_data.dart` aujourd'hui |
| Auth | JWT + OTP e-mail + `device_id` | Login simulé (delay mock) |
| Navigation | React Router, sidebar par rôle | Bottom nav 5 onglets (`ClientShell`) |
| Cible | Desktop / tablette | Android APK, iOS (build Flutter) |

Les **agents, managers et admin** utilisent exclusivement le **frontend Web**. Le mobile couvre le parcours **client grand public** (inclusion financière terrain).

---

### 9.2 Frontend Web — structure

```
Frontend/Web/src/
├── api/              client.js, auth.js, clients.js, credits.js, …
├── pages/
│   ├── Register.jsx          commune + inscription + agent auto
│   ├── agent/AgentClients.jsx CRUD portefeuille
│   ├── AgentDashboard.jsx
│   ├── manager/ …
│   ├── admin/AdminUsers.jsx  affectation commune agents
│   └── audit/ …
├── components/       atoms, molecules, templates
├── context/          AuthContext (JWT)
└── constants/        roles.js, navigation.js
```

#### Routes Web par rôle

| Rôle | Route d'accueil | Fonctions clés |
|------|-----------------|----------------|
| Client | `/dashboard` | crédit, épargne, score |
| Agent | `/agent` | **mes clients**, demandes, KYC |
| Manager | `/manager` | sensibles, exceptions, plafonds |
| Analyste | `/risk` | règles, modèles |
| Admin | `/admin` | users, communes agents, settings |
| Auditeur | `/audit` | journal, rapports |

---

### 9.3 Frontend Mobile (Flutter) — structure

```
Frontend/Mobile/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── constants/     routes.dart, router.dart (go_router)
│   │   └── theme/         app_theme.dart, widgets.dart (design Simbisa)
│   ├── data/
│   │   └── mock/          mock_data.dart (UserModel, CreditModel, …)
│   └── features/
│       ├── auth/          login_screen, register_screen
│       ├── dashboard/     dashboard_screen, client_shell (bottom nav)
│       ├── credit/        credit_request_screen, my_credits_screen
│       ├── savings/       savings_screen
│       ├── scoring/       scoring_screen
│       └── profile/       profile_screen
├── assets/                fonts Sora, images
└── pubspec.yaml           go_router, flutter_riverpod, fl_chart
```

#### Navigation mobile (ClientShell)

| Index | Onglet | Écran | Route |
|-------|--------|-------|-------|
| 0 | Accueil | `DashboardScreen` | `/dashboard` |
| 1 | Crédit | `CreditRequestScreen` | `/credit-request` |
| 2 | Épargne | `SavingsScreen` | `/savings` |
| 3 | Scoring | `ScoringScreen` | `/scoring` |
| 4 | Profil | `ProfileScreen` | `/profile` |

Auth hors shell : `/login`, `/register`.

#### Endpoints API cibles (mobile client)

| Écran mobile | Méthode | Endpoint backend |
|--------------|---------|------------------|
| Login | POST | `/auth/login/` (+ OTP si requis) |
| Register | POST | `/auth/register/` (+ `commune_kinshasa`) |
| Profil / KYC | GET/PATCH, POST | `/clients/me/`, `/clients/me/identite/` |
| Wallets | GET | `/wallets/me/` |
| Mobile Money | GET/POST | `/wallets/mobile-money/` |
| Épargne | GET/POST | `/savings/`, `/savings/{id}/depot/`, `/retrait/` |
| Demande crédit | POST | `/credits/` |
| Mes crédits | GET | `/credits/me/` |
| Remboursement | POST | `/credits/{id}/remboursement/` |
| Score | GET | `/scoring/me/` |
| Refresh JWT | POST | `/auth/token/refresh/` |
| Communes | GET | `/clients/communes/` |

#### Diagramme de composants (mobile)

```mermaid
flowchart TB
    subgraph FlutterApp["App Flutter — rôle Client"]
        Router["go_router\nAppRoutes"]
        Shell["ClientShell\nBottomNavigationBar"]
        Auth["Login / Register"]
        FeatDash["DashboardScreen"]
        FeatCredit["CreditRequestScreen\nMyCreditsScreen"]
        FeatSave["SavingsScreen"]
        FeatScore["ScoringScreen"]
        FeatProf["ProfileScreen"]
        Mock["mock_data.dart\n(phase actuelle)"]
        ApiLayer["Couche API\n(à implémenter)\nDio/http + JWT"]
    end

    subgraph Backend["Django REST"]
        REST["/api/v1/*"]
    end

    Router --> Auth
    Router --> Shell
    Shell --> FeatDash & FeatCredit & FeatSave & FeatScore & FeatProf
    FeatDash -.-> Mock
    FeatCredit -.-> Mock
    ApiLayer --> REST
    FeatDash -.->|cible| ApiLayer
    Auth -.->|cible| ApiLayer
```

#### Séquence — parcours mobile client (cible API)

```mermaid
sequenceDiagram
    actor U as Utilisateur mobile
    participant App as Flutter App
    participant API as Django API
    participant BDD as MySQL

    U->>App: Ouvre l'app
    App->>App: Splash / LoginScreen
    U->>App: telephone + password
    App->>API: POST /auth/login/
    alt OTP requis
        API-->>App: requires_otp
        U->>App: code e-mail
        App->>API: POST /auth/login/verify-otp/
    end
    API-->>App: JWT access + refresh
    App->>App: ClientShell (Accueil)

    U->>App: Onglet Crédit
    App->>API: POST /credits/
    API->>BDD: DemandeCredit + scoring
    API-->>App: décision + score

    U->>App: Onglet Profil
    App->>API: GET /clients/me/
    App->>API: POST /clients/me/identite/ (KYC)
```

#### Activité — navigation mobile

```mermaid
flowchart TD
    Start([Lancement app]) --> AuthCheck{Session JWT ?}
    AuthCheck -->|Non| Login[LoginScreen]
    Login -->|Succès| Shell[ClientShell]
    AuthCheck -->|Oui| Shell
    Login --> Register[RegisterScreen\n+ commune Kinshasa]
    Register -->|API register| Shell

    Shell --> Tab{Onglet sélectionné}
    Tab -->|0| Dash[Dashboard\nsoldes, résumé]
    Tab -->|1| Credit[Demande crédit\nmes crédits]
    Tab -->|2| Save[Épargne\ndépôt / retrait]
    Tab -->|3| Score[Mon score IA]
    Tab -->|4| Prof[Profil + KYC]

    Dash & Credit & Save & Score & Prof --> Tab
```

#### État d'intégration mobile

| Module | UI Flutter | API backend |
|--------|------------|-------------|
| Auth login/register | ✅ | ⏳ mock (navigation directe) |
| Dashboard | ✅ | ⏳ mock |
| Crédit | ✅ | ⏳ mock |
| Épargne | ✅ | ⏳ mock |
| Scoring | ✅ | ⏳ mock |
| Profil / KYC | ✅ | ⏳ mock |
| OTP / MFA | ❌ | ✅ backend prêt |
| Commune inscription | ❌ UI | ✅ backend prêt |

**Prochaine étape mobile** : couche `lib/data/api/` (Dio + intercepteur JWT), remplacer `mock_data.dart`, ajouter sélecteur commune à `register_screen.dart`.

---

## 10. Index & migrations

Migrations territoire :
- `authentication.0003_territoire_kinshasa` — `Utilisateur.commune_kinshasa`
- `clients.0002_territoire_kinshasa` — `Client.commune_kinshasa`, `Client.id_agent_assigne`

```powershell
cd backend
python manage.py migrate
python manage.py seed_demo --flush
```

---

## 11. Références

| Document | Contenu |
|----------|---------|
| [README.md](../README.md) | Installation backend |
| [SEEDERS.md](./SEEDERS.md) | Comptes demo |
| [API_INTEGRATION.md](../../Frontend/Web/docs/API_INTEGRATION.md) | Frontend Web ↔ API |
| [API_REFERENCE.md](./API_REFERENCE.md) | Référence REST Web + Mobile |
| [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) | Endpoints détaillés |
| [USSD_SIMULATEUR.md](./USSD_SIMULATEUR.md) | Menu *123# |
| `Frontend/Mobile/pubspec.yaml` | Dépendances Flutter |

---

*Simbisa Rawbank — modélisation v1.2 — Web multi-rôles + Mobile Flutter client + territoire Kinshasa.*
