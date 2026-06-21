"""Affectation clients ↔ agents par commune Kinshasa.

Règles métier :
- Plusieurs agents peuvent couvrir la même commune.
- Chaque client est rattaché à UN agent (`id_agent_assigne`).
- L'agent ne voit et ne gère que SES clients (CRUD sauf DELETE).
- Inscription en ligne : répartition à l'agent le moins chargé de la commune.
"""
from django.db.models import Count

from apps.authentication.models import Utilisateur
from apps.clients.models import Client
from apps.core.kinshasa_communes import COMMUNE_CODES


def agents_for_commune(commune: str):
    if commune not in COMMUNE_CODES:
        return Utilisateur.objects.none()
    return Utilisateur.objects.filter(
        role__nom_role='Agent de crédit',
        commune_kinshasa=commune,
        statut='actif',
    )


def pick_agent_for_inscription(commune: str) -> Utilisateur | None:
    """Choisit l'agent actif de la commune avec le moins de clients."""
    return (
        agents_for_commune(commune)
        .annotate(client_count=Count('clients_affectes'))
        .order_by('client_count', 'id')
        .first()
    )


def assign_client_to_agent(client: Client, agent: Utilisateur) -> Client:
    if agent.role.nom_role != 'Agent de crédit':
        raise ValueError('Seul un agent de crédit peut recevoir un client.')
    if agent.commune_kinshasa and client.commune_kinshasa:
        if agent.commune_kinshasa != client.commune_kinshasa:
            raise ValueError('La commune du client doit correspondre à celle de l\'agent.')
    client.commune_kinshasa = agent.commune_kinshasa or client.commune_kinshasa
    client.id_agent_assigne = agent
    client.save(update_fields=['commune_kinshasa', 'id_agent_assigne', 'updated_at'])
    return client


def assign_client_on_registration(client: Client, commune: str) -> Utilisateur | None:
    if commune not in COMMUNE_CODES:
        raise ValueError('Commune Kinshasa invalide.')
    agent = pick_agent_for_inscription(commune)
    client.commune_kinshasa = commune
    client.id_agent_assigne = agent
    client.save(update_fields=['commune_kinshasa', 'id_agent_assigne', 'updated_at'])
    return agent


def is_manager_or_global(user) -> bool:
    role = getattr(getattr(user, 'role', None), 'nom_role', '')
    return role in ('Responsable crédit', 'Administrateur', 'Auditeur', 'Analyste risque')


def can_agent_access_client(agent, client: Client) -> bool:
    if is_manager_or_global(agent):
        return True
    role = getattr(getattr(agent, 'role', None), 'nom_role', '')
    if role != 'Agent de crédit':
        return False
    return client.id_agent_assigne_id == agent.id


def filter_clients_queryset(qs, user):
    if is_manager_or_global(user):
        return qs
    role = getattr(getattr(user, 'role', None), 'nom_role', '')
    if role == 'Agent de crédit':
        return qs.filter(id_agent_assigne=user)
    return qs.none()


def filter_demandes_queryset(qs, user):
    if is_manager_or_global(user):
        return qs
    role = getattr(getattr(user, 'role', None), 'nom_role', '')
    if role == 'Agent de crédit':
        return qs.filter(id_client__id_agent_assigne=user)
    return qs.none()
