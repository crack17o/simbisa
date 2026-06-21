"""
Settings production sans Celery.

Usage déploiement :
  DJANGO_SETTINGS_MODULE=config.settings.production_nocelery
  gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
"""

from .production import *  # noqa: F403, F401

# Retirer les apps Celery (pas de worker/beat en production légère)
INSTALLED_APPS = [
    app for app in INSTALLED_APPS  # noqa: F405
    if app not in ('django_celery_beat', 'django_celery_results')
]

CELERY_BEAT_SCHEDULER = None
