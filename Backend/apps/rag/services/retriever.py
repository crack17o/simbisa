import logging

import numpy as np
from django.conf import settings

from apps.rag.models import VectorDocument
from .embedder import DocumentEmbedder

logger = logging.getLogger('apps.rag')


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=float)
    vb = np.array(b, dtype=float)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


class VectorRetriever:
    """Recherche les passages les plus pertinents (similarité cosinus sur embeddings)."""

    def retrieve(self, query: str, k: int | None = None) -> list[str]:
        k = k or settings.RAG_RETRIEVAL_K
        embedder = DocumentEmbedder()

        docs = list(
            VectorDocument.objects.filter(document_type='policy').exclude(embedding__isnull=True)
        )

        if not docs:
            logger.info("Aucun document vectorisé — fallback sur les derniers documents policy.")
            fallback = VectorDocument.objects.filter(document_type='policy').order_by('-created_at')[:k]
            return [d.content for d in fallback]

        if not embedder.is_available():
            return [d.content for d in sorted(docs, key=lambda d: d.created_at, reverse=True)[:k]]

        try:
            query_vec = embedder.embed_text(query, for_query=True)
        except Exception as exc:
            logger.warning(f"Embedding requête échoué: {exc}")
            return [d.content for d in docs[:k]]

        scored = []
        for doc in docs:
            if not doc.embedding:
                continue
            score = _cosine_similarity(query_vec, doc.embedding)
            scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc.content for _, doc in scored[:k]]
