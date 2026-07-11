from django.urls import path
from . import admin_views

urlpatterns = [
    path('users/', admin_views.admin_users_view, name='admin-users'),
    path('users/<int:user_id>/', admin_views.admin_update_user_view, name='admin-user-update'),
    path('users/<int:user_id>/reset-password/', admin_views.admin_reset_any_password_view, name='admin-user-reset-password'),
    path('clients/<int:client_id>/reset-password/', admin_views.agent_reset_client_password_view, name='agent-client-reset-password'),
    path('communes/', admin_views.admin_communes_view, name='admin-communes'),
    path('roles/', admin_views.admin_roles_view, name='admin-roles'),
]
