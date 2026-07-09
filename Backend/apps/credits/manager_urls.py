from django.urls import path
from . import manager_views

urlpatterns = [
    path('dashboard/', manager_views.manager_dashboard_view, name='manager-dashboard'),
    path('exceptions/', manager_views.exceptions_view, name='manager-exceptions'),
    path('exceptions/<int:pk>/', manager_views.exception_detail_view, name='manager-exception-detail'),
    path('plafonds/', manager_views.plafonds_view, name='manager-plafonds'),
    path('plafonds/niveaux/', manager_views.niveau_plafonds_view, name='manager-niveau-plafonds'),
]
