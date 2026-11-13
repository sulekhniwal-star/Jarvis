"""
Project Jarvis — AI Provider Base Interface.
Ensures provider independence across Gemini, OpenAI, Claude, or Mock providers.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Returns the unique identifier of the provider."""
        pass

    @abstractmethod
    async def generate_plan(self, task_title: str, task_description: str) -> Dict[str, Any]:
        """Generates structured execution plan and task steps."""
        pass

    @abstractmethod
    async def generate_code_solution(
        self,
        task_description: str,
        files_context: Dict[str, str]
    ) -> Dict[str, Any]:
        """Generates code changes and explanations."""
        pass

