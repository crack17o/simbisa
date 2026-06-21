from django.urls import path
from . import views

urlpatterns = [
    path('', views.AuditLogListView.as_view(), name='audit-list'),
    path('decisions/', views.audit_decisions_view, name='audit-decisions'),
    path('reports/', views.audit_reports_view, name='audit-reports'),
]
