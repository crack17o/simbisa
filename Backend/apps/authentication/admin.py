from django.contrib import admin
from .models import Role, Utilisateur


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('nom_role', 'description')


@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ('telephone', 'full_name', 'role', 'commune_kinshasa', 'statut', 'is_staff')
    list_filter = ('statut', 'role', 'commune_kinshasa', 'is_staff')
    search_fields = ('telephone', 'nom', 'prenom', 'email')
    fieldsets = (
        (None, {'fields': ('telephone', 'password', 'role', 'statut')}),
        ('Identité', {'fields': ('nom', 'postnom', 'prenom', 'email')}),
        ('Territoire', {'fields': ('commune_kinshasa',)}),
        ('Sécurité', {'fields': ('mfa_enabled', 'is_staff', 'is_superuser', 'is_active')}),
    )
