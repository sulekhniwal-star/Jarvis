from skills.base_skill import BaseSkill
from tavily import TavilyClient
import os

class WebSearchSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant
        self.tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'web_search'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        query = entities.get('query')
        if not query:
            return "Please specify what you want to search for."
        
        try:
            response = self.tavily.search(query, search_depth="advanced")
            return response["results"][0]["content"]

        except Exception as e:
            print(f"❌ Web search error: {e}")
            return "Sorry, I couldn't perform the web search."
