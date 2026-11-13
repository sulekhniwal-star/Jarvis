"""
Project Jarvis — AI Provider Factory.
"""

from app.core.config import settings
from app.providers.base import AIProvider
from app.providers.mock import MockAIProvider


def get_ai_provider() -> AIProvider:
    """Returns the configured AI Provider instance."""
    provider_name = settings.DEFAULT_AI_PROVIDER.lower()
    if provider_name == "mock":
        return MockAIProvider()
    # When other providers are added, they are instantiated here
    return MockAIProvider()
