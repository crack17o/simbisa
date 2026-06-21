from django.conf import settings

from .base import EmbeddingProvider
from .gemini_embedder import GeminiEmbeddingProvider
from .openai_embedder import OpenAIEmbeddingProvider

_PROVIDERS = {
    'gemini': GeminiEmbeddingProvider,
    'openai': OpenAIEmbeddingProvider,
}


def get_embedding_provider(provider: str | None = None) -> EmbeddingProvider:
    name = (provider or settings.EMBEDDING_PROVIDER).lower().strip()
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ValueError(f"EMBEDDING_PROVIDER inconnu : {name!r}. Valeurs : {list(_PROVIDERS)}")
    return cls()


def embedding_is_available(provider: str | None = None) -> bool:
    try:
        return get_embedding_provider(provider).is_available()
    except ValueError:
        return False
