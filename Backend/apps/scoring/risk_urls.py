from django.urls import path
from . import risk_views

urlpatterns = [
    path('dashboard/', risk_views.risk_dashboard_view, name='risk-dashboard'),
    path('rules/', risk_views.risk_rules_view, name='risk-rules'),
    path('models/', risk_views.risk_models_view, name='risk-models'),
    path('model-status/', risk_views.risk_model_status_view, name='risk-model-status'),
]
