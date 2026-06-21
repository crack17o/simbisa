"""
Entraînement du modèle XGBoost de scoring crédit (multi-devise CDF / USD).
Lance avec : python -m mltraining.src.train_xgboost
"""
import json
import logging
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from datetime import datetime

import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, brier_score_loss, classification_report

logging.basicConfig(level=logging.INFO, format='%(asctime)s — %(levelname)s — %(message)s')
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent / 'models'
MODELS_DIR.mkdir(exist_ok=True)

FEATURE_NAMES = [
    'flux_entrants_moyen', 'flux_sortants_moyen', 'solde_moyen_mensuel',
    'regularite_revenus_pct', 'volatilite_depenses_pct', 'nb_mois_actifs',
    'progression_objectif_moy', 'taux_remboursement_pct', 'nb_defauts',
    'anciennete_jours', 'montant_demande', 'duree_mois', 'age', 'revenu_estime',
    'devise_demande',
]


def generate_synthetic_data(n_samples: int = 10000, random_state: int = 42) -> tuple:
    rng = np.random.RandomState(random_state)
    n_usd = n_samples // 2
    n_cdf = n_samples - n_usd

    def _block(n, devise_encoded, montant_range, flux_scale, revenu_scale):
        return pd.DataFrame({
            'flux_entrants_moyen': rng.lognormal(flux_scale, 0.8, n),
            'flux_sortants_moyen': rng.lognormal(flux_scale - 0.7, 0.9, n),
            'solde_moyen_mensuel': rng.lognormal(flux_scale - 1.0, 1.0, n),
            'regularite_revenus_pct': rng.beta(3, 1, n) * 100,
            'volatilite_depenses_pct': rng.beta(1, 3, n) * 100,
            'nb_mois_actifs': rng.randint(1, 7, n),
            'progression_objectif_moy': rng.uniform(0, 100, n),
            'taux_remboursement_pct': rng.beta(4, 1, n) * 100,
            'nb_defauts': rng.choice([0, 0, 0, 0, 1, 2], n),
            'anciennete_jours': rng.randint(30, 730, n),
            'montant_demande': rng.uniform(montant_range[0], montant_range[1], n),
            'duree_mois': rng.randint(1, 13, n),
            'age': rng.randint(20, 60, n),
            'revenu_estime': rng.lognormal(revenu_scale, 0.7, n),
            'devise_demande': np.full(n, devise_encoded),
        })

    usd = _block(n_usd, 1.0, (50, 1500), 5.5, 5.0)
    cdf = _block(n_cdf, 0.0, (140_000, 4_200_000), 12.5, 12.0)
    X = pd.concat([usd, cdf], ignore_index=True)
    X = X.sample(frac=1, random_state=random_state).reset_index(drop=True)

    flux_ref = np.where(
        X['devise_demande'] >= 0.5,
        X['flux_entrants_moyen'].clip(0, 500),
        X['flux_entrants_moyen'].clip(0, 2_000_000) / 4000,
    )
    montant_ref = np.where(
        X['devise_demande'] >= 0.5,
        X['montant_demande'],
        X['montant_demande'] / 2250,
    )

    logit = (
        -2.5
        + 0.008 * (200 - flux_ref)
        - 0.015 * X['regularite_revenus_pct']
        + 0.012 * X['volatilite_depenses_pct']
        - 0.01 * X['progression_objectif_moy']
        - 0.018 * X['taux_remboursement_pct']
        + 1.5 * X['nb_defauts'].clip(0, 3)
        - 0.002 * X['anciennete_jours']
        + 0.001 * montant_ref
        - 0.3 * (1 - X['devise_demande'])
    )
    proba = 1 / (1 + np.exp(-logit))
    y = (rng.uniform(0, 1, len(X)) < proba).astype(int)

    logger.info(
        f"Données synthétiques : {len(X)} obs ({n_usd} USD, {n_cdf} CDF), "
        f"{y.mean():.1%} défauts"
    )
    return X[FEATURE_NAMES], y


def train_model():
    logger.info("=== Démarrage entraînement XGBoost Simbisa (multi-devise) ===")

    X, y = generate_synthetic_data(n_samples=10000)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    params = {
        'n_estimators': 400,
        'max_depth': 6,
        'learning_rate': 0.05,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'min_child_weight': 5,
        'gamma': 0.1,
        'reg_alpha': 0.1,
        'reg_lambda': 1.0,
        'scale_pos_weight': (y == 0).sum() / max((y == 1).sum(), 1),
        'random_state': 42,
        'eval_metric': 'auc',
    }

    model = xgb.XGBClassifier(**params)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    auc_scores = cross_val_score(model, X_scaled, y, cv=cv, scoring='roc_auc')
    logger.info(f"AUC CV : {auc_scores.mean():.4f} ± {auc_scores.std():.4f}")

    model.fit(X_scaled, y)

    y_proba = model.predict_proba(X_scaled)[:, 1]
    y_pred = model.predict(X_scaled)

    auc = roc_auc_score(y, y_proba)
    brier = brier_score_loss(y, y_proba)
    gini = 2 * auc - 1

    logger.info(f"AUC final   : {auc:.4f}")
    logger.info(f"Gini        : {gini:.4f}")
    logger.info(f"Brier Score : {brier:.4f}")
    logger.info(f"\n{classification_report(y, y_pred)}")

    version = datetime.now().strftime('%Y%m%d%H%M')
    model_path = MODELS_DIR / f'xgboost_{version}.joblib'
    scaler_path = MODELS_DIR / 'scaler.joblib'
    features_path = MODELS_DIR / 'features.json'

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    with open(features_path, 'w') as f:
        json.dump(FEATURE_NAMES, f, indent=2)

    current_link = MODELS_DIR / 'xgboost_v2.joblib'
    if current_link.exists():
        current_link.unlink()
    try:
        current_link.symlink_to(model_path.name)
    except OSError:
        joblib.dump(model, current_link)

    logger.info(f"Modèle sauvegardé : {model_path}")
    return {'auc': round(auc, 4), 'gini': round(gini, 4)}


if __name__ == '__main__':
    metrics = train_model()
    print(f"\nRÉSULTATS : AUC={metrics['auc']:.4f} | Gini={metrics['gini']:.4f}")
