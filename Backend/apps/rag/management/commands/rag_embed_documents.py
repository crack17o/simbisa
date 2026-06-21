from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Calcule les embeddings des documents RAG (politiques Rawbank).'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Recalculer même si embedding existe.')
        parser.add_argument('--type', default='policy', help='Type de document (défaut: policy).')

    def handle(self, *args, **options):
        from apps.rag.services.embedder import DocumentEmbedder

        embedder = DocumentEmbedder()
        if not embedder.is_available():
            self.stderr.write(self.style.ERROR(
                'Provider embeddings indisponible. Vérifiez GEMINI_API_KEY ou OPENAI_API_KEY dans .env'
            ))
            return

        result = embedder.embed_all(document_type=options['type'], force=options['force'])
        self.stdout.write(self.style.SUCCESS(str(result)))
