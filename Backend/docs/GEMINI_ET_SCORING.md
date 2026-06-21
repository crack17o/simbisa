# Gemini + Scoring — Guide de mise en route Simbisa

Ce guide explique **exactement quoi faire** pour activer :
1. **Gemini** (mémos RAG après scoring)
2. **Le scoring XGBoost** (décision de crédit — indépendant de Gemini)

> **Important** : le scoring crédit (XGBoost + SHAP/LIME) et le LLM (Gemini) sont **deux systèmes séparés**.
> - **Scoring** = modèle local `mltraining/models/*.joblib`
> - **RAG / mémo** = API Gemini (ou OpenAI en alternative)

---

## 1. Architecture après Option B

```
Demande crédit (POST /api/v1/credits/)
        ↓
ScoringOrchestrator (XGBoost + règles + MM + comportemental)
        ↓
Décision (auto ≥60 | validation agent <60)
        ↓
RAGGenerator.generate_credit_memo()
        ├── VectorRetriever (embeddings Gemini + similarité cosinus)
        └── LLMProvider Gemini (mémo rédigé)
```

Fichiers clés :

```
backend/apps/rag/services/
├── llm/
│   ├── base.py              # interface LLMProvider
│   ├── gemini_provider.py   # génération Gemini
│   ├── openai_provider.py   # alternative OpenAI
│   └── factory.py           # get_llm_provider()
├── embeddings/
│   ├── gemini_embedder.py   # embeddings Gemini
│   ├── openai_embedder.py
│   └── factory.py
├── embedder.py              # indexation documents
├── retriever.py             # recherche vectorielle
└── generator.py             # orchestration RAG
```

---

## 2. Prérequis

| Composant | Obligatoire pour | Où l'obtenir |
|-----------|------------------|--------------|
| **Clé API Gemini** | Mémos RAG + embeddings | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Modèle XGBoost** | Scoring crédit | Entraînement local (`train_xgboost`) |
| **MySQL** | Tout | Déjà configuré |
| **Redis** | Cache / USSD (recommandé) | Déjà configuré |

---

## 3. Installation des dépendances

```powershell
cd backend
.\.venv\Scripts\activate
pip install -r requirements\development.txt
# ou en prod :
pip install -r requirements\production.txt
```

La dépendance Gemini est : `google-generativeai`.

---

## 4. Configuration `.env`

Copie et édite `.env` :

```powershell
copy .env.example .env
```

### Section Gemini (RAG)

```env
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIza...votre_cle...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
RAG_RETRIEVAL_K=5
```

### Section Scoring ML (XGBoost — pas Gemini)

```env
ML_MODEL_PATH=mltraining/models/xgboost_v2.joblib
ML_SCALER_PATH=mltraining/models/scaler.joblib
ML_FEATURES_PATH=mltraining/models/features.json
```

### Alternative OpenAI (optionnel)

