from abc import ABC, abstractmethod

class BaseSkill(ABC):
    """
    Abstract base class for all skills.
    """

    @abstractmethod
    def can_handle(self, intent: str, entities: dict) -> bool:
        """
        Return True if the skill can handle the given intent and entities.
        """
        pass

    @abstractmethod
    def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        """
        Execute the skill's logic and return a response.
        """
        pass
