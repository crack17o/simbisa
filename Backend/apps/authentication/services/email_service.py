"""E-mails transactionnels Simbisa (OTP, bienvenue, alertes)."""
import logging
import random
import string
from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger('apps.authentication')

OTP_CACHE_PREFIX = 'simbisa:otp'
RESET_TOKEN_PREFIX = 'simbisa:reset_token'
RESET_TOKEN_TTL = 900  # 15 minutes

OTP_TEMPLATE_BY_PURPOSE = {
    'login': 'authentication/email/otp_code.html',
    'mfa_setup': 'authentication/email/otp_code.html',
    'password_reset': 'authentication/email/password_reset.html',
}


def _otp_ttl_seconds() -> int:
    return settings.SIMBISA_OTP_VALIDITY_MINUTES * 60


def _cache_key(user_id: int, purpose: str) -> str:
    return f'{OTP_CACHE_PREFIX}:{purpose}:{user_id}'


def _base_context(user) -> dict:
    return {
        'user_name': user.full_name,
        'year': timezone.now().year,
    }


def generate_otp_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


def mask_email(email: str) -> str:
    if not email or '@' not in email:
        return '***'
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked = local[0] + '***'
    else:
        masked = local[0] + '***' + local[-1]
    return f'{masked}@{domain}'


def store_otp(user_id: int, purpose: str, code: str, extra: dict | None = None) -> None:
    payload = {
        'code': code,
        'created_at': timezone.now().isoformat(),
        **(extra or {}),
    }
    cache.set(_cache_key(user_id, purpose), payload, _otp_ttl_seconds())


def verify_otp(user_id: int, purpose: str, code: str) -> bool:
    if not code or len(code.strip()) != 6:
        return False
    payload = cache.get(_cache_key(user_id, purpose))
    if not payload:
        return False
    ok = payload.get('code') == code.strip()
    if ok:
        cache.delete(_cache_key(user_id, purpose))
    return ok


def _purpose_label(purpose: str) -> str:
    labels = {
        'login': 'Connexion sécurisée',
        'mfa_setup': 'Activation MFA',
        'password_reset': 'Réinitialisation du mot de passe',
    }
    return labels.get(purpose, 'Vérification')


def _send_html_email(subject: str, to: list[str], html: str, text: str) -> None:
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to,
    )
    msg.attach_alternative(html, 'text/html')
    msg.send(fail_silently=False)


def send_otp_email(user, code: str, purpose: str, context: dict | None = None) -> None:
    if not user.email:
        raise ValueError("Aucune adresse e-mail sur ce compte.")

    ctx = {
        **_base_context(user),
        'otp_code': code,
        'validity_minutes': settings.SIMBISA_OTP_VALIDITY_MINUTES,
        'purpose_label': _purpose_label(purpose),
        'reasons': (context or {}).get('reasons', []),
    }
    template = OTP_TEMPLATE_BY_PURPOSE.get(purpose, 'authentication/email/otp_code.html')
    html = render_to_string(template, ctx)
    text = (
        f"Simbisa — {ctx['purpose_label']}\n\n"
        f"Bonjour {user.full_name},\n\n"
        f"Votre code : {code}\n"
        f"Valide {settings.SIMBISA_OTP_VALIDITY_MINUTES} minutes."
    )
    _send_html_email(
        subject=f"Simbisa — Code {code}",
        to=[user.email],
        html=html,
        text=text,
    )
    logger.info(f"OTP e-mail ({purpose}) -> {mask_email(user.email)}")


def issue_and_send_otp(user, purpose: str, context: dict | None = None) -> str:
    code = generate_otp_code()
    store_otp(user.id, purpose, code, context)
    send_otp_email(user, code, purpose, context)
    return mask_email(user.email)


