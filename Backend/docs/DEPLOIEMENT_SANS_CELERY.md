# Déploiement Simbisa — Backend sans Celery

Guide détaillé pour comprendre, installer et déployer le backend Simbisa **sans worker Celery ni Celery Beat**. Ce mode est adapté aux déploiements simples (un seul serveur, VPS, Windows Server) où tu veux éviter la complexité de Redis + workers + beat.

> **Voir aussi** : [`README.md`](../README.md) (mode complet avec Celery) · [`ALL.md`](../../ALL.md) (vue d’ensemble application)

---

## Table des matières

1. [Pourquoi ce mode existe](#1-pourquoi-ce-mode-existe)
2. [Celery vs sans Celery — comparaison](#2-celery-vs-sans-celery--comparaison)
3. [Comment ça marche techniquement](#3-comment-ça-marche-techniquement)
4. [Ce qui change concrètement pour l’utilisateur](#4-ce-qui-change-concrètement-pour-lutilisateur)
5. [Prérequis serveur](#5-prérequis-serveur)
6. [Installation pas à pas](#6-installation-pas-à-pas)
7. [Variables d’environnement](#7-variables-denvironnement)
8. [Lancer l’API en développement](#8-lancer-lapi-en-développement)
9. [Déployer en production](#9-déployer-en-production)
10. [Tâches planifiées sans Celery Beat](#10-tâches-planifiées-sans-celery-beat)
11. [Commandes de maintenance](#11-commandes-de-maintenance)
12. [Vérifications après déploiement](#12-vérifications-après-déploiement)
13. [Dépannage](#13-dépannage)
14. [Quand passer au mode Celery](#14-quand-passer-au-mode-celery)

---

## 1. Pourquoi ce mode existe

En mode **standard**, Simbisa utilise **Celery** pour :

| Tâche | Rôle |
|-------|------|
| `process_credit_scoring` | Scoring asynchrone après une demande de crédit |
| `retrain_xgboost_daily_3am` | Ré-entraînement du modèle ML à 03:00 |
| `check_overdue_echeances` | Marquer les échéances en retard |
| `send_payment_reminders` | Rappels de paiement J-3 |

Cela nécessite **3 processus** en plus de l’API :
- Redis (broker)
- `celery worker`
- `celery beat` (planificateur)

Le mode **sans Celery** permet de :
- déployer **uniquement l’API Django** (+ MySQL + Redis pour cache/USSD),
- exécuter le scoring **immédiatement** (synchrone) à la soumission,
- planifier les tâches récurrentes via le **planificateur du système** (Windows Task Scheduler ou `cron` Linux).

---

## 2. Celery vs sans Celery — comparaison

```
MODE CELERY (complet)
─────────────────────
Client → API Django → file Redis → Celery Worker → scoring / ML
                              ↑
                         Celery Beat (03:00 retrain, etc.)

MODE SANS CELERY (simplifié)
────────────────────────────
Client → API Django → scoring immédiat (dans la requête HTTP)
Planificateur OS → commandes Django (retrain, maintenance)
```

| Critère | Avec Celery | Sans Celery |
|---------|-------------|-------------|
| Processus à gérer | API + Worker + Beat + Redis | API + Redis (cache) |
| Scoring crédit | Asynchrone (rapide pour le client) | Synchrone (client attend 2–10 s) |
| Retraining 03:00 | Automatique via Beat | Task Scheduler / cron |
| Complexité déploiement | Élevée | Faible |
| Charge simultanée | Meilleure | Limitée (scoring bloque un worker HTTP) |
| Idéal pour | Production, forte charge | Démo, TFC, petit VPS, Windows Server |

**Redis reste utile** même sans Celery : cache Django, sessions USSD, rate limiting. Tu n’as pas besoin de Redis **comme broker Celery**, mais la config `REDIS_URL` reste recommandée.

---

## 3. Comment ça marche techniquement

### A) Couche de compatibilité — `apps/core/celery_compat.py`

Les fichiers `apps/credits/tasks.py` et `apps/scoring/tasks.py` utilisent un décorateur `@shared_task` **compatible Celery** :

- **Si Celery est installé** → comportement normal (tâches en file d’attente).
- **Si Celery est absent** → la fonction reste une fonction Python normale, avec `.delay()` qui l’exécute **tout de suite**.

```python
# Exemple : même code, deux comportements
process_credit_scoring.delay(demande_id)

# Avec Celery    → mise en file, retour immédiat à l’API
# Sans Celery    → scoring exécuté maintenant, client attend la fin
```

### B) Settings dédiés

| Fichier | Usage |
|---------|-------|
| `config/settings/nocelery.py` | Développement local sans Celery |
| `config/settings/production_nocelery.py` | Production sans Celery (HTTPS, Cloudinary, Sentry…) |

Ces settings **retirent** `django_celery_beat` et `django_celery_results` des `INSTALLED_APPS`.

### C) Démarrage sans crash si Celery manque

`config/__init__.py` importe Celery dans un `try/except`. Si Celery n’est pas installé, `celery_app = None` et Django démarre quand même.

### D) Fallback dans la vue crédit

`apps/credits/views.py` tente `.delay()` puis, en cas d’échec, appelle la fonction directement :

```python
try:
    process_credit_scoring.delay(demande.pk)
except Exception:
    process_credit_scoring(demande.pk)
```

---

## 4. Ce qui change concrètement pour l’utilisateur

### Client qui demande un crédit

| Étape | Avec Celery | Sans Celery |
|-------|-------------|-------------|
| Soumission | Réponse immédiate « Analyse en cours… » | Réponse après scoring (quelques secondes) |
| Consultation score | Rafraîchir après quelques secondes | Score déjà disponible à la réponse |
| Décision auto (score ≥ 60) | Crédit créé par le worker | Crédit créé avant la réponse HTTP |

### Agent / Analyste

- Aucun changement fonctionnel côté API.
- Le endpoint `GET /api/v1/risk/model-status/` affiche le dernier retraining (même en mode sans Celery).

---

## 5. Prérequis serveur

### Logiciels obligatoires

| Composant | Version min. | Rôle |
|-----------|--------------|------|
| Python | 3.12+ | Runtime Django |
| MySQL | 8.0+ | Base de données |
| Redis | 7+ (recommandé) | Cache + sessions USSD |

### Logiciels **non** requis en mode sans Celery

- Celery
- Worker Celery
- Celery Beat

### Fichiers du projet concernés

```
backend/
├── config/settings/nocelery.py              # Dev sans Celery
├── config/settings/production_nocelery.py     # Prod sans Celery
├── apps/core/celery_compat.py               # Compatibilité tâches
├── apps/credits/tasks.py                    # Scoring, maintenance crédit
├── apps/scoring/tasks.py                    # Retraining ML
└── apps/scoring/management/commands/
    ├── retrain_xgboost.py                     # Retrain manuel / planifié
    └── score_demande.py                       # Scoring forcé sur 1 demande
```

---

## 6. Installation pas à pas

### Étape 1 — Cloner et entrer dans le backend

```powershell
cd C:\chemin\vers\Simbisa\backend
```

### Étape 2 — Environnement virtuel Python

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements\production.txt
```

> **Note** : `requirements/production.txt` inclut encore Celery dans les dépendances. Ce n’est pas bloquant : le mode `nocelery` ignore simplement Celery au runtime. Pour un déploiement ultra-minimal, tu peux retirer `celery`, `django-celery-beat` et `django-celery-results` du fichier requirements (optionnel).

### Étape 3 — Fichier `.env`

```powershell
copy .env.example .env
```

Modifier au minimum :

```env
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production_nocelery
SECRET_KEY=<clé-256-bits-aléatoire>
ALLOWED_HOSTS=ton-domaine.com,IP-du-serveur

DB_HOST=localhost
DB_NAME=simbisa_db
DB_USER=simbisa_user
DB_PASSWORD=<mot-de-passe-fort>

REDIS_URL=redis://localhost:6379/0
```

### Étape 4 — Base de données

```powershell
# MySQL doit être démarré
python manage.py migrate --settings=config.settings.production_nocelery

# Données de démo (optionnel, dev uniquement)
python manage.py seed_demo --settings=config.settings.production_nocelery
```

### Étape 5 — Modèle ML initial

```powershell
python -m mltraining.src.train_xgboost
```

Vérifie que ces fichiers existent :
- `mltraining/models/xgboost_v2.joblib`
- `mltraining/models/scaler.joblib`
- `mltraining/models/features.json`

### Étape 6 — Fichiers statiques (production)

```powershell
python manage.py collectstatic --noinput --settings=config.settings.production_nocelery
```

---

## 7. Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DJANGO_SETTINGS_MODULE` | Oui | `config.settings.production_nocelery` en prod |
| `SECRET_KEY` | Oui | Clé secrète Django (256 bits) |
| `DB_*` | Oui | Connexion MySQL |
| `REDIS_URL` | Recommandé | Cache + USSD |
| `ML_MODEL_PATH` | Recommandé | Chemin modèle XGBoost |
| `OPENAI_API_KEY` | Non | RAG (sinon template fallback) |
| `EMAIL_HOST_*` | Non | OTP / reset password par e-mail |

---

## 8. Lancer l’API en développement

```powershell
cd backend
.\.venv\Scripts\activate
python manage.py runserver --settings=config.settings.nocelery
```

API disponible sur : `http://localhost:8000`  
Swagger : `http://localhost:8000/api/docs/`

**Pas besoin** de lancer `celery worker` ni `celery beat`.

---

## 9. Déployer en production

### Option A — Gunicorn (Linux / WSL)

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production_nocelery
gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120
```

> **Important** : `--timeout 120` car le scoring synchrone peut prendre plusieurs secondes.

### Option B — Windows Server (NSSM ou service)

Créer un service Windows qui exécute :

```powershell
C:\chemin\backend\.venv\Scripts\python.exe -m gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
```

Avec variable d’environnement :
```
DJANGO_SETTINGS_MODULE=config.settings.production_nocelery
```

### Option C — Docker (API seule, sans services celery)

Dans `docker-compose.yml`, lance **uniquement** :

```bash
docker-compose up -d db redis api
```

Puis configure `DJANGO_SETTINGS_MODULE=config.settings.production_nocelery` dans le service `api` (au lieu de `development`).

**Ne pas démarrer** les services `celery` et `celery-beat`.

### Reverse proxy (Nginx)

```
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_read_timeout 120s;   # scoring synchrone
    proxy_connect_timeout 120s;
}
```

---

## 10. Tâches planifiées sans Celery Beat

En mode Celery, ces tâches sont automatiques. **Sans Celery**, tu dois les planifier toi-même.

| Tâche | Fréquence recommandée | Commande |
|-------|----------------------|----------|
| Ré-entraînement XGBoost | **Tous les jours à 03:00** | `retrain_xgboost` |
| Échéances en retard | **Tous les jours à 06:00** | `run_credit_maintenance --only overdue` |
| Rappels paiement J-3 | **Tous les jours à 08:00** | `run_credit_maintenance --only reminders` |

Fuseau horaire du projet : **Africa/Kinshasa** (UTC+1 / UTC+2 selon saison).

### Windows Task Scheduler — Retraining 03:00

1. Ouvrir **Planificateur de tâches** → **Créer une tâche**.
2. **Général** : exécuter même si l’utilisateur n’est pas connecté.
3. **Déclencheurs** : quotidien, **03:00:00**.
4. **Actions** → Nouveau :

   **Programme** :
   ```
   C:\chemin\vers\Simbisa\backend\.venv\Scripts\python.exe
   ```

   **Arguments** :
   ```
   manage.py retrain_xgboost --settings=config.settings.production_nocelery
   ```

   **Répertoire de démarrage** :
   ```
   C:\chemin\vers\Simbisa\backend
   ```

5. **Conditions** : décocher « Mettre fin si sur batterie » (si laptop).

### Windows — Maintenance crédit (exemple 06:00)

Même procédure, arguments :
```
manage.py run_credit_maintenance --settings=config.settings.production_nocelery
```

### Linux cron — exemples

```cron
# Ré-entraînement ML — 03:00 Kinshasa
0 3 * * * cd /opt/simbisa/backend && /opt/simbisa/backend/.venv/bin/python manage.py retrain_xgboost --settings=config.settings.production_nocelery >> /var/log/simbisa/retrain.log 2>&1

# Maintenance crédit — 06:00
0 6 * * * cd /opt/simbisa/backend && /opt/simbisa/backend/.venv/bin/python manage.py run_credit_maintenance --settings=config.settings.production_nocelery >> /var/log/simbisa/maintenance.log 2>&1
```

### Que fait `retrain_xgboost` ?

1. Lit les **décisions humaines** des agents (`DecisionCredit` avec `is_automatic=False`).
2. Construit le dataset :
   - `approuve` → label 0 (bon risque)
   - `rejete` → label 1 (mauvais risque)
3. Utilise les `feature_vector` stockés lors du scoring.
4. Ré-entraîne XGBoost si **≥ 200 échantillons** (configurable).
5. Sauvegarde le modèle dans `mltraining/models/`.
6. Enregistre un historique dans la table `model_training_run`.

Vérifier le résultat :
```powershell
python manage.py retrain_xgboost --settings=config.settings.production_nocelery
# ou via API (Analyste risque) :
# GET /api/v1/risk/model-status/
```

---

## 11. Commandes de maintenance

Toutes les commandes utilisent le même pattern :

```powershell
python manage.py <commande> --settings=config.settings.production_nocelery
```

| Commande | Description |
|----------|-------------|
| `retrain_xgboost` | Ré-entraîne le modèle ML sur les décisions agents |
| `retrain_xgboost --min-samples 100` | Seuil minimum d’échantillons (défaut : 200) |
| `score_demande <id>` | Force le scoring d’une demande précise |
| `run_credit_maintenance` | Échéances en retard + rappels |
| `run_credit_maintenance --only overdue` | Uniquement échéances en retard |
| `run_credit_maintenance --only reminders` | Uniquement rappels J-3 |

### Exemples

```powershell
# Scoring manuel demande #42
python manage.py score_demande 42 --settings=config.settings.nocelery

# Retrain immédiat (test)
python manage.py retrain_xgboost --min-samples 50 --settings=config.settings.nocelery
```

---

## 12. Vérifications après déploiement

### Checklist

- [ ] `GET http://ton-serveur:8000/health/` → OK
- [ ] `GET http://ton-serveur:8000/api/docs/` → Swagger accessible
- [ ] Connexion JWT (`POST /api/v1/auth/login/`) → tokens reçus
- [ ] Soumission crédit client → scoring terminé, décision renvoyée
- [ ] `GET /api/v1/risk/model-status/` (analyste) → statut modèle
- [ ] Tâche planifiée Windows/cron testée manuellement une fois
- [ ] Logs : `backend/logs/simbisa.log` sans erreurs critiques

### Test scoring synchrone

1. Connecte-toi en tant que **client** (seed ou compte réel).
2. Soumets une demande : `POST /api/v1/credits/`.
3. Attends la réponse (peut prendre 5–15 s selon le serveur).
4. Vérifie : `GET /api/v1/scoring/me/` ou détail de la demande.

### Test retraining

```powershell
python manage.py retrain_xgboost --settings=config.settings.production_nocelery
```

Réponses possibles :
- `{'trained': True, ...}` → succès
- `{'trained': False, 'reason': 'insufficient_samples'}` → normal au début (pas assez de décisions agents)
- `{'trained': False, 'reason': 'no_human_decisions'}` → aucune décision agent encore

---

## 13. Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| `ModuleNotFoundError: celery` | Celery non installé + mauvais import | Utiliser `config.settings.nocelery` ; vérifier `celery_compat.py` |
| Timeout 502 sur demande crédit | Nginx/proxy timeout trop court | Augmenter `proxy_read_timeout` à 120s |
| Scoring très lent | Mode synchrone + serveur faible | Réduire workers, optimiser MySQL, ou passer à Celery |
| Retrain skip « insufficient_samples » | < 200 décisions agents | Normal en début ; baisser `--min-samples` en test |
| Modèle ML introuvable | Pas de `train_xgboost` initial | `python -m mltraining.src.train_xgboost` |
| Beat migration error | Settings nocelery sans beat | Normal : migrations beat ignorées si app retirée |

### Logs utiles

```powershell
# Windows PowerShell
Get-Content backend\logs\simbisa.log -Tail 50 -Wait
```

---

## 14. Quand passer au mode Celery

Passe au mode **complet avec Celery** si :

- tu as **plus de 50 demandes de crédit / heure**,
- le scoring synchrone provoque des **timeouts** fréquents,
- tu veux le retraining **automatique** sans Task Scheduler,
- tu déploies en **Docker** avec les services `celery` + `celery-beat` du `docker-compose.yml`.

Pour basculer :
1. `DJANGO_SETTINGS_MODULE=config.settings.production` (ou `development`)
2. Démarrer Redis + `celery -A config worker` + `celery -A config beat`
3. Le code applicatif **ne change pas** (même `tasks.py`, même `.delay()`)

---

## Résumé — Ce que tu fais le jour J du déploiement

```
1. Installer Python, MySQL, Redis sur le serveur
2. Copier le projet backend + créer .env (production_nocelery)
3. pip install -r requirements/production.txt
4. python manage.py migrate --settings=config.settings.production_nocelery
5. python -m mltraining.src.train_xgboost
6. python manage.py collectstatic --settings=config.settings.production_nocelery
7. Lancer Gunicorn avec production_nocelery
8. Configurer Nginx (timeout 120s)
9. Créer 2 tâches planifiées Windows/cron :
   - 03:00 → retrain_xgboost
   - 06:00 → run_credit_maintenance
10. Tester health, login, demande crédit, model-status
```

---

**Propriété Rawbank — Simbisa FinTech Platform**
