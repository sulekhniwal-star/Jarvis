"""
Project Jarvis — OpenRouter AI Provider.
Connects to OpenRouter.ai (OpenAI-compatible) gateway supporting any model:
Gemini 2.0 Flash, Claude 3.5 Sonnet, DeepSeek V3/R1, Llama 3.3, etc.
"""

import json
import re
from typing import Any, Dict, List, Optional, cast
import httpx
import structlog

from app.core.config import settings
from app.providers.base import AIProvider

logger = structlog.get_logger()


def extract_json_from_response(text: str) -> Dict[str, Any]:
    """Extracts and parses JSON object from model response, handling markdown blocks."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        raw_json = match.group(1)
    else:
        # Look for first { to last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            raw_json = text[start : end + 1]
        else:
            raw_json = text

    parsed = json.loads(raw_json)
    if isinstance(parsed, dict):
        return cast(Dict[str, Any], parsed)
    return {"raw": str(parsed)}


class OpenRouterProvider(AIProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = 60.0
    ):
        self.api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "openrouter"

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY is not configured. Please set it in .env or settings."
            )
        return {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/sulekhniwal-star/Jarvis",
            "X-Title": "Project Jarvis",
            "Content-Type": "application/json"
        }

    async def _call_chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """Sends chat completion request to OpenRouter endpoint."""
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1000,
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            res = await client.post(url, headers=self._get_headers(), json=payload)
            if res.status_code != 200:
                logger.error(
                    "openrouter_api_error",
                    status_code=res.status_code,
                    body=res.text[:500]
                )
                raise RuntimeError(
                    f"OpenRouter API call failed (HTTP {res.status_code}): {res.text[:200]}"
                )

            data = res.json()
            content = data["choices"][0]["message"]["content"]
            return str(content) if content is not None else ""

    async def generate_plan(self, task_title: str, task_description: str) -> Dict[str, Any]:
        """Generates structured execution plan and task steps using OpenRouter."""
        prompt = (
            "You are Jarvis, an autonomous software architect and senior AI engineer.\n"
            "Analyze the software development task and generate a structured JSON plan.\n"
            "Return ONLY a JSON object with this exact structure:\n"
            "{\n"
            '  "summary": "Brief approach summary",\n'
            '  "steps": [\n'
            '    {"sequence": 1, "name": "Step name", "tool": "repo_inspect", "description": "What to do"},\n'
            '    {"sequence": 2, "name": "Step name", "tool": "file_edit", "description": "What to do"},\n'
            '    {"sequence": 3, "name": "Step name", "tool": "test_runner", "description": "What to do"}\n'
            "  ]\n"
            "}\n\n"
            f"Task Title: {task_title}\n"
            f"Task Description: {task_description}\n"
        )

        messages = [
            {"role": "system", "content": "You are a precise software engineering planning agent."},
            {"role": "user", "content": prompt}
        ]

        try:
            content = await self._call_chat_completion(messages)
            return extract_json_from_response(content)
        except Exception as err:
            logger.warning("openrouter_fallback_active", reason=str(err))
            return {
                "summary": f"Autonomous plan for '{task_title}' (Resilient Fallback Planner)",
                "missing_components": [
                    "Integration test coverage",
                    "Automated CI validation pipeline",
                    "Production documentation and configuration"
                ],
                "steps": [
                    {"sequence": 1, "name": "Deep repository structure inspection", "tool": "repo_inspect", "description": "Audit file tree and identify components"},
                    {"sequence": 2, "name": "Implement missing architecture components", "tool": "file_edit", "description": "Fill missing modules and resolve gaps"},
                    {"sequence": 3, "name": "Run automated test and lint suite", "tool": "test_runner", "description": "Verify code stability"},
                    {"sequence": 4, "name": "Generate pull request and documentation", "tool": "github_pr", "description": "Commit changes and stage PR"},
                ]
            }

    async def generate_code_solution(
        self,
        task_description: str,
        files_context: Dict[str, str]
    ) -> Dict[str, Any]:
        """Generates code changes and explanations using OpenRouter."""
        context_str = "\n\n".join(
            f"--- FILE: {path} ---\n{content}" for path, content in files_context.items()
        )

        prompt = (
            "You are Jarvis Coding Agent.\n"
            "Generate targeted code changes to resolve the task.\n"
            "Return ONLY a JSON object with this structure:\n"
            "{\n"
            '  "explanation": "Summary of changes made",\n'
            '  "patches": [\n'
            '    {"file_path": "path/to/file.py", "modified_code": "full new content of the file"}\n'
            "  ]\n"
            "}\n\n"
            f"Task Description: {task_description}\n\n"
            f"Current Workspace Files:\n{context_str}\n"
        )

        messages = [
            {"role": "system", "content": "You are an expert software developer writing production code."},
            {"role": "user", "content": prompt}
        ]

        content = await self._call_chat_completion(messages)
        return extract_json_from_response(content)

