from decouple import config
from .base import *  # noqa: F403, F401

DEBUG = True
ALLOWED_HOSTS = ['*']

# ── HTTPS via reverse proxy nginx ────────────────────────────────────────────
# Django fait confiance au header X-Forwarded-Proto pour générer des URLs
# https:// dans les réponses API (médias KYC, liens e-mail, etc.)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── Cache : Redis (base.py configure déjà RedisCache via REDIS_URL) ──────────
# Pas de LocMemCache ici — Redis tourne dans le docker-compose et doit être
# utilisé pour que le throttling soit partagé entre les workers gunicorn,
# et pour que les sessions OTP survivent d'un worker à l'autre.

# ── Django Debug Toolbar (inactif hors INTERNAL_IPS = 127.0.0.1) ─────────────
INSTALLED_APPS += ['debug_toolbar']  # noqa: F405
MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE  # noqa: F405
INTERNAL_IPS = ['127.0.0.1']

# ── E-mail ────────────────────────────────────────────────────────────────────
# Si les credentials SMTP sont absents du .env, les e-mails s'affichent
# dans les logs Docker plutôt que de lever une erreur de connexion.
if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:  # noqa: F405
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── Throttling assoupli (tests & staging) ────────────────────────────────────
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # noqa: F405
    'anon':    '1000/minute',
    'user':    '10000/minute',
    'auth':    '1000/minute',
    'scoring': '1000/minute',
}
