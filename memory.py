import json
import os
from typing import Dict, Any

from config import logger

class MemoryHandler:
    """Handles memory load/save functionality"""

    def __init__(self, memory_file: str = "memory.json"):
        self.memory_file = memory_file
        self.memory: Dict[str, Any] = self.load_memory()

    def load_memory(self) -> Dict[str, Any]:
        """Load memory from JSON file"""
        try:
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading memory: {e}")
            return {}

    def save_memory(self):
        """Save memory to JSON file"""
        try:
            with open(self.memory_file, 'w') as f:
                json.dump(self.memory, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving memory: {e}")

    async def remember_fact(self, key: str, value: str) -> str:
        """Remember a fact"""
        self.memory[key] = value
        self.save_memory()
        return f"Remembered: {key} = {value}"

    async def recall_memory(self, key: str) -> str:
        """Recall a remembered fact"""
        if key in self.memory:
            return f"{key}: {self.memory[key]}"
        else:
            return f"No memory found for {key}"
