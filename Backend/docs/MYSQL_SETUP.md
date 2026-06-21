# Configuration MySQL — Backend Simbisa

Guide pour installer MySQL 8, connecter Django, exécuter les migrations et préparer les données initiales.

---

## Options d'installation

| Méthode | Recommandation |
|---------|----------------|
| **Docker Compose** | Développement local (`mysql:8.0` dans `docker-compose.yml`) |
| **MySQL natif** | Windows / Linux sans Docker |
| **Cloud** | AWS RDS MySQL, PlanetScale, Azure Database for MySQL |

---

## Option A — Docker Compose (recommandé)

### 1. Préparer l'environnement

```powershell
cd c:\Users\USER\Simbisa\backend
copy .env.example .env
```

```env
DB_NAME=simbisa_db
DB_USER=simbisa_user
DB_PASSWORD=simbisa_dev_password
DB_ROOT_PASSWORD=simbisa_root_password
DB_HOST=localhost
DB_PORT=3306
```

### 2. Démarrer MySQL et Redis

```powershell
docker compose up -d db redis
```

### 3. Connexion

| Paramètre | Valeur |
|-----------|--------|
| Host | `localhost` |
| Port | `3306` |
| Database | `simbisa_db` |
| User | `simbisa_user` |
| Password | `DB_PASSWORD` |

> Dans Docker Compose, si l'API tourne **dans** un conteneur : `DB_HOST=db`.

---

## Option B — MySQL installé localement

### 1. Installer MySQL 8

- Windows : [dev.mysql.com/downloads](https://dev.mysql.com/downloads/installer/)
- Ou : `choco install mysql`

### 2. Créer la base

```sql
CREATE DATABASE simbisa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'simbisa_user'@'localhost' IDENTIFIED BY 'simbisa_dev_password';
GRANT ALL PRIVILEGES ON simbisa_db.* TO 'simbisa_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Dépendance Python

```powershell
pip install mysqlclient
```

Sur Windows, si la compilation échoue, installez les [MySQL Connector/C build tools](https://dev.mysql.com/downloads/connector/c/) ou utilisez :

```powershell
pip install pymysql
```

Puis dans `config/__init__.py` ou `manage.py` (si besoin) :

```python
import pymysql
pymysql.install_as_MySQLdb()
```

---

## Initialiser Django

```powershell
cd c:\Users\USER\Simbisa\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements/development.txt

$env:DJANGO_SETTINGS_MODULE="config.settings.development"
python manage.py migrate
python manage.py loaddata roles
python manage.py createsuperuser
python manage.py runserver
```

---

## RAG et embeddings

Les embeddings sont stockés en **JSONField** MySQL (pas de pgvector). Aucune extension spéciale requise.

---

## Celery + Redis

```powershell
celery -A config worker -l info -Q default,scoring,rag
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DB_NAME` | `simbisa_db` | Nom de la base |
| `DB_USER` | `simbisa_user` | Utilisateur |
| `DB_PASSWORD` | — | Mot de passe |
| `DB_HOST` | `localhost` | Hôte |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_ROOT_PASSWORD` | — | Root (Docker uniquement) |

---

## Dépannage

| Erreur | Solution |
|--------|----------|
| `Can't connect to MySQL server` | `docker compose up -d db` |
| `Access denied` | Vérifier `DB_USER` / `DB_PASSWORD` |
| `mysqlclient` build failed (Windows) | Installer MySQL dev libs ou utiliser `pymysql` |
| `Unknown database` | Créer `simbisa_db` ou laisser Docker le créer |
| Charset incorrect | `utf8mb4` (déjà dans `OPTIONS` Django) |

---

## Voir aussi

- [ML_ET_INTEGRATION.md](./ML_ET_INTEGRATION.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
