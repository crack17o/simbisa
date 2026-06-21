from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.my_score_view, name='my-score'),
    path('<int:demande_pk>/', views.scoring_detail_view, name='scoring-detail'),
    path('<int:demande_pk>/trigger/', views.trigger_scoring_view, name='scoring-trigger'),
]
