"""
Project Jarvis — AI Provider Factory.
"""

from app.core.config import settings
from app.providers.base import AIProvider
from app.providers.mock import MockAIProvider
from app.providers.openrouter import OpenRouterProvider


def get_ai_provider() -> AIProvider:
    """Returns the configured AI Provider instance."""
    provider_name = settings.DEFAULT_AI_PROVIDER.lower()
    if provider_name == "openrouter":
        return OpenRouterProvider()
    if provider_name == "mock":
        return MockAIProvider()
    return MockAIProvider()

