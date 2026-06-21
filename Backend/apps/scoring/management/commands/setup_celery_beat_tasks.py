"""Crée la tâche Celery Beat de ré-entraînement quotidien (mode avec Celery uniquement)."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Configure la tâche Beat : retrain XGBoost chaque jour à 03:00 (Kinshasa).'

    def handle(self, *args, **options):
        try:
            from django_celery_beat.models import CrontabSchedule, PeriodicTask
        except ImportError:
            self.stderr.write(self.style.ERROR(
                'django_celery_beat non installé. Utilisez config.settings.development '
                'ou lancez retrain_xgboost via Task Scheduler (mode sans Celery).'
            ))
            return

        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour='3',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
            timezone='Africa/Kinshasa',
        )

        task, created = PeriodicTask.objects.update_or_create(
            name='Simbisa — Retrain XGBoost (décisions agents) — 03:00',
            defaults={
                'crontab': schedule,
                'task': 'apps.scoring.tasks.retrain_xgboost_daily_3am',
                'enabled': True,
            },
        )

        verb = 'créée' if created else 'mise à jour'
        self.stdout.write(self.style.SUCCESS(f'Tâche Beat {verb} : {task.name}'))
