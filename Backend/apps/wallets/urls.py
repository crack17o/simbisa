from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MyWalletsView.as_view(), name='wallet-me'),
    path('mobile-money/', views.MobileMoneyAccountListCreateView.as_view(), name='mm-accounts'),
]
