import logging

from django.conf import settings

from .base import LLMProvider

logger = logging.getLogger('apps.rag')


class OpenAIProvider(LLMProvider):
    @property
    def name(self) -> str:
        return 'openai'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'OPENAI_API_KEY', ''))

    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 400, temperature: float = 0.1) -> str:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()
