"""Skill routing for Jarvis assistant."""

from skills.time_date import get_time_date
from skills.small_talk import handle_small_talk
from skills.system_control import open_app, shutdown_system, restart_system

class SkillRouter:
    def route(self, text: str) -> str | None:
        """Route text to appropriate skill based on keywords."""
        text_lower = text.lower()
        
        # Small talk
        response = handle_small_talk(text)
        if response:
            return response
        
        # Time/date
        if any(word in text_lower for word in ["time", "date", "clock"]):
            return get_time_date()
        
        # System control
        if "open" in text_lower:
            for app in ["chrome", "notepad", "calculator"]:
                if app in text_lower:
                    return open_app(app)
        
        if "shutdown" in text_lower:
            return shutdown_system()
        
        if "restart" in text_lower:
            return restart_system()
        
        return None