"""Décision OTP, sessions uniques, mise à jour contexte de confiance."""
import logging

from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

logger = logging.getLogger('apps.authentication')

REASON_LABELS = {
    'mfa_enabled': 'Authentification à deux facteurs activée',
    'mfa_policy': 'Politique MFA obligatoire pour les agents',
    'country_changed': 'Connexion depuis un nouveau pays',
    'device_changed': 'Nouvel appareil ou navigateur détecté',
}

AGENT_ROLES = ('Agent de crédit', 'Responsable crédit')


def otp_required(user, ctx: dict) -> tuple[bool, list[str]]:
    reasons = []

    from apps.core.models import PlatformConfig
    config = PlatformConfig.load()

    if user.mfa_enabled:
        reasons.append('mfa_enabled')

    if (
        config.mfa_obligatoire_agents
        and user.role
        and user.role.nom_role in AGENT_ROLES
        and not user.mfa_enabled
    ):
        reasons.append('mfa_policy')

    if user.last_login_country and ctx['country'] != user.last_login_country:
        reasons.append('country_changed')

    if user.last_device_id and ctx['device_id'] != user.last_device_id:
        reasons.append('device_changed')

    return bool(reasons), reasons


def reason_messages(reasons: list[str]) -> list[str]:
    return [REASON_LABELS.get(r, r) for r in reasons]


def revoke_all_sessions(user) -> int:
    """Invalide tous les refresh tokens JWT — déconnecte les autres appareils."""
    count = 0
    for outstanding in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
        if created:
            count += 1
    if count:
        logger.info(f"{count} session(s) révoquée(s) pour {user.telephone}")
    return count


def update_trusted_context(user, ctx: dict) -> None:
    user.last_login_ip = ctx.get('ip') or user.last_login_ip
    user.last_login_country = ctx.get('country', '')
    user.last_device_id = ctx.get('device_id', '')
    user.last_login = timezone.now()
    user.save(update_fields=[
        'last_login_ip', 'last_login_country', 'last_device_id', 'last_login',
    ])
