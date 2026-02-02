"""Enhanced information skill with multiple free APIs."""

import re
from loguru import logger
from core.api_manager import APIManager

class InformationSkill:
    """Provides information using various free APIs."""

    def __init__(self):
        self.api_manager = APIManager()
        self.commands = {
            "weather": ["weather", "temperature", "forecast", "climate"],
            "news": ["news", "headlines", "latest news", "current events"],
            "crypto": ["bitcoin", "cryptocurrency", "crypto", "btc", "eth",
                       "ethereum"],
            "exchange": ["exchange rate", "currency", "dollar", "euro",
                         "conversion"],
            "definition": ["define", "meaning", "what is", "definition of"],
            "ip": ["my ip", "ip address", "location", "where am i"],
            "github": ["github", "git profile", "repository", "repos"]
        }

    def can_handle(self, text: str) -> bool:
        """Check if this skill can handle the request."""
        text_lower = text.lower()
        for command_list in self.commands.values():
            if any(cmd in text_lower for cmd in command_list):
                return True
        return False

    def execute(self, text: str) -> str:
        """Execute information command."""
        text_lower = text.lower()

        try:
            # Weather requests
            if any(cmd in text_lower for cmd in self.commands["weather"]):
                return self._get_weather(text)

            # News requests
            if any(cmd in text_lower for cmd in self.commands["news"]):
                return self._get_news()

            # Crypto requests
            if any(cmd in text_lower for cmd in self.commands["crypto"]):
                return self._get_crypto_info(text)

            # Exchange rate requests
            if any(cmd in text_lower for cmd in self.commands["exchange"]):
                return self._get_exchange_rates()

            # Definition requests
            if any(cmd in text_lower for cmd in self.commands["definition"]):
                return self._get_definition(text)

            # IP information requests
            if any(cmd in text_lower for cmd in self.commands["ip"]):
                return self._get_ip_info()

            # GitHub requests
            if any(cmd in text_lower for cmd in self.commands["github"]):
                return self._get_github_info(text)

            return (
                "I can help you with weather, news, cryptocurrency prices, "
                "definitions, and more!"
            )

        except (KeyError, ValueError, AttributeError) as e:
            logger.error(f"Information skill error: {e}")
            return (
                "Sorry, I'm having trouble accessing information services right now."
            )

    def _get_weather(self, text: str) -> str:
        """Get weather information."""
        city = self._extract_city(text)
        return (
            f"Weather information for {city} is currently unavailable. "
            "Please check a weather service directly."
        )

    def _get_news(self) -> str:
        """Get latest news."""
        return (
            "News service is currently unavailable. "
            "Please check a news website for the latest headlines."
        )

    def _get_crypto_info(self, text: str) -> str:
        """Get cryptocurrency information."""
        crypto = self._extract_crypto(text)
        return (
            f"Cryptocurrency price information for {crypto} is currently unavailable. "
            "Please check a crypto exchange for current prices."
        )

    def _get_exchange_rates(self) -> str:
        """Get currency exchange rates."""
        return (
            "Exchange rate information is currently unavailable. "
            "Please check a financial service for current rates."
        )

    def _get_definition(self, text: str) -> str:
        """Get word definition."""
        word = self._extract_word_to_define(text)
        if not word:
            return "Please specify a word you'd like me to define."
        return (
            f"Dictionary service is currently unavailable. "
            f"Please check a dictionary for the definition of '{word}'."
        )

    def _get_ip_info(self) -> str:
        """Get IP and location information."""
        return (
            "IP information service is currently unavailable. "
            "Please check an IP lookup service for your location details."
        )

    def _get_github_info(self, text: str) -> str:
        """Get GitHub user information."""
        username = self._extract_github_username(text)
        if not username:
            return "Please specify a GitHub username to look up."
        return (
            f"GitHub information service is currently unavailable. "
            f"Please visit github.com/{username} directly."
        )

    # Helper methods for text extraction
    def _extract_city(self, text: str) -> str:
        """Extract city name from text."""
        # Look for patterns like "weather in London" or "London weather"
        patterns = [
            r"weather in ([a-zA-Z\\s]+)",
            r"([a-zA-Z\\s]+) weather",
            r"temperature in ([a-zA-Z\\s]+)"
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return "London"  # Default city

    def _extract_news_category(self, text: str) -> str:
        """Extract news category from text."""
        categories = {
            "tech": ["technology", "tech", "ai", "computer"],
            "business": ["business", "finance", "economy", "market"],
            "sports": ["sports", "football", "basketball", "soccer"],
            "health": ["health", "medical", "medicine", "covid"],
            "science": ["science", "research", "study", "discovery"],
            "entertainment": ["entertainment", "movie", "celebrity", "music"]
        }

        text_lower = text.lower()
        for category, keywords in categories.items():
            if any(keyword in text_lower for keyword in keywords):
                return category

        return "technology"  # Default category

    def _extract_crypto(self, text: str) -> str:
        """Extract cryptocurrency name from text."""
        crypto_map = {
            "bitcoin": ["bitcoin", "btc"],
            "ethereum": ["ethereum", "eth"],
            "cardano": ["cardano", "ada"],
            "polkadot": ["polkadot", "dot"],
            "chainlink": ["chainlink", "link"]
        }

        text_lower = text.lower()
        for crypto, keywords in crypto_map.items():
            if any(keyword in text_lower for keyword in keywords):
                return crypto

        return "bitcoin"  # Default crypto

    def _extract_word_to_define(self, text: str) -> str:
        """Extract word to define from text."""
        patterns = [
            r"define ([a-zA-Z]+)",
            r"meaning of ([a-zA-Z]+)",
            r"what is ([a-zA-Z]+)",
            r"definition of ([a-zA-Z]+)"
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ""

    def _extract_github_username(self, text: str) -> str:
        """Extract GitHub username from text."""
        patterns = [
            r"github user ([a-zA-Z0-9\\-_]+)",
            r"github profile ([a-zA-Z0-9\\-_]+)",
            r"github ([a-zA-Z0-9\\-_]+)"
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ""
