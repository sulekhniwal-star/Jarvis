"""Enhanced API Manager for JARVIS-X with multiple free APIs."""

import asyncio
import aiohttp
import requests
import json
import random
from typing import Dict, Any, Optional, List
from core.config import FREE_APIS, NEWS_API_KEY, WEATHER_API_KEY
try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

class APIManager:
    """Manages all external API integrations."""
    
    def __init__(self):
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    # Entertainment APIs
    async def get_random_quote(self) -> Dict[str, Any]:
        """Get inspirational quote."""
        try:
            async with self.session.get(FREE_APIS["quotes"]) as response:
                data = await response.json()
                return {"quote": data["content"], "author": data["author"]}
        except Exception as e:
            logger.error(f"Quote API error: {e}")
            return {"quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs"}
    
    async def get_random_joke(self) -> Dict[str, Any]:
        """Get random joke."""
        try:
            async with self.session.get(FREE_APIS["jokes"]) as response:
                data = await response.json()
                return {"setup": data["setup"], "punchline": data["punchline"]}
        except Exception as e:
            logger.error(f"Joke API error: {e}")
            return {"setup": "Why don't scientists trust atoms?", "punchline": "Because they make up everything!"}
    
    async def get_random_fact(self) -> str:
        """Get random interesting fact."""
        try:
            async with self.session.get(FREE_APIS["facts"]) as response:
                data = await response.json()
                return data["text"]
        except Exception as e:
            logger.error(f"Facts API error: {e}")
            return "The human brain contains approximately 86 billion neurons."
    
    async def get_advice(self) -> str:
        """Get random advice."""
        try:
            async with self.session.get(FREE_APIS["advice"]) as response:
                data = await response.json()
                return data["slip"]["advice"]
        except Exception as e:
            logger.error(f"Advice API error: {e}")
            return "Take time to make your soul happy."
    
    # Information APIs
    async def get_crypto_price(self, crypto: str = "bitcoin") -> Dict[str, Any]:
        """Get cryptocurrency price."""
        try:
            url = f"{FREE_APIS['crypto']}?ids={crypto}&vs_currencies=usd"
            async with self.session.get(url) as response:
                data = await response.json()
                return {crypto: data[crypto]["usd"]}
        except Exception as e:
            logger.error(f"Crypto API error: {e}")
            return {crypto: "Price unavailable"}
    
    async def get_exchange_rates(self, base: str = "USD") -> Dict[str, Any]:
        """Get currency exchange rates."""
        try:
            url = f"{FREE_APIS['exchange']}"
            async with self.session.get(url) as response:
                data = await response.json()
                return {"base": data["base"], "rates": data["rates"]}
        except Exception as e:
            logger.error(f"Exchange API error: {e}")
            return {"base": "USD", "rates": {}}
    
    async def get_ip_info(self) -> Dict[str, Any]:
        """Get current IP information."""
        try:
            async with self.session.get(FREE_APIS["ip_info"]) as response:
                data = await response.json()
                return {
                    "ip": data.get("ip", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "country": data.get("country_name", "Unknown"),
                    "timezone": data.get("timezone", "Unknown")
                }
        except Exception as e:
            logger.error(f"IP Info API error: {e}")
            return {"ip": "Unknown", "city": "Unknown", "country": "Unknown"}
    
    # News API
    async def get_news(self, category: str = "technology", country: str = "us") -> List[Dict]:
        """Get latest news."""
        if not NEWS_API_KEY:
            return [{"title": "News API key not configured", "description": "Please add NEWS_API_KEY to .env"}]
        
        try:
            url = f"https://newsapi.org/v2/top-headlines?country={country}&category={category}&apiKey={NEWS_API_KEY}"
            async with self.session.get(url) as response:
                data = await response.json()
                return data.get("articles", [])[:5]  # Return top 5 articles
        except Exception as e:
            logger.error(f"News API error: {e}")
            return [{"title": "News unavailable", "description": "Error fetching news"}]
    
    # Weather API
    async def get_weather(self, city: str = "London") -> Dict[str, Any]:
        """Get weather information."""
        if not WEATHER_API_KEY:
            return {"error": "Weather API key not configured"}
        
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
            async with self.session.get(url) as response:
                data = await response.json()
                return {
                    "city": data["name"],
                    "temperature": data["main"]["temp"],
                    "description": data["weather"][0]["description"],
                    "humidity": data["main"]["humidity"],
                    "wind_speed": data["wind"]["speed"]
                }
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return {"error": "Weather data unavailable"}
    
    # Fun APIs
    async def get_cat_fact(self) -> str:
        """Get random cat fact."""
        try:
            async with self.session.get(FREE_APIS["cat_facts"]) as response:
                data = await response.json()
                return data["fact"]
        except Exception as e:
            logger.error(f"Cat Facts API error: {e}")
            return "Cats sleep 12-16 hours per day."
    
    async def get_dog_image(self) -> str:
        """Get random dog image URL."""
        try:
            async with self.session.get(FREE_APIS["dog_images"]) as response:
                data = await response.json()
                return data["message"]
        except Exception as e:
            logger.error(f"Dog Images API error: {e}")
            return "https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg"
    
    # NASA API
    async def get_nasa_apod(self) -> Dict[str, Any]:
        """Get NASA Astronomy Picture of the Day."""
        try:
            url = f"{FREE_APIS['nasa_apod']}?api_key=DEMO_KEY"
            async with self.session.get(url) as response:
                data = await response.json()
                return {
                    "title": data.get("title", "Unknown"),
                    "explanation": data.get("explanation", "No description available"),
                    "url": data.get("url", ""),
                    "date": data.get("date", "Unknown")
                }
        except Exception as e:
            logger.error(f"NASA API error: {e}")
            return {"title": "Space Image Unavailable", "explanation": "Error fetching NASA data"}
    
    # Dictionary API
    async def get_word_definition(self, word: str) -> Dict[str, Any]:
        """Get word definition."""
        try:
            url = f"{FREE_APIS['dictionary']}/{word}"
            async with self.session.get(url) as response:
                data = await response.json()
                if isinstance(data, list) and len(data) > 0:
                    meanings = data[0].get("meanings", [])
                    if meanings:
                        definition = meanings[0].get("definitions", [{}])[0].get("definition", "No definition found")
                        return {"word": word, "definition": definition}
        except Exception as e:
            logger.error(f"Dictionary API error: {e}")
        return {"word": word, "definition": "Definition not found"}
    
    # GitHub API
    async def get_github_user(self, username: str) -> Dict[str, Any]:
        """Get GitHub user information."""
        try:
            url = f"{FREE_APIS['github']}/users/{username}"
            async with self.session.get(url) as response:
                data = await response.json()
                return {
                    "name": data.get("name", "Unknown"),
                    "bio": data.get("bio", "No bio available"),
                    "public_repos": data.get("public_repos", 0),
                    "followers": data.get("followers", 0),
                    "following": data.get("following", 0)
                }
        except Exception as e:
            logger.error(f"GitHub API error: {e}")
            return {"error": "GitHub user not found"}

# Synchronous wrapper for backward compatibility
class SyncAPIManager:
    """Synchronous wrapper for APIManager."""
    
    def __init__(self):
        self.api_manager = APIManager()
    
    def _run_async(self, coro):
        """Run async function synchronously."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        async def wrapper():
            async with self.api_manager as api:
                return await coro
        
        return loop.run_until_complete(wrapper())
    
    def get_random_quote(self):
        return self._run_async(self.api_manager.get_random_quote())
    
    def get_random_joke(self):
        return self._run_async(self.api_manager.get_random_joke())
    
    def get_random_fact(self):
        return self._run_async(self.api_manager.get_random_fact())
    
    def get_advice(self):
        return self._run_async(self.api_manager.get_advice())
    
    def get_crypto_price(self, crypto="bitcoin"):
        return self._run_async(self.api_manager.get_crypto_price(crypto))
    
    def get_weather(self, city="London"):
        return self._run_async(self.api_manager.get_weather(city))
    
    def get_news(self, category="technology"):
        return self._run_async(self.api_manager.get_news(category))
    
    def get_cat_fact(self):
        return self._run_async(self.api_manager.get_cat_fact())
    
    def get_nasa_apod(self):
        return self._run_async(self.api_manager.get_nasa_apod())
    
    def get_word_definition(self, word):
        return self._run_async(self.api_manager.get_word_definition(word))