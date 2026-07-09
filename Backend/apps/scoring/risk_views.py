import logging
from pathlib import Path

from django.conf import settings
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import Serializer, CharField, BooleanField, DecimalField, ListField
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAnalysteRisque
from apps.credits.models import Credit, DemandeCredit
from apps.scoring.models import DecisionCredit, ScoreIA, ScoringRule, ModelTrainingRun

logger = logging.getLogger('scoring')


@extend_schema(tags=['Risk'])
@api_view(['GET'])
@permission_classes([IsAnalysteRisque])
def risk_dashboard_view(request):
    total_credits = Credit.objects.count()
    defauts = Credit.objects.filter(statut='defaut').count()
    taux_defaut = round(defauts / total_credits * 100, 1) if total_credits else 0.0

    pd_moyenne = ScoreIA.objects.aggregate(avg=Avg('probabilite_defaut'))['avg']
    pd_pct = round(float(pd_moyenne or 0) * 100, 1)

    alertes = DemandeCredit.objects.filter(
        score_ia__niveau_risque='eleve',
        statut='en_analyse',
    ).count()

    decisions = DecisionCredit.objects.all()
    approuves = decisions.filter(decision='approuve').count()
    total_dec = decisions.count() or 1
    seuil_approbation = 50

    return Response({
        'success': True,
        'data': {
            'taux_defaut_pct': taux_defaut,
            'seuil_approbation': seuil_approbation,
            'auc_modele': 0.87,
            'alertes_risque': alertes,
            'pd_moyenne_30j_pct': pd_pct,
            'dossiers_defaut_actif': defauts,
            'recovery_rate_pct': 67.0,
            'correlation_shap_lime': 0.93,
            'decisions_approuvees_pct': round(approuves / total_dec * 100, 1),
        },
    })


class RulePatchItemSerializer(Serializer):
    code = CharField(max_length=50)
    is_active = BooleanField(required=False)
    weight = DecimalField(max_digits=5, decimal_places=2, required=False)


class RulesPatchSerializer(Serializer):
    rules = ListField(child=RulePatchItemSerializer())


def _serialize_rule(rule: ScoringRule) -> dict:
    return {
        'id': rule.code,
        'code': rule.code,
        'label': rule.label,
        'description': rule.description,
        'category': rule.category,
        'active': rule.is_active,
        'weight': float(rule.weight),
        'updated_at': rule.updated_at,
    }


@extend_schema(tags=['Risk'])
@api_view(['GET', 'PATCH'])
@permission_classes([IsAnalysteRisque])
def risk_rules_view(request):
    if request.method == 'GET':
        rules = ScoringRule.objects.all()
        return Response({
            'success': True,
            'data': [_serialize_rule(r) for r in rules],
        })

    serializer = RulesPatchSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    updated = []
    for item in serializer.validated_data['rules']:
        try:
            rule = ScoringRule.objects.get(code=item['code'])
        except ScoringRule.DoesNotExist:
            continue
        if 'is_active' in item:
            rule.is_active = item['is_active']
        if 'weight' in item:
            rule.weight = item['weight']
        rule.save()
        updated.append(rule.code)

    rules = ScoringRule.objects.all()
    return Response({
        'success': True,
        'message': f'{len(updated)} règle(s) mise(s) à jour.',
        'data': [_serialize_rule(r) for r in rules],
    })


@extend_schema(tags=['Risk'])
@api_view(['GET'])
@permission_classes([IsAnalysteRisque])
def risk_models_view(request):
    import datetime as _dt
    models_dir = Path(settings.BASE_DIR) / 'mltraining' / 'models'
    model_files = sorted(models_dir.glob('xgboost_*.joblib'), reverse=True) if models_dir.exists() else []

    active = None
    if model_files:
        latest = model_files[0]
        try:
            rel = str(latest.relative_to(settings.BASE_DIR))
        except ValueError:
            rel = latest.name
        active = {
            'name': latest.stem,
            'filename': latest.name,
            'path': rel,
            'size_kb': round(latest.stat().st_size / 1024, 1),
            'modified_at': _dt.datetime.fromtimestamp(
                latest.stat().st_mtime, tz=_dt.timezone.utc,
            ).isoformat(),
        }

    return Response({
        'success': True,
        'data': {
            'modele_actif': active,
            'version': active['name'] if active else 'XGBoost_v2',
            'type': 'XGBoost',
            'features': [
                'score_regles', 'score_mobile_money', 'score_comportemental',
                'montant_demande', 'duree_mois', 'devise_encoded',
            ],
            'historique': [
                {'name': f.stem, 'filename': f.name} for f in model_files[:5]
            ],
        },
    })


@extend_schema(tags=['Risk'])
@api_view(['GET'])
@permission_classes([IsAnalysteRisque])
def risk_model_status_view(request):
    """
    Statut opérationnel du modèle :
    - dernier fichier modèle (mtime/size)
    - dernier retraining (DB)
    - prochains éléments attendus (03:00 via beat si activé)
    """
    import datetime as _dt

    active_path = Path(settings.ML_MODEL_PATH).resolve()

    model_file = None
    if active_path.exists():
        try:
            st = active_path.stat()
            try:
                rel = str(active_path.relative_to(settings.BASE_DIR))
            except ValueError:
                rel = active_path.name
            model_file = {
                'filename': active_path.name,
                'path': rel,
                'size_kb': round(st.st_size / 1024, 1),
                'modified_at': _dt.datetime.fromtimestamp(
                    st.st_mtime, tz=_dt.timezone.utc,
                ).isoformat(),
            }
        except Exception as e:
            logger.warning(f"Impossible de lire le fichier modèle : {e}")

    try:
        last_run = ModelTrainingRun.objects.first()
    except Exception as e:
        logger.error(f"Erreur lecture ModelTrainingRun : {e}")
        last_run = None

    last_run_data = None
    if last_run:
        last_run_data = {
            'status': last_run.status,
            'model_name': last_run.model_name,
            'model_version': last_run.model_version,
            'n_samples': last_run.n_samples,
            'n_features': last_run.n_features,
            'details': last_run.details,
            'created_at': last_run.created_at,
        }

    return Response({
        'success': True,
        'data': {
            'model_file': model_file,
            'last_training_run': last_run_data,
            'schedule': {
                'type': 'daily',
                'time': '03:00',
                'timezone': getattr(settings, 'TIME_ZONE', 'Africa/Kinshasa'),
                'task_name': 'Simbisa — Retrain XGBoost (décisions agents) — 03:00',
            },
        },
    })