```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

---

## 5. Mettre en route le scoring XGBoost

Le scoring **ne passe pas par Gemini**. Il utilise le modèle entraîné localement.

### Étape 1 — Entraîner le modèle (si pas encore fait)

```powershell
cd backend
python -m mltraining.src.train_xgboost
```

Vérifie que ces fichiers existent :
- `mltraining/models/xgboost_v2.joblib`
- `mltraining/models/scaler.joblib`
- `mltraining/models/features.json`

### Étape 2 — Migrations + données de démo

```powershell
python manage.py migrate
python manage.py seed_demo
```

Le seeder lance aussi le scoring sur les demandes de démo.

### Étape 3 — Tester le scoring

```powershell
# Scoring manuel sur demande #1
python manage.py score_demande 1
```

Ou via API (agent) :
- `POST /api/v1/scoring/<demande_id>/trigger/`
- `GET /api/v1/scoring/<demande_id>/`

### Barème de décision actuel

| Score global | Décision |
|--------------|----------|
| **60 – 100** | Approuvé automatiquement |
| **40 – 60** | Validation agent requise |
| **< 40** | Validation agent + alerte « dangereux » |

### Mode simulation (sans modèle)

Si `xgboost_v2.joblib` est absent, `AIEngine` bascule en **mode simulation** (scores approximatifs). Pour la prod / TFC, entraîne toujours le modèle.

### Ré-entraînement quotidien (03:00)

Basé sur les **décisions des agents** (pas Gemini) :

```powershell
python manage.py retrain_xgboost
```

Planifier via Task Scheduler Windows ou cron (voir `docs/DEPLOIEMENT_SANS_CELERY.md`).

---

## 6. Mettre en route Gemini (RAG)

### Étape 1 — Indexer les documents politiques

Après `seed_demo` ou ajout manuel de documents :

```powershell
python manage.py rag_embed_documents
```

Options :
- `--force` : recalculer tous les embeddings
- `--type policy` : type de document (défaut)

### Étape 2 — Vérifier le statut RAG

Connecte-toi en **agent de crédit**, puis :

```
GET /api/v1/rag/status/
```

Réponse attendue :

```json
{
  "success": true,
  "data": {
    "llm_provider": "gemini",
    "llm_available": true,
    "llm_model": "gemini-2.0-flash",
    "embedding_provider": "gemini",
    "embedding_available": true,
    "documents_policy": 2,
    "documents_embedded": 2,
    "retrieval_k": 5
  }
}
```

Si `llm_available: false` → vérifie `GEMINI_API_KEY` dans `.env` et redémarre le serveur.

### Étape 3 — Générer un mémo

Après qu'une demande a été scorée :

```
POST /api/v1/rag/memo/<demande_id>/
Authorization: Bearer <token_agent>
```

Le mémo est généré par Gemini à partir du contexte récupéré + données SHAP.

### Étape 4 — Mémo automatique au scoring

Lors du scoring (`ScoringOrchestrator`), un mémo est aussi tenté automatiquement si Gemini est configuré. Sinon → template local.

---

## 7. Démarrer le serveur

### Développement

```powershell
python manage.py runserver
```

### Sans Celery (scoring synchrone)

```powershell
python manage.py runserver --settings=config.settings.nocelery
```

### Production

```powershell
set DJANGO_SETTINGS_MODULE=config.settings.production_nocelery
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
```

---

## 8. Checklist complète (jour J)

```
[ ] pip install -r requirements/development.txt
[ ] .env configuré (GEMINI_API_KEY + ML_MODEL_PATH)
[ ] python manage.py migrate
[ ] python -m mltraining.src.train_xgboost
[ ] python manage.py seed_demo
[ ] python manage.py rag_embed_documents
[ ] GET /api/v1/rag/status/ → llm_available: true
[ ] POST demande crédit (client) → scoring OK
[ ] POST /api/v1/rag/memo/<id>/ (agent) → mémo Gemini
[ ] (optionnel) planifier retrain_xgboost à 03:00
```

---

## 9. Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| `llm_available: false` | Clé Gemini absente | `GEMINI_API_KEY` dans `.env`, redémarrer |
| Mémo = template local | Erreur API Gemini | Voir logs `backend/logs/simbisa.log` |
| `documents_embedded: 0` | Pas d'indexation | `python manage.py rag_embed_documents` |
| Score toujours en simulation | Modèle ML absent | `python -m mltraining.src.train_xgboost` |
| Scoring timeout | Mode synchrone + serveur lent | `--timeout 120` Gunicorn ou activer Celery |
| Erreur `google.generativeai` | Package manquant | `pip install google-generativeai` |

---

## 10. Résumé : qui fait quoi ?

| Fonction | Technologie | Config `.env` |
|----------|-------------|---------------|
| Score crédit (0–100) | XGBoost local | `ML_MODEL_PATH` |
| Explications SHAP/LIME | scikit-learn / SHAP | — |
| Décision auto / agent | `ScoreAggregator` | — |
| Recherche politiques | Embeddings Gemini | `GEMINI_API_KEY`, `EMBEDDING_PROVIDER` |
| Rédaction mémo | Gemini Flash | `LLM_PROVIDER=gemini` |
| Ré-entraînement ML | XGBoost sur décisions agents | `retrain_xgboost` (03:00) |

---

**Propriété Rawbank — Simbisa FinTech Platform**
