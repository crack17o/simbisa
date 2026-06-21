# Simbisa FinTech Platform — Backend Django (Rawbank)

API REST production-grade pour la plateforme de micro-crédits intelligente **Simbisa**, développée pour Rawbank (RDC). Ce backend couvre l'authentification JWT + MFA, le RBAC à 6 rôles, le scoring multi-moteur avec explicabilité XAI (SHAP/LIME), la génération RAG de mémos de crédit, l'audit trail, les agents par commune Kinshasa, et les tâches asynchrones Celery.

> **Modélisation complète (BDD, UML, Web, Mobile, déploiement)** : voir [docs/MODELISATION.md](docs/MODELISATION.md)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Django 5.0 + Django REST Framework |
| Auth | JWT (SimpleJWT) + MFA TOTP (pyotp) |
| Base de données | MySQL 8 (utf8mb4) |
| Cache / Broker | Redis 7 |
| Tâches async | Celery + django-celery-beat |
| ML inference | XGBoost + scikit-learn + SHAP/LIME |
| IA générative | OpenAI GPT-4o-mini + RAG |
| Docs API | drf-spectacular (OpenAPI / Swagger) |
| Conteneurisation | Docker + Gunicorn + Nginx |

## Architecture

```
backend/
├── config/              # Settings, URLs, Celery, WSGI/ASGI
├── apps/
│   ├── core/            # Modèles abstraits, RBAC, middleware audit, pagination
│   ├── authentication/  # Utilisateur, Rôles, JWT, MFA
│   ├── clients/         # Profil client, KYC (Identité)
│   ├── wallets/         # Wallet Rawbank, Mobile Money
│   ├── savings/         # Épargne virtuelle
│   ├── credits/         # Demandes, crédits, échéances, remboursements
│   ├── scoring/         # Pipeline multi-moteur + XAI
│   ├── rag/             # Mémos IA ancrés sur politiques Rawbank
│   └── audit/           # Journal d'audit
├── mltraining/          # Entraînement XGBoost (isolé du runtime Django)
├── docker/              # Dockerfiles + nginx
└── requirements/        # base / development / production
```

## Flux de scoring

1. **Soumission** — Le client POST `/api/v1/credits/` → création `DemandeCredit`
2. **Celery** — Tâche `process_credit_scoring` lance l'orchestrateur
3. **4 moteurs** — Règles → Mobile Money → Comportemental → XGBoost (SHAP/LIME)
4. **Agrégation** — Score global pondéré (25 % chacun), décision automatique
5. **RAG** — Génération du mémo de crédit (OpenAI ou template fallback)
6. **Octroi** — Si approuvé : création `Credit` + échéances

## Rôles RBAC

| Rôle | Accès principal |
|------|-----------------|
| Client | Crédits, épargne, scoring personnel |
| Agent de crédit | Portefeuille clients (CRUD sauf delete), KYC, demandes de sa zone, commune Kinshasa |
| Responsable crédit | Idem agent + validation |
| Analyste risque | Scoring, modèles |
| Administrateur | Accès complet |
| Auditeur | Logs d'audit |

## Démarrage rapide (développement)

### Prérequis

- Python 3.12+
- MySQL 8.0+
- Redis 7

### Installation

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements/development.txt
cp .env.example .env
```

### Base de données

```bash
# Migrations (MySQL doit être démarré — voir docs/MYSQL_SETUP.md)
python manage.py migrate --settings=config.settings.development

# Données de démo (comptes Test123!, clients, crédits, scoring)
python manage.py seed_demo

