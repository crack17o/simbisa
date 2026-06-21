from django.urls import path
from . import views, staff_views, manager_views

urlpatterns = [
    path('', views.submit_credit_request, name='credit-submit'),
    path('me/', views.my_credits_view, name='my-credits'),
    path('demandes/stats/', staff_views.demandes_stats_view, name='credit-demandes-stats'),
    path('demandes/sensibles/', staff_views.list_demandes_sensibles_view, name='credit-demandes-sensibles'),
    path('demandes/', staff_views.list_demandes_view, name='credit-demandes-list'),
    path('demandes/<int:demande_pk>/decision/', staff_views.demande_decision_view, name='credit-demande-decision'),
    path('<int:credit_pk>/remboursement/', views.remboursement_view, name='remboursement'),
]
