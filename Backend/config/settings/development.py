from .base import *  # noqa: F403, F401

DEBUG = True
ALLOWED_HOSTS = ['*']

# Derrière un reverse proxy HTTPS (nginx) : faire confiance au header X-Forwarded-Proto
# pour que Django génère des URLs media en https:// et non http://
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

INSTALLED_APPS += ['debug_toolbar']  # noqa: F405
MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE  # noqa: F405
INTERNAL_IPS = ['127.0.0.1']

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:  # noqa: F405
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Simbisa Rawbank <noreply@simbisa.cd>')  # noqa: F405

# Développement sans Redis obligatoire (cache, throttling, OTP, taux de change)
CACHES = {  # noqa: F405
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'simbisa-dev-cache',
    }
}

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # noqa: F405
    'anon': '1000/minute',
    'user': '10000/minute',
    'auth': '1000/minute',
    'scoring': '1000/minute',
}
