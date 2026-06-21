from rest_framework.permissions import BasePermission


class RoleRequired(BasePermission):
    """Permission générique basée sur le rôle (RBAC)."""
    required_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', None)
        if user_role is None:
            return False
        return user_role.nom_role in self.required_roles


def role_required(roles):
    """Factory de permissions RBAC dynamique."""
    class DynamicRolePermission(RoleRequired):
        required_roles = list(roles)
    return DynamicRolePermission


class IsClient(RoleRequired):
    required_roles = ['Client']


class IsAgent(RoleRequired):
    required_roles = ['Agent de crédit', 'Responsable crédit']


class IsCreditAgent(RoleRequired):
    required_roles = ['Agent de crédit']


class IsManager(RoleRequired):
    required_roles = ['Responsable crédit']


class IsStaffCredit(RoleRequired):
    required_roles = ['Agent de crédit', 'Responsable crédit', 'Analyste risque']


class IsAgentOrManager(RoleRequired):
    required_roles = ['Agent de crédit', 'Responsable crédit']


class IsAnalysteRisque(RoleRequired):
    required_roles = ['Analyste risque']


class IsAdministrateur(RoleRequired):
    required_roles = ['Administrateur']


class IsAuditeur(RoleRequired):
    required_roles = ['Auditeur']


class IsClientOrAgent(RoleRequired):
    required_roles = ['Client', 'Agent de crédit', 'Responsable crédit']


class IsSelfOrAgent(BasePermission):
    """Le client ne peut accéder qu'à ses propres données."""

    def has_object_permission(self, request, view, obj):
        from apps.clients.models import Client
        from apps.clients.services.territoire import can_agent_access_client
        user_role = getattr(getattr(request.user, 'role', None), 'nom_role', '')
        if user_role in ['Responsable crédit', 'Administrateur', 'Auditeur']:
            return True
        if user_role == 'Agent de crédit':
            if isinstance(obj, Client):
                return can_agent_access_client(request.user, obj)
            related = getattr(obj, 'id_client', None)
            if related:
                return can_agent_access_client(request.user, related)
            return False
        if isinstance(obj, Client):
            return obj.id_utilisateur_id == request.user.id
        client = getattr(obj, 'id_client', None)
        if client:
            return getattr(client, 'id_utilisateur_id', None) == request.user.id
        return False
