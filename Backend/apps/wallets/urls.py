from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.MyWalletsView.as_view(), name='wallet-me'),
    path('<int:pk>/depot/', views.depot_wallet_view, name='wallet-depot'),
    path('<int:pk>/retrait/', views.retrait_wallet_view, name='wallet-retrait'),
    path('<int:pk>/transactions/', views.wallet_transactions_view, name='wallet-transactions'),
    path('mobile-money/', views.MobileMoneyAccountListCreateView.as_view(), name='mm-accounts'),
]
