# Guide de déploiement VPS — Simbisa Backend

> Ubuntu 24.04 · Docker Compose · Nginx · Let's Encrypt

---

## Sommaire

1. [Première installation complète](#1-première-installation-complète)
2. [Lancer / arrêter l'application](#2-lancer--arrêter-lapplication)
3. [Mettre à jour le code (git pull)](#3-mettre-à-jour-le-code-git-pull)
4. [Accéder à MySQL dans Docker](#4-accéder-à-mysql-dans-docker)
5. [Accéder à Celery](#5-accéder-à-celery)
6. [Modifier le `.env` en production](#6-modifier-le-env-en-production)
7. [Logs](#7-logs)
8. [Commandes Django utiles](#8-commandes-django-utiles)
9. [Nginx — modifier la config](#9-nginx--modifier-la-config)
10. [Renouveler le SSL](#10-renouveler-le-ssl)
11. [Dépannage rapide](#11-dépannage-rapide)

---

## 1. Première installation complète

> À faire **une seule fois** sur un VPS vierge.

### 1.1 — Connexion et sécurisation

```bash
# Depuis ton PC
ssh root@<IP_DU_VPS>

# Mettre à jour
apt update && apt upgrade -y

# Créer un utilisateur de déploiement
adduser deploy
usermod -aG sudo deploy

# Copier ta clé SSH
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Pare-feu
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Se reconnecter avec le bon utilisateur
exit
ssh deploy@<IP_DU_VPS>
```

### 1.2 — Installer Git

```bash
git --version          # vérifier si déjà installé

# Si non installé :
sudo apt install -y git
git config --global user.name "Ton Nom"
git config --global user.email "ton@email.com"
```

### 1.3 — Installer Docker

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings

# Clé GPG Docker
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Dépôt Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Autoriser "deploy" à utiliser Docker sans sudo
sudo usermod -aG docker $USER
newgrp docker

# Vérification
docker --version && docker compose version
```

### 1.4 — Cloner le projet

```bash
cd /srv
sudo mkdir simbisa && sudo chown deploy:deploy simbisa
git clone https://github.com/<ton-user>/simbisa.git simbisa
cd simbisa/Backend
```

> **Repo privé ?** Utilise un token :
> `git clone https://<TOKEN>@github.com/<ton-user>/simbisa.git simbisa`

### 1.5 — Configurer le `.env`

```bash
cp .env.example .env
nano .env
```

**Variables obligatoires à modifier :**

```env
# Générer avec : python3 -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=<clé_unique_50_caractères>
DEBUG=False
ALLOWED_HOSTS=ton-domaine.com,<IP_VPS>
DJANGO_SETTINGS_MODULE=config.settings.production

# Base de données — IMPORTANT : DB_HOST doit être "db" (nom du service Docker)
DB_HOST=db
DB_NAME=simbisa_db
DB_USER=simbisa_user
DB_PASSWORD=<mot_de_passe_fort>
DB_ROOT_PASSWORD=<autre_mot_de_passe_fort>

# Redis — IMPORTANT : "redis" = nom du service Docker
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=<mot_de_passe_redis>

# CORS
CORS_ALLOWED_ORIGINS=https://ton-domaine.com

# SSL
SECURE_SSL_REDIRECT=True

# Cloudinary (KYC)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 1.6 — Lancer l'application

```bash
cd /srv/simbisa/Backend

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Suivre le démarrage
docker compose logs -f api

# Vérifier que tout tourne
docker compose ps
```

### 1.7 — Créer le superadmin Django

```bash
docker compose exec api python manage.py createsuperuser
```

### 1.8 — Installer et configurer Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/simbisa
```

Coller (remplace `ton-domaine.com`) :

```nginx
server {
    listen 80;
    server_name ton-domaine.com www.ton-domaine.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /static/ {
        alias /srv/simbisa/Backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /srv/simbisa/Backend/media/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/simbisa /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx && sudo systemctl start nginx
```

### 1.9 — SSL avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ton-domaine.com -d www.ton-domaine.com

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

---

## 2. Lancer / arrêter l'application

```bash
cd /srv/simbisa/Backend

# Démarrer
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Arrêter (garde les volumes/données)
docker compose down

# Arrêter ET supprimer les volumes (⚠️ efface la BDD)
docker compose down -v

# Redémarrer un seul service
docker compose restart api
docker compose restart celery
docker compose restart celery-beat

# Voir l'état de tous les services
docker compose ps
```

---

## 3. Mettre à jour le code (git pull)

```bash
cd /srv/simbisa/Backend

# Récupérer les changements
git pull origin main

# Rebuild et redémarrer (migrations + collectstatic automatiques)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> Les migrations Django et `collectstatic` s'exécutent **automatiquement** au démarrage
> grâce à la commande définie dans `docker-compose.prod.yml`.

---

## 4. Accéder à MySQL dans Docker

### Ouvrir un shell MySQL interactif

```bash
cd /srv/simbisa/Backend

# Se connecter avec l'utilisateur applicatif
docker compose exec db mysql -u simbisa_user -p simbisa_db
# → entrer la valeur de DB_PASSWORD dans .env

# Se connecter en root (accès total)
docker compose exec db mysql -u root -p
# → entrer la valeur de DB_ROOT_PASSWORD dans .env
```

### Commandes MySQL utiles

```sql
-- Lister les tables
SHOW TABLES;

-- Voir les utilisateurs
SELECT user, host FROM mysql.user;

-- Voir la taille de la base
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'simbisa_db'
ORDER BY size_mb DESC;

-- Quitter
EXIT;
```

### Retrouver les identifiants MySQL

Les identifiants sont dans ton fichier `.env` :

```bash
grep -E "DB_USER|DB_PASSWORD|DB_ROOT_PASSWORD|DB_NAME" /srv/simbisa/Backend/.env
```

| Variable | Rôle |
|---|---|
| `DB_USER` | Utilisateur applicatif (`simbisa_user`) |
| `DB_PASSWORD` | Mot de passe de `DB_USER` |
| `DB_ROOT_PASSWORD` | Mot de passe root MySQL |
| `DB_NAME` | Nom de la base (`simbisa_db`) |

### Faire un dump de la base (backup)

```bash
docker compose exec db mysqldump -u root -p<DB_ROOT_PASSWORD> simbisa_db > backup_$(date +%Y%m%d).sql
```

### Restaurer un dump

```bash
docker compose exec -T db mysql -u root -p<DB_ROOT_PASSWORD> simbisa_db < backup_20240101.sql
```

---

## 5. Accéder à Celery

### Voir l'état des workers

```bash
cd /srv/simbisa/Backend

# Logs en direct du worker
docker compose logs -f celery

# Logs du scheduler (beat)
docker compose logs -f celery-beat

# Inspecter les workers actifs
docker compose exec celery celery -A config inspect active

# Voir les tâches enregistrées
docker compose exec celery celery -A config inspect registered

# Statistiques des workers
docker compose exec celery celery -A config inspect stats
```

### Relancer Celery sans tout rebuild

```bash
docker compose restart celery
docker compose restart celery-beat
```

### Vider la file d'attente (purge)

```bash
# ⚠️ Supprime toutes les tâches en attente
docker compose exec celery celery -A config purge
```

### Voir les tâches dans l'admin Django

Les résultats Celery sont visibles dans l'interface admin :
`https://ton-domaine.com/admin/` → **Celery Results** et **Periodic Tasks**

---

## 6. Modifier le `.env` en production

```bash
nano /srv/simbisa/Backend/.env

# Après modification, redémarrer les services concernés
cd /srv/simbisa/Backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

> Un changement de `SECRET_KEY` invalide toutes les sessions JWT actives.
> Un changement de `DB_PASSWORD` nécessite aussi de le changer dans MySQL.

---

## 7. Logs

```bash
cd /srv/simbisa/Backend

# Tous les services en même temps
docker compose logs -f

# Un service spécifique
docker compose logs -f api
docker compose logs -f celery
docker compose logs -f celery-beat
docker compose logs -f db
docker compose logs -f redis

# Les 100 dernières lignes d'un service
docker compose logs --tail=100 api

# Logs applicatifs Django (fichiers dans le container)
docker compose exec api tail -f logs/django.log
```

---

## 8. Commandes Django utiles

```bash
cd /srv/simbisa/Backend

# Shell Django interactif
docker compose exec api python manage.py shell

# Appliquer les migrations manuellement
docker compose exec api python manage.py migrate

# Créer un superutilisateur
docker compose exec api python manage.py createsuperuser

# Collecter les fichiers statiques
docker compose exec api python manage.py collectstatic --noinput

# Voir toutes les migrations et leur état
docker compose exec api python manage.py showmigrations

# Créer les migrations après modification d'un modèle
docker compose exec api python manage.py makemigrations
```

---

## 9. Nginx — modifier la config

```bash
# Éditer la config
sudo nano /etc/nginx/sites-available/simbisa

# Tester avant d'appliquer (ne jamais skipper cette étape)
sudo nginx -t

# Recharger sans coupure de service
sudo systemctl reload nginx

# Statut de Nginx
sudo systemctl status nginx
```

---

## 10. Renouveler le SSL

Le renouvellement est automatique via un cron Certbot. Pour forcer manuellement :

```bash
sudo certbot renew

# Puis recharger Nginx
sudo systemctl reload nginx
```

Pour vérifier la date d'expiration :

```bash
sudo certbot certificates
```

---

## 11. Dépannage rapide

### Le site ne répond pas

```bash
# 1. Vérifier Docker
docker compose ps

# 2. Vérifier Nginx
sudo systemctl status nginx

# 3. Vérifier le pare-feu
sudo ufw status
```

### Erreur 502 Bad Gateway

Nginx ne peut pas joindre le container Django.

```bash
# Vérifier que le container "api" tourne
docker compose ps api

# Regarder ses logs
docker compose logs --tail=50 api

# Redémarrer
docker compose restart api
```

### Le container `api` redémarre en boucle

```bash
# Voir l'erreur exacte
docker compose logs --tail=100 api

# Cause fréquente : .env mal configuré (DB_HOST, REDIS_URL, SECRET_KEY manquant)
grep -E "DB_HOST|REDIS_URL|SECRET_KEY|DEBUG" /srv/simbisa/Backend/.env
```

### La base de données ne démarre pas

```bash
docker compose logs db

# Vérifier l'espace disque
df -h
```

### Regénérer une `SECRET_KEY`

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
# Copier la valeur dans .env puis redémarrer
```

### Voir l'espace disque et les volumes Docker

```bash
# Espace disque global
df -h

# Espace utilisé par Docker
docker system df

# Nettoyer les images et containers inutilisés (⚠️ ne touche pas aux volumes)
docker system prune -f
```
