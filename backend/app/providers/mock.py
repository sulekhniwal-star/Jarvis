"""
Project Jarvis — Mock AI Provider.
Provides deterministic, fast, offline responses for CI and automated tests.
Guarantees ₹0 expenditure and reproducible execution paths.
"""

from typing import Any

from app.providers.base import AIProvider


class MockAIProvider(AIProvider):
    @property
    def name(self) -> str:
        return "mock"

    async def generate_plan(self, task_title: str, task_description: str) -> dict[str, Any]:
        """Returns deterministic, structured task steps."""
        return {
            "summary": f"Plan for: {task_title}",
            "steps": [
                {
                    "sequence": 1,
                    "name": "Repository Reconnaissance",
                    "description": "Inspect structure and locate relevant modules.",
                    "tool_name": "repo_inspect",
                },
                {
                    "sequence": 2,
                    "name": "Branch Preparation",
                    "description": "Create isolated feature branch for changes.",
                    "tool_name": "git_branch",
                },
                {
                    "sequence": 3,
                    "name": "Code Implementation",
                    "description": "Apply targeted bug fix or feature implementation.",
                    "tool_name": "file_edit",
                },
                {
                    "sequence": 4,
                    "name": "Automated Verification",
                    "description": "Execute test suite and parse exit codes.",
                    "tool_name": "test_runner",
                },
                {
                    "sequence": 5,
                    "name": "Pull Request Generation",
                    "description": "Open PR with structured summary and test evidence.",
                    "tool_name": "github_pr",
                },
            ],
        }

    async def generate_code_solution(
        self, task_description: str, files_context: dict[str, str]
    ) -> dict[str, Any]:
        """Returns synthetic patch for testing."""
        return {
            "explanation": "Applied defensive null-check to prevent runtime exception.",
            "changes": [
                {
                    "file_path": "src/calculator.py",
                    "action": "modify",
                    "content": "def calculate(a, b):\n    if b == 0:\n        return 0\n    return a / b\n",
                }
            ],
        }
