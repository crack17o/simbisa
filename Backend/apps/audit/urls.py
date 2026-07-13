from django.urls import path
from . import views

urlpatterns = [
    path('', views.AuditLogListView.as_view(), name='audit-list'),
    path('decisions/', views.audit_decisions_view, name='audit-decisions'),
    path('decisions/<int:pk>/', views.audit_decision_detail_view, name='audit-decision-detail'),
    path('reports/', views.audit_reports_view, name='audit-reports'),
]
