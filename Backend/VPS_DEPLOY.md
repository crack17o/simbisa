# Guide VPS — Simbisa Backend

> Ubuntu 24.04 · Docker Compose · Nginx · Let's Encrypt  
> VPS : `srv1768871.hstgr.cloud` — IP : `187.124.49.36`

---

## Sommaire

1. [Première installation complète](#1-première-installation-complète)
2. [Allumer / éteindre les containers](#2-allumer--éteindre-les-containers)
3. [Mettre à jour le code](#3-mettre-à-jour-le-code)
4. [Transférer la base de données du PC vers le VPS](#4-transférer-la-base-de-données-du-pc-vers-le-vps)
5. [Commandes Docker utiles](#5-commandes-docker-utiles)
6. [Commandes Nginx utiles](#6-commandes-nginx-utiles)
7. [Commandes Linux utiles](#7-commandes-linux-utiles)
8. [MySQL dans Docker](#8-mysql-dans-docker)
9. [Celery](#9-celery)
10. [SSL — Let's Encrypt](#10-ssl--lets-encrypt)
11. [Dépannage](#11-dépannage)

---

## 1. Première installation complète

> À faire **une seule fois** sur le VPS vierge.

### 1.1 — Connexion et sécurisation

```bash
# Depuis ton PC
ssh root@187.124.49.36

apt update && apt upgrade -y

# Créer un utilisateur de déploiement
adduser simbisa
usermod -aG sudo simbisa

# Copier ta clé SSH
rsync --archive --chown=simbisa:simbisa ~/.ssh /home/simbisa

# Pare-feu
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Se reconnecter avec le bon utilisateur
exit
ssh simbisa@187.124.49.36
```

### 1.2 — Installer Git

```bash
git --version   # vérifier si déjà installé
sudo apt install -y git
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

# Autoriser l'utilisateur à utiliser Docker sans sudo
sudo usermod -aG docker $USER
newgrp docker

# Vérification
docker --version && docker compose version
```

### 1.4 — Cloner le projet

```bash
cd /srv
sudo mkdir simbisa && sudo chown simbisa:simbisa simbisa
git clone https://github.com/crack17o/simbisa.git simbisa
cd simbisa/Backend
```

### 1.5 — Créer le `.env`

```bash
cp .env.example .env
nano .env
```

**Valeurs obligatoires :**

```env
SECRET_KEY=<générer: python3 -c "import secrets; print(secrets.token_urlsafe(50))">
DEBUG=False
ALLOWED_HOSTS=srv1768871.hstgr.cloud,187.124.49.36
DJANGO_SETTINGS_MODULE=config.settings.production

DB_HOST=db          # ← TOUJOURS "db", jamais "localhost"
DB_NAME=simbisa_db
DB_USER=simbisa_user
DB_PASSWORD=<mot_de_passe_fort>
DB_PORT=3306
DB_ROOT_PASSWORD=<autre_mot_de_passe_fort>

REDIS_URL=redis://redis:6379/0    # ← "redis" = nom du service Docker
REDIS_PASSWORD=

CORS_ALLOWED_ORIGINS=https://srv1768871.hstgr.cloud
SECURE_SSL_REDIRECT=False         # ← False jusqu'à ce que SSL soit configuré

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 1.6 — Préparer le dossier logs

```bash
mkdir -p /srv/simbisa/Backend/logs
chmod 777 /srv/simbisa/Backend/logs
```

### 1.7 — Lancer les containers

```bash
cd /srv/simbisa/Backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Suivre le démarrage
docker compose logs -f api
```

### 1.8 — Créer le superadmin Django

```bash
docker compose exec api python manage.py createsuperuser
```

### 1.9 — Installer Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/simbisa > /dev/null << 'EOF'
server {
    listen 80;
    server_name srv1768871.hstgr.cloud;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/simbisa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx

# Tester
curl http://srv1768871.hstgr.cloud/health/
```

### 1.10 — SSL avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d srv1768871.hstgr.cloud
sudo certbot renew --dry-run
```

Après le SSL, activer la redirection dans `.env` :

```env
SECURE_SSL_REDIRECT=True
```

Puis redémarrer :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 2. Allumer / éteindre les containers

```bash
cd /srv/simbisa/Backend

# Démarrer (sans rebuild)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Démarrer avec rebuild (après git pull)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Arrêter (conserve les données)
docker compose down

# Redémarrer un seul service
docker compose restart api
docker compose restart celery
docker compose restart celery-beat
docker compose restart redis

# Voir l'état de tous les services
docker compose ps
```

---

## 3. Mettre à jour le code

```bash
cd /srv/simbisa/Backend

# Si git refuse à cause de divergence
git config pull.rebase false

# Synchroniser avec GitHub (écrase les changements locaux)
git fetch origin
git reset --hard origin/main

# Rebuild et redémarrer
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Vérifier que tout tourne
docker compose ps
docker compose logs --tail=30 api
```

> Le `.env` n'est **jamais** touché par `git reset --hard` (il est dans `.gitignore`).

---

## 4. Transférer la base de données du PC vers le VPS

### Option A — Depuis MySQL local (si installé sur le PC)

```bash
# Sur ton PC (PowerShell ou Git Bash)
mysqldump -u root -p simbisa_db > simbisa_backup.sql

# Transférer le fichier sur le VPS
scp simbisa_backup.sql simbisa@187.124.49.36:/srv/simbisa/Backend/
```

### Option B — Depuis Docker sur le PC (si MySQL tourne dans Docker)

```bash
# Sur ton PC
docker exec <nom_container_mysql> mysqldump -u root -p<ROOT_PASSWORD> simbisa_db > simbisa_backup.sql

# Transférer sur le VPS
scp simbisa_backup.sql simbisa@187.124.49.36:/srv/simbisa/Backend/
```

### Importer sur le VPS

```bash
# Sur le VPS — importer dans le container MySQL
docker compose exec -T db mysql -u root -p<DB_ROOT_PASSWORD> simbisa_db < simbisa_backup.sql

# Vérifier
docker compose exec db mysql -u simbisa_user -p<DB_PASSWORD> simbisa_db -e "SHOW TABLES;"
```

### Backup rapide de la BDD sur le VPS

```bash
docker compose exec db mysqldump -u root -p<DB_ROOT_PASSWORD> simbisa_db \
  > backup_$(date +%Y%m%d_%H%M).sql
```

---

## 5. Commandes Docker utiles

```bash
# État des containers
docker compose ps

# Logs en direct (tous les services)
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f api
docker compose logs --tail=50 api

# Entrer dans un container
docker compose exec api bash
docker compose exec db bash

# Lancer une commande Django
docker compose exec api python manage.py <commande>
docker compose exec api python manage.py shell
docker compose exec api python manage.py migrate
docker compose exec api python manage.py makemigrations
docker compose exec api python manage.py collectstatic --noinput

# Copier un fichier hors d'un container
docker cp backend-api-1:/app/apps/scoring/migrations/ ./apps/scoring/migrations/

# Espace utilisé par Docker
docker system df

# Nettoyer les images inutilisées (ne touche pas aux volumes)
docker system prune -f

# Voir les volumes
docker volume ls
```

---

## 6. Commandes Nginx utiles

```bash
# Tester la configuration (TOUJOURS avant de recharger)
sudo nginx -t

# Recharger sans coupure de service (après modification config)
sudo systemctl reload nginx

# Redémarrer complètement
sudo systemctl restart nginx

# Voir le statut
sudo systemctl status nginx

# Voir la config complète chargée
sudo nginx -T

# Logs d'accès en direct
sudo tail -f /var/log/nginx/access.log

# Logs d'erreur en direct
sudo tail -f /var/log/nginx/error.log

# Modifier la config
sudo nano /etc/nginx/sites-available/simbisa
# Puis :
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Commandes Linux utiles

```bash
# Espace disque
df -h

# Mémoire RAM
free -h

# Processus actifs
htop    # ou : top

# Voir les ports ouverts
sudo ss -tlnp

# Pare-feu
sudo ufw status
sudo ufw allow <port>

# Voir les services systemd actifs
sudo systemctl list-units --type=service --state=running

# Redémarrer le VPS (⚠️ coupe tout)
sudo reboot

# Variables d'environnement du .env
cat /srv/simbisa/Backend/.env
grep DB_HOST /srv/simbisa/Backend/.env
```

---

## 8. MySQL dans Docker

```bash
cd /srv/simbisa/Backend

# Connexion utilisateur applicatif
docker compose exec db mysql -u simbisa_user -p simbisa_db
# → entrer DB_PASSWORD

# Connexion root (accès total)
docker compose exec db mysql -u root -p
# → entrer DB_ROOT_PASSWORD

# Retrouver les identifiants
grep -E "DB_USER|DB_PASSWORD|DB_ROOT_PASSWORD|DB_NAME" .env
```

**Commandes SQL utiles :**

```sql
SHOW TABLES;
SHOW DATABASES;
SELECT COUNT(*) FROM auth_user;
DESCRIBE nom_de_table;
EXIT;
```

---

## 9. Celery

```bash
cd /srv/simbisa/Backend

# Logs du worker
docker compose logs -f celery

# Logs du scheduler
docker compose logs -f celery-beat

# Inspecter les workers actifs
docker compose exec celery celery -A config inspect active

# Voir les tâches enregistrées
docker compose exec celery celery -A config inspect registered

# Vider la file d'attente (⚠️ supprime les tâches en attente)
docker compose exec celery celery -A config purge

# Relancer sans rebuild
docker compose restart celery celery-beat
```

---

## 10. SSL — Let's Encrypt

```bash
# Voir la date d'expiration du certificat
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew
sudo systemctl reload nginx

# Le renouvellement automatique est géré par un cron systemd
# Vérifier qu'il est actif :
sudo systemctl status certbot.timer
```

---

## 11. Dépannage

### L'API ne répond pas

```bash
docker compose ps                         # Vérifier les containers
curl http://127.0.0.1:8000/health/        # Tester Django directement
sudo systemctl status nginx               # Vérifier Nginx
sudo ufw status                           # Vérifier le pare-feu
```

### Erreur 502 Bad Gateway

Nginx ne joint pas Django.

```bash
docker compose logs --tail=30 api
docker compose restart api
```

### Container api redémarre en boucle

```bash
docker compose logs --tail=50 api
# Causes fréquentes :
# - DB_HOST=localhost au lieu de DB_HOST=db
# - REDIS_URL mal formé
# - Permission denied sur /app/logs → chmod 777 logs/
grep -E "DB_HOST|REDIS_URL|SECRET_KEY" .env
```

### Nginx retourne sa propre 404

```bash
# La config a peut-être changé sans reload
sudo nginx -t && sudo systemctl reload nginx
```

### Erreur Redis AUTH

```bash
# Si Redis tourne sans mot de passe :
# Mettre REDIS_URL=redis://redis:6379/0 dans .env
# Si Redis tourne AVEC mot de passe (--requirepass) :
# Mettre REDIS_URL=redis://:MOT_DE_PASSE@redis:6379/0
grep REDIS .env
```

### Regénérer la SECRET_KEY

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
# Copier dans .env → TOUJOURS relancer les containers après
```