# Superutilisateur (optionnel si vous utilisez +243900000000 admin seed)
python manage.py createsuperuser
```

### Modèle ML (optionnel — mode simulation sans)

```bash
python -m mltraining.src.train_xgboost
```

### Lancer le serveur

```bash
python manage.py runserver
```

Terminal séparé — Celery :

```bash
celery -A config worker -l info
celery -A config beat -l info
```

### Docker (alternative)

```bash
cp .env.example .env
docker-compose up -d db redis
docker-compose up api celery celery-beat
```

## Documentation détaillée

Guides en français pour l’équipe (intégration frontend, ML, base de données) :

| Guide | Fichier | Contenu |
|-------|---------|---------|
| **MySQL** | [`docs/MYSQL_SETUP.md`](docs/MYSQL_SETUP.md) | Docker, migrations, rôles, Redis/Celery |
| **Seeders** | [`docs/SEEDERS.md`](docs/SEEDERS.md) | `python manage.py seed_demo`, comptes de test |
| **USSD** | [`docs/USSD_SIMULATEUR.md`](docs/USSD_SIMULATEUR.md) | Simulateur *123# fonctionnel |
| **USSD (architecture)** | [`docs/USSD_INTEGRATION.md`](docs/USSD_INTEGRATION.md) | Branchement telco futur |
| **ML & scoring** | [`docs/ML_ET_INTEGRATION.md`](docs/ML_ET_INTEGRATION.md) | Entraînement XGBoost, artefacts, `.env`, mode simulation |
| **Gemini & scoring** | [`docs/GEMINI_ET_SCORING.md`](docs/GEMINI_ET_SCORING.md) | Activer Gemini (RAG), embeddings, scoring XGBoost, checklist |
| **Référence API** | [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Tous les endpoints, auth JWT, RBAC, exemples curl, mapping Flutter/React |
| **Déploiement sans Celery** | [`docs/DEPLOIEMENT_SANS_CELERY.md`](docs/DEPLOIEMENT_SANS_CELERY.md) | Mode synchrone, Task Scheduler, prod légère (sans worker/beat) |
| **VPS Hostinger** | [`docs/DEPLOIEMENT_VPS_HOSTINGER.md`](docs/DEPLOIEMENT_VPS_HOSTINGER.md) | Docker Compose + Celery + Nginx HTTPS, Web + Mobile |
| **Cloudinary (KYC)** | [`docs/CLOUDINARY.md`](docs/CLOUDINARY.md) | Stockage documents KYC en production |

## Documentation API (interactive)

| URL | Description |
|-----|-------------|
| http://localhost:8000/api/docs/ | Swagger UI |
| http://localhost:8000/api/redoc/ | ReDoc |
| http://localhost:8000/api/schema/ | Schéma OpenAPI JSON |
| http://localhost:8000/health/ | Health check |

## Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/auth/register/` | Inscription client |
| POST | `/api/v1/auth/login/` | Connexion JWT |
| GET | `/api/v1/auth/me/` | Profil courant |
| POST | `/api/v1/auth/mfa/setup/` | Configuration MFA |
| GET | `/api/v1/clients/me/` | Profil client |
| POST | `/api/v1/clients/me/identite/` | Soumission KYC |
| POST | `/api/v1/credits/` | Demande de micro-crédit |
| GET | `/api/v1/credits/me/` | Mes crédits |
| GET | `/api/v1/scoring/me/` | Score client (moyenne USD + CDF) |
| GET | `/api/v1/wallets/me/` | Wallets USD + CDF |
| GET | `/api/v1/savings/` | Comptes épargne |
| POST | `/api/v1/rag/memo/<id>/` | Générer mémo RAG |
| GET | `/api/v1/audit/` | Logs (Auditeur) |
| GET/PATCH | `/api/v1/settings/admin/taux-change/` | Taux CDF/USD (Administrateur) |
| GET | `/api/v1/settings/taux-change/` | Taux actuel (lecture) |

## Sécurité

- **JWT** avec rotation des refresh tokens et blacklist
- **MFA TOTP** (Google Authenticator compatible)
- Verrouillage après 5 tentatives échouées (30 min)
- **RBAC** sur tous les endpoints sensibles
- **Audit middleware** sur POST/PUT/PATCH/DELETE (auth, crédits, scoring, clients)
- **Rate limiting** : auth 10/min, scoring 30/min, user 200/min
- Headers sécurité : XSS, nosniff, X-Frame-Options DENY
- Production : HSTS, cookies Secure/HttpOnly, Sentry, **Cloudinary** (documents KYC authentifiés)

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète. Variables critiques :

- `SECRET_KEY` — Clé Django (256 bits en production)
- `DB_*` — Connexion MySQL
- `REDIS_URL` — Cache + broker Celery
- `OPENAI_API_KEY` — RAG (optionnel, fallback template)
- `ML_MODEL_PATH` — Chemin vers le modèle XGBoost

## Tests

```bash
pytest
```

## Module ML Training

Le dossier `mltraining/` est **isolé** du runtime Django. Voir [`mltraining/README.md`](mltraining/README.md).

## Intégration frontend

- **Web** : `frontend/web` → `http://localhost:8000` (CORS : `http://localhost:5173`)
- **Mobile** : `Frontend/Mobile` → IP LAN ou `10.0.2.2` (émulateur Android)

Voir [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) pour la matrice écran ↔ endpoint.

## Licence

Propriété Rawbank — Usage interne Simbisa FinTech Platform.
