from django.conf import settings

from .base import EmbeddingProvider


class GeminiEmbeddingProvider(EmbeddingProvider):
    @property
    def name(self) -> str:
        return 'gemini'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'GEMINI_API_KEY', ''))

    def _embed(self, text: str, task_type: str) -> list[float]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type=task_type),
        )
        return list(result.embeddings[0].values)

    def embed_document(self, text: str) -> list[float]:
        return self._embed(text, task_type='RETRIEVAL_DOCUMENT')

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text, task_type='RETRIEVAL_QUERY')
