import httpx
from django.conf import settings

from .base import EmbeddingProvider


class GeminiEmbeddingProvider(EmbeddingProvider):
    @property
    def name(self) -> str:
        return 'gemini'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'GEMINI_API_KEY', ''))

    def _embed(self, text: str, task_type: str) -> list[float]:
        model = settings.GEMINI_EMBEDDING_MODEL
        model_id = model.removeprefix('models/')
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:embedContent"

        api_key = settings.GEMINI_API_KEY
        # Les clés AIzaSy utilisent x-goog-api-key ; les tokens OAuth2 (AQ. / ya29.) utilisent Bearer
        if api_key.startswith('AIzaSy'):
            auth_headers = {"x-goog-api-key": api_key}
        else:
            auth_headers = {"Authorization": f"Bearer {api_key}"}

        response = httpx.post(
            url,
            headers=auth_headers,
            json={
                "model": model,
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()["embedding"]["values"]

    def embed_document(self, text: str) -> list[float]:
        return self._embed(text, 'RETRIEVAL_DOCUMENT')

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text, 'RETRIEVAL_QUERY')
