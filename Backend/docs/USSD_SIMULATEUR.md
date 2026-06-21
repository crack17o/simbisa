# USSD — Simulateur (sans opérateur telco)

L’app `apps/ussd` est **fonctionnelle** avec une passerelle **simulée**. Aucune connexion Orange / Vodacom / Airtel.

---

## Démarrage rapide

```powershell
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

1. Ouvrir le simulateur : **http://localhost:8000/api/v1/ussd/simulator/**
2. Cliquer **Nouvelle session *123#***
3. Entrer le PIN : **`0000`** (clients seed)
4. Naviguer avec `1`, `2`, `3`…

---

## Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/v1/ussd/simulator/` | Interface téléphone (HTML) |
| POST | `/api/v1/ussd/simulate/` | Un tour de dialogue (alias callback) |
| POST | `/api/v1/ussd/callback/` | Format passerelle telco (identique) |

### Corps JSON (chaque frappe)

```json
{
  "session_id": "uuid-optionnel",
  "msisdn": "+243900000010",
  "input": "1",
  "service_code": "*123#",
  "operator": "simulated"
}
```

### Réponse

```json
{
  "success": true,
  "data": {
    "session_id": "abc-...",
    "response_type": "CON",
    "message": "SIMBISA Menu:\n1. Mon compte...",
    "end_session": false
  }
}
```

| `response_type` | Effet |
|-----------------|--------|
| `CON` | Session continue — renvoyer `session_id` au prochain appel |
| `END` | Session terminée |

---

## Menu disponible

```
1. Mon compte     → solde USD / CDF
2. Epargne        → liste comptes
3. Credit         → demande (devise, montant, durée, confirmation)
4. Mon score      → moyenne USD + CDF
5. Taux USD/CDF   → taux admin + plafonds
0. Quitter
```

Raccourci : **`00`** = retour menu principal (si authentifié).

---

## Authentification USSD

- PIN **4 chiffres** (hash Django), distinct du mot de passe app
- Défaut seed : `0000` pour `+243900000010`, `011`, `012`
- 3 échecs → blocage 15 minutes

---

## Test curl

```bash
# Nouvelle session
curl -s -X POST http://localhost:8000/api/v1/ussd/simulate/ \
  -H "Content-Type: application/json" \
  -d "{\"msisdn\":\"+243900000010\",\"input\":\"\"}"

# PIN (reprendre session_id de la réponse)
curl -s -X POST http://localhost:8000/api/v1/ussd/simulate/ \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"<ID>\",\"msisdn\":\"+243900000010\",\"input\":\"0000\"}"
```

---

## Configuration `.env`

```env
USSD_SESSION_TTL=180
USSD_SIMULATOR_ENABLED=True
USSD_DEFAULT_PIN=0000
USSD_CALLBACK_SECRET=simulator-dev-secret
USSD_REQUIRE_SECRET=False
```

---

## Branchement telco réel (plus tard)

Remplacer le simulateur par un adaptateur qui mappe le JSON opérateur vers le même `POST /ussd/callback/`. Voir [USSD_INTEGRATION.md](./USSD_INTEGRATION.md).

---

## Logs

Table `ussd_interaction_log` + Django Admin → chaque tour simulé est enregistré.
