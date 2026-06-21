"""Factory LLM — sélection du provider selon settings.LLM_PROVIDER."""
from django.conf import settings

from .base import LLMProvider
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider

_PROVIDERS = {
    'gemini': GeminiProvider,
    'openai': OpenAIProvider,
}


def get_llm_provider(provider: str | None = None) -> LLMProvider:
    name = (provider or settings.LLM_PROVIDER).lower().strip()
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ValueError(f"LLM_PROVIDER inconnu : {name!r}. Valeurs : {list(_PROVIDERS)}")
    return cls()


def llm_is_available(provider: str | None = None) -> bool:
    try:
        return get_llm_provider(provider).is_available()
    except ValueError:
        return False
