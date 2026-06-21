# Seeders — Données de démonstration Simbisa

Guide pour peupler MySQL avec des comptes et données de test (REST, mobile, futur USSD).

---

## Prérequis

```powershell
cd c:\Users\USER\Simbisa\backend

# Environnement virtuel (une seule fois)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Windows : PyMySQL au lieu de mysqlclient (voir requirements/development-windows.txt)
pip install -r requirements\development-windows.txt

# MySQL démarré — voir MYSQL_SETUP.md
copy .env.example .env
python manage.py migrate
```

> **Important** : utilisez toujours le Python du venv (`.\.venv\Scripts\python.exe` ou après `Activate.ps1`).  
> Sans activation, `python manage.py` utilise le Python système → `ModuleNotFoundError: No module named 'django'`.

---

## Commande principale

```powershell
python manage.py seed_demo
```

### Options

| Option | Description |
|--------|-------------|
| `--flush` | Supprime d’abord les utilisateurs demo (`+243900000*`) puis re-seed |
| `--no-scoring` | Plus rapide : sans exécution du pipeline scoring |

```powershell
python manage.py seed_demo --flush
```

---

## Mot de passe commun

**`Test123!`** pour tous les comptes ci-dessous.

---

## Comptes créés

| Rôle | Téléphone | Usage test |
|------|-----------|------------|
| **Administrateur** | `+243900000000` | Taux CDF/USD, admin Django |
| **Agent de crédit** | `+243900000002` | KYC, scoring détail, mémo RAG |
| **Responsable crédit** | `+243900000003` | Idem agent |
| **Analyste risque** | `+243900000004` | Vues risque |
| **Auditeur** | `+243900000005` | `GET /api/v1/audit/` |
| **Client Jean** | `+243900000010` | KYC valide, wallets, MM, epargne + historique, demandes credit scorees |
| **Client Marie** | `+243900000011` | Sans KYC — demande credit rejetee (regles) |
| **Client Paul** | `+243900000012` | Credit USD actif, dossier sensible 900 USD, exceptions manager |

> Ces numéros sont au format attendu par l’API et serviront de **MSISDN USSD** en phase d’intégration telco.

---

## Données métier incluses

| Domaine | Détail |
|---------|--------|
| **Plateforme** | Taux `2250 CDF = 1 USD` + plafonds credit (min/max/agent/manager) |
| **Wallets** | Jean : $250 + FC500 000 ; Paul : $120 + FC800 000 |
| **Mobile Money** | Orange Money + M-Pesa (Jean), Airtel + Orange (Paul) — historique transactions |
| **Epargne** | Comptes USD/CDF avec objectifs + **historique operations** (depots) |
| **Credits** | Jean : USD 400 + CDF 500k (scoring) + 1 refus historique ; Marie : USD 200 sans KYC ; Paul : USD 900 (sensible) + CDF 1.8M |
| **Credit actif** | Paul : $280 approuve, echeances + 1 remboursement |
| **Scoring** | Pipeline complet sur demandes `en_analyse` (regles, MM, comportement, IA) |
| **Exceptions** | 2 dossiers manager (plafond Paul 900 USD, delai CDF) |
| **Audit** | Journal (connexions, KYC, decisions) + decisions credit tracees |
| **RAG** | 2 documents politique Rawbank |

---

## Tester rapidement (curl)

### Login client Jean

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"telephone\":\"+243900000010\",\"password\":\"Test123!\"}"
```

Copier `data.tokens.access` puis :

```bash
TOKEN="<access>"

curl -s http://localhost:8000/api/v1/wallets/me/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/v1/scoring/me/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/v1/credits/me/ -H "Authorization: Bearer $TOKEN"
```

### Login admin — taux de change

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"telephone\":\"+243900000000\",\"password\":\"Test123!\"}"

curl -s -X PATCH http://localhost:8000/api/v1/settings/admin/taux-change/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"cdf_per_usd\": 2300}"
```

### Demande crédit (Marie — doit échouer KYC)

```bash
# Login Marie puis POST /api/v1/credits/ → erreur kyc_not_validated
```

---

## Scoring et Celery

`seed_demo` lance le scoring **en synchrone** (sans Redis/Celery) pour les demandes de Jean.

En production / test async :

```powershell
# Terminal 1
python manage.py runserver

# Terminal 2
celery -A config worker -l info -Q default,scoring,rag
```

Puis soumettre une nouvelle demande via `POST /api/v1/credits/`.

---

## Réinitialiser

```powershell
python manage.py seed_demo --flush
```

Ou réinitialiser toute la base (dev uniquement) :

```powershell
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_demo
```

---

## Fixtures existantes

| Fichier | Commande |
|---------|----------|
| `apps/authentication/fixtures/roles.json` | `python manage.py loaddata roles` |

`seed_demo` appelle automatiquement `loaddata roles`.

---

## USSD (simulateur)

Après `seed_demo`, les clients demo ont le **PIN USSD `0000`**.

- Simulateur web : http://localhost:8000/api/v1/ussd/simulator/
- Guide : [USSD_SIMULATEUR.md](./USSD_SIMULATEUR.md)

---

## Voir aussi

- [API_REFERENCE.md](./API_REFERENCE.md)
- [MYSQL_SETUP.md](./MYSQL_SETUP.md)
- [ML_ET_INTEGRATION.md](./ML_ET_INTEGRATION.md)
