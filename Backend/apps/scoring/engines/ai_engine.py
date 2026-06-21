import logging
import json
import numpy as np
from django.conf import settings
from apps.core.currency import devise_demande_encoded, get_credit_limits
from apps.core.exchange_rate import get_cdf_per_usd
from apps.credits.models import DemandeCredit

logger = logging.getLogger('scoring')

_model_cache = {}


def load_model():
    if 'model' not in _model_cache:
        import joblib
        try:
            _model_cache['model'] = joblib.load(settings.ML_MODEL_PATH)
            _model_cache['scaler'] = joblib.load(settings.ML_SCALER_PATH)
            with open(settings.ML_FEATURES_PATH) as f:
                _model_cache['features'] = json.load(f)
            logger.info(f"Modèle XGBoost chargé : {settings.ML_MODEL_PATH}")
        except FileNotFoundError:
            logger.warning("Modèle ML introuvable — mode simulation activé.")
            _model_cache['model'] = None
    return _model_cache


class AIEngine:
    def __init__(self, demande: DemandeCredit):
        self.demande = demande
        self.client = demande.id_client
        self.devise = demande.devise
        self.cache = load_model()

    def run(self, mm_features: dict, behavioral_features: dict) -> dict:
        feature_vector = self._build_feature_vector(mm_features, behavioral_features)

        if self.cache.get('model') is None:
            return self._simulate_prediction(feature_vector)

        try:
            return self._predict(feature_vector)
        except Exception as e:
            logger.error(f"Erreur prédiction IA: {e}", exc_info=True)
            return self._simulate_prediction(feature_vector)

    def _build_feature_vector(self, mm_features: dict, behavioral_features: dict) -> dict:
        return {
            'flux_entrants_moyen': mm_features.get('flux_entrants_moyen', 0),
            'flux_sortants_moyen': mm_features.get('flux_sortants_moyen', 0),
            'solde_moyen_mensuel': mm_features.get('solde_moyen_mensuel', 0),
            'regularite_revenus_pct': mm_features.get('regularite_revenus_pct', 0),
            'volatilite_depenses_pct': mm_features.get('volatilite_depenses_pct', 100),
            'nb_mois_actifs': mm_features.get('nb_mois_actifs', 0),
            'progression_objectif_moy': behavioral_features.get('progression_objectif_moy', 0),
            'taux_remboursement_pct': behavioral_features.get('taux_remboursement_pct', 50),
            'nb_defauts': behavioral_features.get('nb_defauts', 0),
            'anciennete_jours': behavioral_features.get('anciennete_jours', 0),
            'montant_demande': float(self.demande.montant_demande),
            'duree_mois': self.demande.duree_mois,
            'age': self.client.age,
            'revenu_estime': float(self.client.revenu_pour_devise(self.devise)),
            'devise_demande': devise_demande_encoded(self.devise),
        }

    def _predict(self, feature_vector: dict) -> dict:
        model = self.cache['model']
        scaler = self.cache['scaler']
        feature_names = self.cache['features']

        X = np.array([[feature_vector.get(f, 0) for f in feature_names]])
        X_scaled = scaler.transform(X)

        proba_defaut = float(model.predict_proba(X_scaled)[0][1])
        niveau_risque = self._classify_risk(proba_defaut)
        score_normalise = round((1 - proba_defaut) * 100, 2)

        shap_values = self._compute_shap(model, X_scaled, feature_names)
        lime_values = self._compute_lime(model, scaler, X, feature_names)

        return {
            'probabilite_defaut': round(proba_defaut, 4),
            'niveau_risque': niveau_risque,
            'score_normalise': score_normalise,
            'shap_values': shap_values,
            'lime_values': lime_values,
            'feature_vector': feature_vector,
            'devise': self.devise,
        }

    def _compute_shap(self, model, X_scaled, feature_names: list) -> dict:
        try:
            import shap
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(X_scaled)
            if isinstance(sv, list):
                sv = sv[1]
            return {feature_names[i]: round(float(sv[0][i]), 5) for i in range(len(feature_names))}
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e}")
            return {}

    def _compute_lime(self, model, scaler, X_raw, feature_names: list) -> dict:
        try:
            from lime.lime_tabular import LimeTabularExplainer
            background = np.zeros((100, len(feature_names)))

            explainer = LimeTabularExplainer(
                training_data=background,
                feature_names=feature_names,
                class_names=['non_defaut', 'defaut'],
                mode='classification',
                random_state=42,
            )

            def predict_fn(data):
                return model.predict_proba(scaler.transform(data))

            explanation = explainer.explain_instance(
                X_raw[0], predict_fn, num_features=10, num_samples=300,
            )
            return {feat: round(float(weight), 5) for feat, weight in explanation.as_list()}
        except Exception as e:
            logger.warning(f"LIME computation failed: {e}")
            return {}

    def _classify_risk(self, proba: float) -> str:
        if proba < 0.20:
            return 'faible'
        elif proba < 0.50:
            return 'moyen'
        return 'eleve'

    def _simulate_prediction(self, feature_vector: dict) -> dict:
        flux = feature_vector.get('flux_entrants_moyen', 0)
        regularite = feature_vector.get('regularite_revenus_pct', 0) / 100
        anciennete = min(feature_vector.get('anciennete_jours', 0) / 365, 1)
        taux_remb = feature_vector.get('taux_remboursement_pct', 50) / 100
        devise_factor = feature_vector.get('devise_demande', 1.0)

        flux_norm = flux / (
            1000 if devise_factor >= 0.5
            else get_credit_limits('CDF')['max'] * 0.001
        )
        proba = max(0.05, min(0.95, 0.7 - flux_norm * 0.2 - regularite * 0.2
                              - anciennete * 0.1 - taux_remb * 0.2))

        return {
            'probabilite_defaut': round(proba, 4),
            'niveau_risque': self._classify_risk(proba),
            'score_normalise': round((1 - proba) * 100, 2),
            'shap_values': {k: round(v * 0.01, 5) for k, v in feature_vector.items()},
            'lime_values': {},
            'feature_vector': feature_vector,
            'devise': self.devise,
            'simulation_mode': True,
        }
