"""
Settings "nocelery" : exécuter le backend sans Celery worker/beat.

Usage :
  python manage.py runserver --settings=config.settings.nocelery

Ce mode enlève django-celery-beat/results des INSTALLED_APPS.
Les "tasks" décorées via apps.core.celery_compat.shared_task restent appelables
en synchrone via .delay() (exécution immédiate).
"""

from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ['*']

# Retirer les apps Celery (pour pouvoir fonctionner sans dépendances Celery/Beat)
INSTALLED_APPS = [
    app for app in INSTALLED_APPS  # type: ignore # noqa: F405
    if app not in ('django_celery_beat', 'django_celery_results')
]

# On garde ces valeurs pour compat, mais elles ne seront pas utilisées sans worker/beat
CELERY_BEAT_SCHEDULER = None

# Pas de Redis obligatoire en local (cache, throttling, OTP, sessions USSD)
CACHES = {  # noqa: F405
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'simbisa-nocelery-cache',
    }
}
