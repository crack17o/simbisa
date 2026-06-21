from django.conf import settings

from .base import EmbeddingProvider


class OpenAIEmbeddingProvider(EmbeddingProvider):
    @property
    def name(self) -> str:
        return 'openai'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'OPENAI_API_KEY', ''))

    def _embed(self, text: str) -> list[float]:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        return list(response.data[0].embedding)

    def embed_document(self, text: str) -> list[float]:
        return self._embed(text)

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)
