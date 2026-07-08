from decouple import config
from .base import *  # noqa: F403, F401

DEBUG = False

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

_allowed = config('ALLOWED_HOSTS', default='')
CSRF_TRUSTED_ORIGINS = [
    f'https://{h.strip()}' for h in _allowed.split(',') if h.strip() and '127' not in h and 'localhost' not in h
]

SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style='url'),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment='production',
    )

# Stockage local — documents KYC stockés dans MEDIA_ROOT/kyc/scans/
# Accès protégé via /media/kyc/** (authentification Django requise, voir config/urls.py)
# En production, Nginx NE doit PAS servir /media/kyc/ directement.
# Exemple Nginx :
#   location /media/ { alias /srv/simbisa/media/; }
#   location /media/kyc/ { deny all; }  # bloquer l'accès direct, passer par Django
