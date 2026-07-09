from django.urls import path
from . import views

urlpatterns = [
    path('communes/', views.communes_list_view, name='client-communes'),
    path('stats/', views.client_stats_view, name='client-stats'),
    path('create/', views.agent_create_client_view, name='client-agent-create'),
    path('', views.ClientListView.as_view(), name='client-list'),
    path('me/', views.MyProfileView.as_view(), name='client-me'),
    path('me/identite/', views.IdentiteCreateView.as_view(), name='identite-create'),
    path('kyc/<int:pk>/verify/', views.verify_kyc_view, name='kyc-verify'),
    path('<int:pk>/', views.ClientDetailView.as_view(), name='client-detail'),
]
