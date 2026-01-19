import asyncio
import os
import requests
from skills.base_skill import BaseSkill

class NewsSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant
        self.api_key = os.getenv("NEWS_API_KEY")

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'news'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not self.api_key:
            return "The News API key is not configured. Please set the NEWS_API_KEY environment variable."

        category = entities.get('category', 'general')
        return await self.get_news(category)

    async def get_news(self, category: str):
        """Asynchronously fetch news headlines."""
        url = f"https://newsapi.org/v2/top-headlines"
        params = {
            "apiKey": self.api_key,
            "category": category,
            "country": "in",  # For India
            "pageSize": 5,
        }
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.get(url, params=params, timeout=5))
            data = response.json()

            if data["status"] == "ok":
                articles = data["articles"]
                if not articles:
                    return f"I couldn't find any news for the {category} category."

                headlines = [f"{i+1}. {article['title']}" for i, article in enumerate(articles)]
                return f"Here are the top headlines in {category}:\n" + "\n".join(headlines)
            else:
                return "Sorry, I couldn't fetch the news at the moment."
        except requests.RequestException:
            return "I couldn't fetch the news. Please check your internet connection."
        except Exception as e:
            print(f"❌ News error: {e}")
            return "Sorry, I couldn't get the news information."
