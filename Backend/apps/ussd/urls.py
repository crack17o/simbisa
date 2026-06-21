from django.urls import path
from . import views

urlpatterns = [
    path('callback/', views.ussd_callback_view, name='ussd-callback'),
    path('simulate/', views.ussd_simulate_view, name='ussd-simulate'),
    path('simulator/', views.ussd_simulator_page, name='ussd-simulator-page'),
]
