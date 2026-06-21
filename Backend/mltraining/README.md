# ML Training — Simbisa Scoring Model

Dossier autonome d'entraînement du modèle XGBoost, séparé du backend Django.

## Installation

```bash
cd mltraining
pip install -r requirements_ml.txt
```

## Entraînement

```bash
python -m mltraining.src.train_xgboost
```

## Artefacts produits

```
models/
├── xgboost_v2.joblib      ← modèle actif
├── xgboost_YYYYMMDD.joblib
├── scaler.joblib
└── features.json
```

Configurez les chemins dans `.env` (`ML_MODEL_PATH`, `ML_SCALER_PATH`, `ML_FEATURES_PATH`).

Guide complet : [`../docs/ML_ET_INTEGRATION.md`](../docs/ML_ET_INTEGRATION.md).
