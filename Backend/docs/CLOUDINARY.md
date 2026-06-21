# Cloudinary — Stockage des documents KYC

Les scans de pièces d'identité (`Identite.document_scan`) sont stockés sur **Cloudinary** en production (plus sur AWS S3).

---

## Configuration

### 1. Créer un compte Cloudinary

1. Inscription sur [cloudinary.com](https://cloudinary.com/)
2. Récupérer depuis le **Dashboard** :
   - **Cloud name**
   - **API Key**
   - **API Secret**

### 2. Variables `.env` (production)

```env
DJANGO_SETTINGS_MODULE=config.settings.production

CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=votre_secret
```

### 3. Installer les dépendances

```powershell
pip install cloudinary django-cloudinary-storage
# ou
pip install -r requirements/production.txt
```

---

## Comportement technique

| Environnement | Stockage |
|---------------|----------|
| **Développement** (`development`) | Fichiers locaux `backend/media/` |
| **Production** (`production`) | Cloudinary dossier `simbisa/kyc/` |

Le backend utilise `KYCCloudinaryStorage` (`apps/core/storage.py`) :
- type **`authenticated`** — URLs signées, pas d'accès public direct
- `resource_type: auto` — images et PDF acceptés

---

## Upload côté API

Le client soumet son KYC :

```
POST /api/v1/clients/me/identite/
Content-Type: multipart/form-data
Authorization: Bearer <token>

type_piece=carte_electeur
numero_piece=...
date_expiration=2028-12-31
document_scan=<fichier>
```

En production, le fichier est envoyé automatiquement sur Cloudinary.

---

## Test en local avec Cloudinary (optionnel)

Pour tester Cloudinary sans passer en prod, ajoute les variables dans `.env` et utilise temporairement :

```powershell
python manage.py runserver --settings=config.settings.production
```

Ou copie le bloc Cloudinary de `production.py` dans `development.py` si besoin fréquent.

---

## Sécurité

- Ne jamais committer `CLOUDINARY_API_SECRET` dans Git
- Activer **authenticated delivery** dans les paramètres Cloudinary
- Limiter les formats acceptés côté serializer si besoin (PDF, JPEG, PNG)

---

## Migration depuis AWS S3

Les anciennes variables AWS ne sont plus utilisées :

```env
# OBSOLÈTE — à supprimer
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_STORAGE_BUCKET_NAME=
```

Les fichiers déjà sur S3 doivent être migrés manuellement vers Cloudinary si tu avais une prod S3 existante.
