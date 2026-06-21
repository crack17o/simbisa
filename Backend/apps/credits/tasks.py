import logging
from datetime import timedelta
from apps.core.celery_compat import shared_task
from django.utils import timezone

logger = logging.getLogger('apps.credits')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_credit_scoring(self, demande_id: int):
    try:
        from apps.credits.models import DemandeCredit
        from apps.scoring.services import ScoringOrchestrator

        demande = DemandeCredit.objects.select_related('id_client__id_utilisateur').get(pk=demande_id)
        orchestrator = ScoringOrchestrator(demande)
        result = orchestrator.run()

        logger.info(f"Scoring terminé pour demande #{demande_id} — score: {result['score_global']}")
        return result

    except Exception as exc:
        logger.error(f"Erreur scoring demande #{demande_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task
def check_overdue_echeances():
    from apps.credits.models import Echeance
    today = timezone.now().date()
    updated = Echeance.objects.filter(
        statut='non_paye',
        date_echeance__lt=today
    ).update(statut='en_retard')
    logger.info(f"{updated} échéances marquées en retard.")
    return updated


@shared_task
def send_payment_reminders():
    from apps.credits.models import Echeance
    reminder_date = timezone.now().date() + timedelta(days=3)
    upcoming = Echeance.objects.filter(
        statut='non_paye',
        date_echeance=reminder_date
    ).select_related('id_credit__id_demande__id_client__id_utilisateur')

    for echeance in upcoming:
        client = echeance.id_credit.id_demande.id_client
        logger.info(f"Rappel envoyé à {client.id_utilisateur.telephone} pour échéance #{echeance.pk}")
    return upcoming.count()
