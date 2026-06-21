"""Service d'embedding pour le RAG — indexation des documents politiques."""
import logging

from apps.rag.models import VectorDocument
from .embeddings.factory import embedding_is_available, get_embedding_provider

logger = logging.getLogger('apps.rag')


class DocumentEmbedder:
    """Calcule et persiste les embeddings des VectorDocument."""

    def __init__(self, provider=None):
        self._provider = provider

    @property
    def provider(self):
        if self._provider is None:
            self._provider = get_embedding_provider()
        return self._provider

    def is_available(self) -> bool:
        return embedding_is_available()

    def embed_text(self, text: str, *, for_query: bool = False) -> list[float]:
        if for_query:
            return self.provider.embed_query(text)
        return self.provider.embed_document(text)

    def embed_document(self, doc: VectorDocument, *, save: bool = True) -> list[float]:
        text = f"{doc.title}\n{doc.content}".strip()
        embedding = self.provider.embed_document(text)
        if save:
            doc.embedding = embedding
            doc.save(update_fields=['embedding', 'updated_at'])
        return embedding

    def embed_all(self, *, document_type: str | None = 'policy', force: bool = False) -> dict:
        if not self.is_available():
            return {'embedded': 0, 'skipped': 0, 'reason': 'embedding_provider_unavailable'}

        qs = VectorDocument.objects.all()
        if document_type:
            qs = qs.filter(document_type=document_type)
        if not force:
            qs = qs.filter(embedding__isnull=True)

        embedded = 0
        skipped = 0
        for doc in qs:
            try:
                self.embed_document(doc)
                embedded += 1
            except Exception as exc:
                logger.warning(f"Embedding échoué doc #{doc.pk}: {exc}")
                skipped += 1

        return {'embedded': embedded, 'skipped': skipped, 'provider': self.provider.name}
