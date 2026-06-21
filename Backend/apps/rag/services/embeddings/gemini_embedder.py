from django.conf import settings

from .base import EmbeddingProvider


class GeminiEmbeddingProvider(EmbeddingProvider):
    @property
    def name(self) -> str:
        return 'gemini'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'GEMINI_API_KEY', ''))

    def _embed(self, text: str, task_type: str) -> list[float]:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        result = genai.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            content=text,
            task_type=task_type,
        )
        return list(result['embedding'])

    def embed_document(self, text: str) -> list[float]:
        return self._embed(text, task_type='retrieval_document')

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text, task_type='retrieval_query')
