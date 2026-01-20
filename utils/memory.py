"""Memory management for Jarvis assistant."""

from collections import deque

class Memory:
    def __init__(self):
        self.interactions = deque(maxlen=10)
    
    def add(self, user_text: str, assistant_text: str):
        """Add a user-assistant interaction pair."""
        self.interactions.append((user_text, assistant_text))
    
    def get_context(self) -> str:
        """Get formatted context of recent interactions."""
        if not self.interactions:
            return ""
        
        context = []
        for user_text, assistant_text in self.interactions:
            context.append(f"User: {user_text}")
            context.append(f"Jarvis: {assistant_text}")
        
        return "\n".join(context)