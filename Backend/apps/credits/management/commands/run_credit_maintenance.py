"""Tâches de maintenance crédit (échéances en retard, rappels) — mode sans Celery."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Exécute les tâches périodiques crédit : échéances en retard et rappels de paiement.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--only',
            choices=['overdue', 'reminders', 'all'],
            default='all',
            help='Quelle tâche exécuter (défaut : all).',
        )

    def handle(self, *args, **options):
        from apps.credits.tasks import check_overdue_echeances, send_payment_reminders

        only = options['only']
        results = {}

        if only in ('overdue', 'all'):
            results['overdue_updated'] = check_overdue_echeances()
            self.stdout.write(f"Échéances marquées en retard : {results['overdue_updated']}")

        if only in ('reminders', 'all'):
            results['reminders_sent'] = send_payment_reminders()
            self.stdout.write(f"Rappels de paiement traités : {results['reminders_sent']}")

        self.stdout.write(self.style.SUCCESS(str(results)))
