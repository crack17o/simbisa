"""Flux mot de passe oublié."""
import logging

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.authentication.models import Utilisateur
from apps.authentication.services.email_service import (
    create_password_reset_token,
    consume_password_reset_token,
    issue_and_send_otp,
    mask_email,
    verify_otp,
)
from apps.authentication.services.session_security import revoke_all_sessions

logger = logging.getLogger('apps.authentication')

GENERIC_FORGOT_MSG = (
    "Si un compte est associé à cette adresse, un code de vérification a été envoyé."
)


def find_user_by_email(email: str):
    normalized = email.strip().lower()
    if not normalized:
        return None
    return Utilisateur.objects.filter(email__iexact=normalized, statut='actif').first()


def request_password_reset(email: str) -> dict:
    user = find_user_by_email(email)
    otp_sent_to = None

    if user and user.email:
        try:
            otp_sent_to = issue_and_send_otp(user, 'password_reset')
        except Exception:
            logger.exception('Échec envoi OTP reset pour %s', mask_email(email))

    return {
        'message': GENERIC_FORGOT_MSG,
        'otp_sent_to': otp_sent_to,
    }


def verify_password_reset_otp(email: str, otp_code: str) -> dict:
    user = find_user_by_email(email)
    if not user:
        raise ValueError('Code invalide ou expiré.')

    if not verify_otp(user.id, 'password_reset', otp_code):
        raise ValueError('Code OTP invalide ou expiré.')

    reset_token = create_password_reset_token(user)
    return {
        'reset_token': reset_token,
        'email': user.email,
        'message': 'Code validé. Choisissez un nouveau mot de passe.',
    }


def reset_password(email: str, reset_token: str, new_password: str) -> None:
    user_id = consume_password_reset_token(reset_token, email)
    if not user_id:
        raise ValueError('Lien de réinitialisation invalide ou expiré.')

    try:
        user = Utilisateur.objects.get(pk=user_id, statut='actif')
    except Utilisateur.DoesNotExist:
        raise ValueError('Compte introuvable.') from None

    if user.email.lower() != email.strip().lower():
        raise ValueError('E-mail incorrect.')

    try:
        validate_password(new_password, user)
    except ValidationError as e:
        raise ValueError(' '.join(e.messages)) from e

    user.set_password(new_password)
    user.password_changed_at = timezone.now()
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=[
        'password', 'password_changed_at', 'failed_login_attempts', 'locked_until',
    ])
    revoke_all_sessions(user)
    logger.info(f"Mot de passe réinitialisé : {user.telephone}")
