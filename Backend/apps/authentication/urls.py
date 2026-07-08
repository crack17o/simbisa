from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register_view, name='auth-register'),
    path('login/', views.login_view, name='auth-login'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('me/', views.me_view, name='auth-me'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('mfa/setup/', views.mfa_setup_view, name='mfa-setup'),
    path('mfa/verify/', views.mfa_verify_view, name='mfa-verify'),
    path('mfa/disable/', views.mfa_disable_view, name='mfa-disable'),
    path('password/forgot/', views.password_forgot_view, name='password-forgot'),
    path('password/verify-otp/', views.password_verify_otp_view, name='password-verify-otp'),
    path('password/reset/', views.password_reset_view, name='password-reset'),
]
