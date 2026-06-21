# Déploiement Simbisa sur VPS Hostinger — Docker + Celery

Guide pas à pas pour héberger le **backend Django Simbisa** sur un **VPS Hostinger** avec **Docker Compose**, **Celery Worker**, **Celery Beat**, puis connecter le **frontend Web** et l’**app mobile Flutter**.

> **Stack production** : `config.settings.production` + MySQL + Redis + API Gunicorn + Celery + Beat  
> Alternative sans Celery : [`DEPLOIEMENT_SANS_CELERY.md`](DEPLOIEMENT_SANS_CELERY.md)

---

## Table des matières

1. [Vue d’ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Préparer le VPS Hostinger](#3-préparer-le-vps-hostinger)
4. [Installer Docker](#4-installer-docker)
5. [Déployer le backend (Docker Compose)](#5-déployer-le-backend-docker-compose)
6. [Configurer le fichier `.env`](#6-configurer-le-fichier-env)
7. [Premier démarrage et initialisation](#7-premier-démarrage-et-initialisation)
8. [Nginx + HTTPS sur l’hôte](#8-nginx--https-sur-lhôte)
9. [Celery — fonctionnement et tâches planifiées](#9-celery--fonctionnement-et-tâches-planifiées)
10. [Connecter le frontend Web](#10-connecter-le-frontend-web)
11. [Connecter l’app mobile Flutter](#11-connecter-lapp-mobile-flutter)
12. [Vérifications finales](#12-vérifications-finales)
13. [Mises à jour et maintenance](#13-mises-à-jour-et-maintenance)
14. [Dépannage](#14-dépannage)

---

## 1. Vue d’ensemble

```
                    HTTPS :443
┌──────────────┐ ──────────────────► ┌─────────────────────────────────────────┐
│ Web React    │                     │ VPS Hostinger (Ubuntu)                  │
│ App Flutter  │                     │                                         │
└──────────────┘                     │  Nginx (hôte) → 127.0.0.1:8000          │
                                     │       │                                 │
                                     │  ┌────▼─────────────────────────────┐   │
                                     │  │  Docker Compose                  │   │
                                     │  │  ┌─────┐ ┌───────┐ ┌──────────┐  │   │
                                     │  │  │ api │ │ celery│ │celery-bt │  │   │
                                     │  │  └──┬──┘ └───┬───┘ └────┬─────┘  │   │
                                     │  │     │        │          │        │   │
                                     │  │  ┌──▼──┐  ┌──▼──┐                  │   │
                                     │  │  │ db  │  │redis│  (broker/cache)│   │
                                     │  │  └─────┘  └─────┘                  │   │
                                     │  └──────────────────────────────────┘   │
                                     └─────────────────────────────────────────┘
```

**Flux crédit (avec Celery) :**
1. Client `POST /api/v1/credits/` → l’API répond immédiatement « Analyse en cours… »
2. Celery Worker exécute `process_credit_scoring` en arrière-plan
3. Le client consulte score / crédits quelques secondes plus tard

**Services Docker :**

| Service | Rôle |
|---------|------|
| `db` | MySQL 8 (utf8mb4) |
| `redis` | Broker Celery + cache Django |
| `api` | Django + Gunicorn |
| `celery` | Worker (scoring, RAG, maintenance) |
| `celery-beat` | Planificateur (retrain ML 03:00, etc.) |

---

## 2. Prérequis

| Élément | Recommandation |
|---------|----------------|
| VPS Hostinger | Ubuntu 22.04 / 24.04, **4 Go RAM min.** (ML + Celery) |
| Domaine | `api.votredomaine.com` → IP du VPS |
| Docker | 24+ et Docker Compose v2 |
| Cloudinary | Documents KYC (production) |
| Gmail ou SMTP | E-mails OTP / bienvenue |
| Gemini (optionnel) | RAG — [`GEMINI_ET_SCORING.md`](GEMINI_ET_SCORING.md) |

---

## 3. Préparer le VPS Hostinger

### 3.1 Connexion SSH

```bash
ssh root@VOTRE_IP_VPS
```

### 3.2 Utilisateur et pare-feu

```bash
apt update && apt upgrade -y
adduser simbisa
usermod -aG sudo simbisa
usermod -aG docker simbisa

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 3.3 DNS (hPanel Hostinger)

| Type | Nom | Valeur |
|------|-----|--------|
| A | `api` | IP du VPS |

---

## 4. Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker simbisa
```

Reconnectez-vous en `simbisa`, puis vérifiez :

```bash
docker --version
docker compose version
```

Installez aussi Nginx et Certbot **sur l’hôte** (reverse proxy HTTPS) :

```bash
sudo apt install -y nginx certbot python3-certbot-nginx git
```

---

## 5. Déployer le backend (Docker Compose)

```bash
sudo mkdir -p /opt/simbisa
sudo chown simbisa:simbisa /opt/simbisa
cd /opt/simbisa

git clone https://github.com/VOTRE_ORG/Simbisa.git .
cd backend
```

**Fichiers Docker utilisés :**

```
backend/
├── docker-compose.yml       # Stack de base (db, redis, api, celery, celery-beat)
├── docker-compose.prod.yml  # Overrides production (settings, ports, restart)
├── docker/Dockerfile        # Image API (Gunicorn)
└── docker/Dockerfile.celery # Image Worker / Beat
```

> En production, les images utilisent `requirements/production.txt` via `docker-compose.prod.yml`.

---

## 6. Configurer le fichier `.env`

```bash
cp .env.example .env
nano .env
```

**Variables essentielles pour Docker + Celery :**

```env
# Django
SECRET_KEY=GENERER-UNE-CLE-256-BITS-ALEATOIRE
DEBUG=False
ALLOWED_HOSTS=api.votredomaine.com,VOTRE_IP_VPS
DJANGO_SETTINGS_MODULE=config.settings.production
SECURE_SSL_REDIRECT=True

# MySQL — noms de services Docker (pas localhost)
DB_NAME=simbisa_db
DB_USER=simbisa_user
DB_PASSWORD=MOT_DE_PASSE_FORT
DB_ROOT_PASSWORD=MOT_DE_PASSE_ROOT_FORT
DB_HOST=db
DB_PORT=3306

# Redis — broker Celery
REDIS_URL=redis://redis:6379/0

# CORS (frontend web)
CORS_ALLOWED_ORIGINS=https://app.votredomaine.com,https://votredomaine.com

# JWT
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7

# E-mail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre@gmail.com
EMAIL_HOST_PASSWORD=mot_de_passe_application
DEFAULT_FROM_EMAIL=Simbisa Rawbank <votre@gmail.com>

# Cloudinary (KYC)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# ML
ML_MODEL_PATH=mltraining/models/xgboost_v2.joblib
ML_SCALER_PATH=mltraining/models/scaler.joblib
ML_FEATURES_PATH=mltraining/models/features.json

# RAG (optionnel)
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

Générer `SECRET_KEY` :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

> **Important** : `DB_HOST=db` et `REDIS_URL=redis://redis:6379/0` correspondent aux noms de services dans `docker-compose.yml`.

---

## 7. Premier démarrage et initialisation

### 7.1 Modèle ML (sur l’hôte, avant le build)

```bash
cd /opt/simbisa/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements/production.txt
python -m mltraining.src.train_xgboost
```

Vérifier :

```bash
ls mltraining/models/
# xgboost_v2.joblib  scaler.joblib  features.json
```

### 7.2 Lancer toute la stack

```bash
cd /opt/simbisa/backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Vérifier les conteneurs :

```bash
docker compose ps
```

Attendu : `db`, `redis`, `api`, `celery`, `celery-beat` → **running**.

### 7.3 Initialisation Django (première fois)

Le service `api` exécute `migrate` et `collectstatic` au démarrage. Pour les étapes supplémentaires :

```bash
# Superutilisateur admin
docker compose exec api python manage.py createsuperuser

# Données de démo (optionnel — TFC / tests)
docker compose exec api python manage.py seed_demo

# Tâches Celery Beat planifiées (retrain XGBoost 03:00 Kinshasa)
docker compose exec api python manage.py setup_celery_beat_tasks
```

### 7.4 Test local sur le VPS

```bash
curl http://127.0.0.1:8000/health/
curl http://127.0.0.1:8000/api/docs/
```

---

## 8. Nginx + HTTPS sur l’hôte

Nginx tourne **sur l’hôte** (pas dans Docker) et proxy vers le conteneur `api` (`127.0.0.1:8000`).

```bash
sudo nano /etc/nginx/sites-available/simbisa
```

```nginx
server {
    listen 80;
    server_name api.votredomaine.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/simbisa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.votredomaine.com
```

Test :

```bash
curl https://api.votredomaine.com/health/
```

---

## 9. Celery — fonctionnement et tâches planifiées

### Architecture

```
Client → API (réponse rapide)
              ↓ .delay()
         Redis (broker)
              ↓
         Celery Worker → scoring, RAG, maintenance
              ↑
         Celery Beat → tâches planifiées (DB django-celery-beat)
```

### Tâches principales

| Tâche | Déclencheur | Rôle |
|-------|-------------|------|
| `process_credit_scoring` | Soumission crédit | Scoring multi-moteur + décision |
| `retrain_xgboost_daily_3am` | Beat 03:00 | Ré-entraînement ML |
| Maintenance crédit | Beat / commandes | Échéances, rappels |

### Configurer Beat (retrain quotidien)

```bash
docker compose exec api python manage.py setup_celery_beat_tasks
```

### Surveiller Celery

```bash
# Logs worker
docker compose logs -f celery

# Logs beat
docker compose logs -f celery-beat

# Logs API
docker compose logs -f api
```

### Retrain manuel

```bash
docker compose exec api python manage.py retrain_xgboost
```

Statut du modèle (API, rôle Analyste) : `GET /api/v1/risk/model-status/`

---

## 10. Connecter le frontend Web

```bash
cd Frontend/Web
cp .env.example .env
```

```env
VITE_API_URL=https://api.votredomaine.com
```

```bash
npm install
npm run build
```

Déployez `dist/` sur votre hébergement web. Le domaine doit figurer dans `CORS_ALLOWED_ORIGINS` du `.env` backend.

Test connexion (compte seed si `seed_demo` exécuté) :
- `+243900000010` / `Test123!`

---

## 11. Connecter l’app mobile Flutter

Fichier : `Frontend/Mobile/lib/core/constants/api_config.dart`

```dart
class ApiConfig {
  ApiConfig._();

  static const String host = 'api.votredomaine.com';
  static const bool useHttps = true;

  static const String baseUrl = 'https://$host/api/v1';

  static Uri uri(String path) {
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse('$baseUrl/$normalized');
  }

  static String get healthUrl => 'https://$host/health/';
}
```

Rebuild :

```bash
cd Frontend/Mobile
flutter pub get
flutter build apk --release
```

> Le numéro inscrit = numéro analysé pour le Mobile Money. L’app détecte l’opérateur (Vodacom, Orange, Airtel, Africell) via le préfixe `+243`.

---

## 12. Vérifications finales

| Test | URL / commande | Attendu |
|------|----------------|---------|
| Health | `https://api.votredomaine.com/health/` | `status: ok` |
| Swagger | `/api/docs/` | UI Swagger |
| Login | `POST /api/v1/auth/login/` | JWT |
| Celery worker | `docker compose logs celery` | `ready` |
| Celery beat | `docker compose logs celery-beat` | `Scheduler: Sending due task` |
| Scoring async | Soumettre un crédit | Réponse immédiate + score après quelques s |
| Web | Connexion navigateur | OK |
| Mobile | Connexion app | OK |

Exemple login :

```bash
curl -X POST https://api.votredomaine.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"telephone":"+243900000010","password":"Test123!"}'
```

---

## 13. Mises à jour et maintenance

```bash
cd /opt/simbisa/backend
git pull

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

docker compose exec api python manage.py migrate
docker compose exec api python manage.py collectstatic --noinput
```

Redémarrer un service :

```bash
docker compose restart celery celery-beat api
```

Sauvegardes MySQL :

```bash
docker compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} simbisa_db > backup_$(date +%F).sql
```

---

## 14. Dépannage

### Conteneur `api` redémarre en boucle

```bash
docker compose logs api --tail 100
```

Causes : `.env` incorrect, MySQL pas prêt, `SECRET_KEY` manquante, Cloudinary non configuré.

### Celery worker ne traite rien

```bash
docker compose logs celery --tail 50
docker compose exec redis redis-cli ping   # → PONG
```

Vérifier `REDIS_URL=redis://redis:6379/0` dans `.env`.

### Beat ne planifie pas le retrain

```bash
docker compose exec api python manage.py setup_celery_beat_tasks
docker compose restart celery-beat
```

### 502 Bad Gateway (Nginx)

```bash
docker compose ps api
curl http://127.0.0.1:8000/health/
```

### CORS bloqué (web)

Ajouter l’origine exacte dans `CORS_ALLOWED_ORIGINS` (avec `https://`), puis :

```bash
docker compose restart api
```

### Mobile ne se connecte pas

- `api_config.dart` → bon domaine + HTTPS
- `ALLOWED_HOSTS` contient le domaine API
- Certificat SSL valide (`certbot certificates`)

### Scoring lent côté client mobile

Normal : avec Celery, la réponse crédit est immédiate mais le **résultat** arrive après traitement worker. L’app mobile poll `/scoring/me/` ou `/credits/me/` pendant quelques secondes.

---

## Commandes utiles (récap)

```bash
# Démarrer
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Arrêter
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Logs
docker compose logs -f api celery celery-beat

# Shell Django
docker compose exec api python manage.py shell

# État
docker compose ps
```

---

## Guides connexes

| Guide | Contenu |
|-------|---------|
| [`DEPLOIEMENT_SANS_CELERY.md`](DEPLOIEMENT_SANS_CELERY.md) | Alternative sans worker (VPS minimal) |
| [`GEMINI_ET_SCORING.md`](GEMINI_ET_SCORING.md) | Gemini + XGBoost |
| [`CLOUDINARY.md`](CLOUDINARY.md) | KYC |
| [`API_REFERENCE.md`](API_REFERENCE.md) | Endpoints Web / Mobile |

---

**Propriété Rawbank — Simbisa FinTech Platform**
