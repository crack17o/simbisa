from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ré-entraîne XGBoost à partir des décisions humaines (agents/managers)."

    def add_arguments(self, parser):
        parser.add_argument('--min-samples', type=int, default=200)

    def handle(self, *args, **options):
        from apps.scoring.tasks import retrain_xgboost_from_agent_decisions

        result = retrain_xgboost_from_agent_decisions(min_samples=options['min_samples'])
        self.stdout.write(self.style.SUCCESS(str(result)))

