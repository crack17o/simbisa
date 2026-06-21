from django.urls import path
from . import views

urlpatterns = [
    path('taux-change/', views.exchange_rate_view, name='exchange-rate'),
    path('admin/taux-change/', views.admin_exchange_rate_view, name='admin-exchange-rate'),
    path('admin/security/', views.admin_security_settings_view, name='admin-security'),
]