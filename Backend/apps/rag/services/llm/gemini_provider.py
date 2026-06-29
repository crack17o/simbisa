import logging

from django.conf import settings

from .base import LLMProvider

logger = logging.getLogger('apps.rag')


class GeminiProvider(LLMProvider):
    @property
    def name(self) -> str:
        return 'gemini'

    def is_available(self) -> bool:
        return bool(getattr(settings, 'GEMINI_API_KEY', ''))

    def generate(self, system_prompt: str, user_prompt: str, *, max_tokens: int = 400, temperature: float = 0.1) -> str:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text.strip()
