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
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            user_prompt,
            generation_config={
                'temperature': temperature,
                'max_output_tokens': max_tokens,
            },
        )
        return response.text.strip()
