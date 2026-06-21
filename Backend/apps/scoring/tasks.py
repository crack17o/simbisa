import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
from apps.core.celery_compat import shared_task
from django.conf import settings
from django.db.models import Q

logger = logging.getLogger('scoring')


def _atomic_joblib_dump(obj, path: Path):
    import joblib
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    joblib.dump(obj, tmp)
    tmp.replace(path)


def _atomic_json_dump(obj, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding='utf-8')
    tmp.replace(path)


@shared_task
def retrain_xgboost_from_agent_decisions(min_samples: int = 200) -> dict:
    """
    Ré-entraîne XGBoost à partir des décisions humaines (agents/managers).

    Labelisation:
    - decision='approuve' => y=0 (risque faible / non-défaut proxy)
    - decision='rejete'   => y=1 (risque élevé / défaut proxy)

    Sources de features:
    - ScoreIA.feature_vector (persisté au moment du scoring)
    - features order: settings.ML_FEATURES_PATH si présent, sinon clés triées.
    """
    from apps.scoring.models import DecisionCredit, ScoreIA

    decisions = (
        DecisionCredit.objects
        .filter(is_automatic=False)
        .filter(decision__in=['approuve', 'rejete'])
        .select_related('id_demande')
        .order_by('-date_decision')[:20000]
    )

    from apps.scoring.models import ModelTrainingRun

    if not decisions.exists():
        logger.info("Retrain: aucune décision humaine disponible — skip.")
        ModelTrainingRun.objects.create(
            model_name='XGBoost',
            status='skipped',
            details={'reason': 'no_human_decisions'},
        )
        return {'trained': False, 'reason': 'no_human_decisions'}

    # Charger l’ordre des features si disponible (doit rester stable)
    features_path = Path(settings.ML_FEATURES_PATH)
    if features_path.exists():
        feature_names = json.loads(features_path.read_text(encoding='utf-8'))
    else:
        feature_names = None

    X_rows = []
    y = []

    # Pré-fetch des ScoreIA liés (évite N+1)
    demande_ids = [d.id_demande_id for d in decisions]
    ia_map = {
        s.id_demande_id: s
        for s in ScoreIA.objects.filter(id_demande_id__in=demande_ids).only('id_demande_id', 'feature_vector')
    }

    for d in decisions:
        s = ia_map.get(d.id_demande_id)
        if not s:
            continue
        fv = s.feature_vector or {}
        if not isinstance(fv, dict) or not fv:
            continue

        if feature_names is None:
            feature_names = sorted(fv.keys())

        row = [float(fv.get(f, 0) or 0) for f in feature_names]
        X_rows.append(row)
        y.append(0 if d.decision == 'approuve' else 1)

    n = len(y)
    if n < min_samples:
        logger.info(f"Retrain: échantillons insuffisants ({n} < {min_samples}) — skip.")
        ModelTrainingRun.objects.create(
            model_name='XGBoost',
            status='skipped',
            n_samples=n,
            n_features=len(feature_names or []),
            details={'reason': 'insufficient_samples', 'min_samples': min_samples},
        )
        return {'trained': False, 'reason': 'insufficient_samples', 'n_samples': n}

    X = np.array(X_rows, dtype=float)
    y = np.array(y, dtype=int)

    # Modèle + standardisation (compatible avec AIEngine)
    from sklearn.preprocessing import StandardScaler
    import xgboost as xgb

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
        'scale_pos_weight': float((y == 0).sum() / max(int((y == 1).sum()), 1)),
        'random_state': 42,
        'eval_metric': 'auc',
    }
    model = xgb.XGBClassifier(**params)
    model.fit(X_scaled, y)

    # Sauvegarde (compatible settings ML_*_PATH)
    version = datetime.now().strftime('%Y%m%d%H%M')
    models_dir = Path(settings.BASE_DIR) / 'mltraining' / 'models'
    model_versioned = models_dir / f'xgboost_{version}.joblib'

    _atomic_joblib_dump(model, model_versioned)
    _atomic_joblib_dump(model, Path(settings.ML_MODEL_PATH))
    _atomic_joblib_dump(scaler, Path(settings.ML_SCALER_PATH))
    _atomic_json_dump(feature_names, Path(settings.ML_FEATURES_PATH))

    # Invalider le cache IA en mémoire (si le worker reste vivant)
    try:
        from apps.scoring.engines import ai_engine
        if hasattr(ai_engine, '_model_cache'):
            ai_engine._model_cache.clear()
    except Exception:
        logger.exception("Retrain: impossible de vider le cache du modèle (non bloquant).")

    logger.info(f"Retrain: modèle ré-entraîné avec {n} décisions humaines — {model_versioned.name}")
    ModelTrainingRun.objects.create(
        model_name='XGBoost',
        model_version=version,
        status='success',
        n_samples=n,
        n_features=len(feature_names),
        details={
            'model_saved': str(model_versioned),
            'model_current': str(Path(settings.ML_MODEL_PATH)),
        },
    )
    return {
        'trained': True,
        'n_samples': n,
        'features': len(feature_names),
        'model_saved': str(model_versioned),
        'model_current': str(Path(settings.ML_MODEL_PATH)),
    }


@shared_task
def retrain_xgboost_daily_3am():
    """Wrapper planifié (03:00) — garde une signature simple pour Celery Beat."""
    return retrain_xgboost_from_agent_decisions()

