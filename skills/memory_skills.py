from skills.base_skill import BaseSkill

class LearnPreferenceSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'learn_preference'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        key = entities.get('key')
        value = entities.get('value')
        if key and value:
            self.assistant.memory.learn_preference(key, value)
            return f"I will remember that your {key} is {value}."
        else:
            return "I'm sorry, I didn't understand what you want me to remember."

class GetPreferenceSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'get_preference'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        key = entities.get('key')
        if key:
            value = self.assistant.memory.get_preference(key)
            if value:
                return f"I remember that your {key} is {value}."
            else:
                return f"I don't have any information about your {key}."
        else:
            return "I'm sorry, I didn't understand what you want me to retrieve."

class AddContactSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'add_contact'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        name = entities.get('name')
        phone = entities.get('phone')
        email = entities.get('email')
        if name:
            self.assistant.memory.add_contact(name, phone, email)
            return f"I've added {name} to your contacts."
        else:
            return "I'm sorry, I didn't get the contact's name."
