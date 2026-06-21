"""Forcer le scoring d'une demande de crédit (utile en mode sans Celery)."""
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Lance le scoring complet (multi-moteur + XAI) pour une demande de crédit.'

    def add_arguments(self, parser):
        parser.add_argument('demande_id', type=int, help='ID de la DemandeCredit')

    def handle(self, *args, **options):
        from apps.credits.models import DemandeCredit
        from apps.scoring.services import ScoringOrchestrator

        demande_id = options['demande_id']
        try:
            demande = DemandeCredit.objects.select_related('id_client__id_utilisateur').get(pk=demande_id)
        except DemandeCredit.DoesNotExist as exc:
            raise CommandError(f'Demande #{demande_id} introuvable.') from exc

        result = ScoringOrchestrator(demande).run()
        self.stdout.write(self.style.SUCCESS(
            f"Scoring terminé — demande #{demande_id} | score={result.get('score_global')} | "
            f"décision={result.get('decision')}"
        ))
        self.stdout.write(str(result))
