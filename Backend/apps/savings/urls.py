from django.urls import path
from . import views

urlpatterns = [
    path('', views.CompteEpargneListCreateView.as_view(), name='savings-list'),
    path('<int:pk>/operations/', views.list_operations_view, name='savings-operations'),
    path('<int:pk>/depot/', views.depot_epargne_view, name='savings-depot'),
    path('<int:pk>/retrait/', views.retrait_epargne_view, name='savings-retrait'),
]