def send_welcome_email(user) -> None:
    if not user.email:
        return
    ctx = {
        **_base_context(user),
        'telephone': user.telephone,
        'email': user.email,
        'role_name': user.role.nom_role if user.role else 'Client',
        'login_url': f"{settings.FRONTEND_URL}/login",
    }
    html = render_to_string('authentication/email/welcome.html', ctx)
    text = (
        f"Bienvenue sur Simbisa, {user.full_name}!\n\n"
        f"Votre compte ({user.telephone}) est actif.\n"
        f"Connectez-vous : {ctx['login_url']}"
    )
    _send_html_email(
        subject='Bienvenue sur Simbisa Rawbank',
        to=[user.email],
        html=html,
        text=text,
    )
    logger.info(f"E-mail bienvenue -> {mask_email(user.email)}")


def send_login_attempt_email(user, ctx: dict, reasons: list[str]) -> None:
    if not user.email:
        return
    email_ctx = {
        **_base_context(user),
        'ip': ctx.get('ip', ''),
        'country': ctx.get('country', ''),
        'device_label': (ctx.get('device_id') or '')[:16],
        'attempt_time': timezone.now().strftime('%d/%m/%Y %H:%M'),
        'reasons': reasons,
    }
    html = render_to_string('authentication/email/login_attempt.html', email_ctx)
    text = (
        f"Bonjour {user.full_name},\n\n"
        f"Tentative de connexion à votre compte Simbisa.\n"
        f"IP: {email_ctx['ip']} · Pays: {email_ctx['country']}\n\n"
        f"Si ce n'était pas vous, changez votre mot de passe."
    )
    _send_html_email(
        subject='Simbisa — Tentez-vous de vous connecter ?',
        to=[user.email],
        html=html,
        text=text,
    )
    logger.info(f"Alerte connexion -> {mask_email(user.email)}")


def send_temp_password_email(user, actor_name: str, default_password: str = 'Simbisa2025!') -> None:
    if not user.email:
        return
    year = timezone.now().year
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h2 style="color:#1a1a2e;margin-top:0">Réinitialisation de votre mot de passe Simbisa</h2>
    <p style="color:#333">Bonjour <strong>{user.full_name}</strong>,</p>
    <p style="color:#333">Votre mot de passe a été réinitialisé par <strong>{actor_name}</strong>.</p>
    <p style="color:#333">Votre nouveau mot de passe temporaire est :</p>
    <div style="background:#f0f0f0;padding:16px 24px;border-radius:6px;text-align:center;margin:20px 0">
      <span style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#1a1a2e;font-family:monospace">{default_password}</span>
    </div>
    <p style="color:#333">Connectez-vous avec ce mot de passe, puis modifiez-le immédiatement depuis votre profil.</p>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px;margin-bottom:0">Simbisa Rawbank &middot; {year}</p>
  </div>
</body>
</html>"""
    text = (
        f"Bonjour {user.full_name},\n\n"
        f"Votre mot de passe Simbisa a été réinitialisé par {actor_name}.\n\n"
        f"Mot de passe temporaire : {default_password}\n\n"
        f"Connectez-vous puis changez-le immédiatement depuis votre profil."
    )
    _send_html_email(
        subject='Simbisa — Réinitialisation de votre mot de passe',
        to=[user.email],
        html=html,
        text=text,
    )
    logger.info(f"Reset MDP -> {mask_email(user.email)} (par {actor_name})")


def create_password_reset_token(user) -> str:
    import secrets
    token = secrets.token_urlsafe(32)
    cache.set(
        f'{RESET_TOKEN_PREFIX}:{token}',
        {'user_id': user.id, 'email': user.email.lower()},
        RESET_TOKEN_TTL,
    )
    return token


def consume_password_reset_token(token: str, email: str) -> int | None:
    if not token:
        return None
    payload = cache.get(f'{RESET_TOKEN_PREFIX}:{token}')
    if not payload:
        return None
    if payload.get('email') != email.strip().lower():
        return None
    cache.delete(f'{RESET_TOKEN_PREFIX}:{token}')
    return payload.get('user_id')
