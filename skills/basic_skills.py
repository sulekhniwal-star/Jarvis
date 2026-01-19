import datetime
import pyjokes
from skills.base_skill import BaseSkill

class GreetingSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'greeting'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        return "Hello there! How can I assist you today?"

class TimeSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'time'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        current_time = datetime.datetime.now().strftime("%H:%M:%S")
        return f"The current time is {current_time}"

class JokeSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'joke'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        return pyjokes.get_joke()

class ExitSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'exit'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        assistant.is_running = False
        return "Goodbye! It was a pleasure assisting you."
