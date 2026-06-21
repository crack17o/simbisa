"""Interface abstraite pour les fournisseurs LLM (génération de texte)."""
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Contrat commun OpenAI / Gemini."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 400, temperature: float = 0.1) -> str:
        ...
