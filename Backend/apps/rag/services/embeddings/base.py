"""Interface abstraite pour les embeddings (retrieval RAG)."""
from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    def embed_document(self, text: str) -> list[float]:
        """Embedding pour un document indexé."""

    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Embedding pour une requête de recherche."""
