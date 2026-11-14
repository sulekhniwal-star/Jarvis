"""
Project Jarvis — OpenRouter AI Provider.
Connects to OpenRouter.ai (OpenAI-compatible) gateway supporting any model:
Gemini 2.0 Flash, Claude 3.5 Sonnet, DeepSeek V3/R1, Llama 3.3, etc.
"""

import json
import re
from typing import Any, cast

import httpx
import structlog

from app.core.config import settings
from app.providers.base import AIProvider

logger = structlog.get_logger()

# Global cumulative token usage tracker for OpenRouter
_TOTAL_TOKEN_USAGE = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}


def get_total_token_usage() -> dict[str, int]:
    """Returns cumulative tokens consumed across all OpenRouter calls."""
    return dict(_TOTAL_TOKEN_USAGE)


def extract_json_from_response(text: str) -> dict[str, Any]:
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
        return cast(dict[str, Any], parsed)
    return {"raw": str(parsed)}


class OpenRouterProvider(AIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 60.0,
    ):
        self.api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "openrouter"

    def _get_headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY is not configured. Please set it in .env or settings."
            )
        return {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/sulekhniwal-star/Jarvis",
            "X-Title": "Project Jarvis",
            "Content-Type": "application/json",
        }

    async def _call_gemini_fallback(
        self, messages: list[dict[str, str]], max_tokens: int = 2048
    ) -> str:
        """Direct fallback to Google Gemini Generative API if GEMINI_API_KEY is configured."""
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured for fallback.")

        contents = []
        for msg in messages:
            role = "user" if msg.get("role") in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            f"?key={settings.GEMINI_API_KEY}"
        )
        payload = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.2,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise RuntimeError(
                    f"Gemini fallback failed (HTTP {res.status_code}): {res.text[:200]}"
                )
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return str(parts[0].get("text", ""))
            return ""

    async def _call_chat_completion(
        self, messages: list[dict[str, str]], max_tokens: int = 2048
    ) -> str:
        """Sends chat completion request to OpenRouter endpoint with automated Gemini cascade."""
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.post(url, headers=self._get_headers(), json=payload)
                if res.status_code != 200:
                    raise RuntimeError(
                        f"OpenRouter API call failed (HTTP {res.status_code}): {res.text[:200]}"
                    )

                data = res.json()
                usage = data.get("usage", {})
                if usage:
                    _TOTAL_TOKEN_USAGE["prompt_tokens"] += usage.get("prompt_tokens", 0)
                    _TOTAL_TOKEN_USAGE["completion_tokens"] += usage.get("completion_tokens", 0)
                    _TOTAL_TOKEN_USAGE["total_tokens"] += usage.get("total_tokens", 0)

                content = data["choices"][0]["message"]["content"]
                return str(content) if content is not None else ""
        except Exception as primary_err:
            logger.warning(
                "openrouter_primary_failed_attempting_fallback",
                model=self.model,
                error=str(primary_err),
            )
            if settings.GEMINI_API_KEY:
                try:
                    logger.info("gemini_fallback_cascade_invoked", model=settings.GEMINI_MODEL)
                    return await self._call_gemini_fallback(messages, max_tokens=max_tokens)
                except Exception as fallback_err:
                    logger.error("gemini_fallback_failed", error=str(fallback_err))
            raise primary_err

    async def generate_plan(self, task_title: str, task_description: str) -> dict[str, Any]:
        """Generates structured execution plan and task steps using OpenRouter."""
        prompt = (
            "You are Jarvis, an autonomous software architect and senior AI engineer.\n"
            "Analyze the software development task and generate a structured JSON plan.\n"
            "Return ONLY a JSON object with this exact structure:\n"
            "{\n"
            '  "summary": "Brief approach summary",\n'
            '  "steps": [\n'
            '    {"sequence": 1, "name": "Step name", "tool_name": "repo_inspect", "description": "What to do"},\n'
            '    {"sequence": 2, "name": "Step name", "tool_name": "file_edit", "description": "What to do"},\n'
            '    {"sequence": 3, "name": "Step name", "tool_name": "test_runner", "description": "What to do"}\n'
            "  ]\n"
            "}\n\n"
            f"Task Title: {task_title}\n"
            f"Task Description: {task_description}\n"
        )

        messages = [
            {"role": "system", "content": "You are a precise software engineering planning agent."},
            {"role": "user", "content": prompt},
        ]

        try:
            content = await self._call_chat_completion(messages, max_tokens=2048)
            return extract_json_from_response(content)
        except Exception as err:
            logger.warning("openrouter_fallback_active", reason=str(err))
            return {
                "summary": f"Autonomous plan for '{task_title}' (Resilient Fallback Planner)",
                "missing_components": [
                    "Integration test coverage",
                    "Automated CI validation pipeline",
                    "Production documentation and configuration",
                ],
                "steps": [
                    {
                        "sequence": 1,
                        "name": "Deep repository structure inspection",
                        "tool_name": "repo_inspect",
                        "description": "Audit file tree and identify components",
                    },
                    {
                        "sequence": 2,
                        "name": "Implement missing architecture components",
                        "tool_name": "file_edit",
                        "description": "Fill missing modules and resolve gaps",
                    },
                    {
                        "sequence": 3,
                        "name": "Run automated test and lint suite",
                        "tool_name": "test_runner",
                        "description": "Verify code stability",
                    },
                    {
                        "sequence": 4,
                        "name": "Generate pull request and documentation",
                        "tool_name": "github_pr",
                        "description": "Commit changes and stage PR",
                    },
                ],
            }

    async def generate_code_solution(
        self, task_description: str, files_context: dict[str, str]
    ) -> dict[str, Any]:
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
            '  "changes": [\n'
            '    {"file_path": "path/to/file.py", "content": "full new content of the file"}\n'
            "  ]\n"
            "}\n\n"
            f"Task Description: {task_description}\n\n"
            f"Current Workspace Files:\n{context_str}\n"
        )

        messages = [
            {
                "role": "system",
                "content": "You are an expert software developer writing production code.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            content = await self._call_chat_completion(messages, max_tokens=4096)
            parsed = extract_json_from_response(content)
        except Exception as err:
            logger.warning("openrouter_code_solution_fallback_active", reason=str(err))
            parsed = {
                "explanation": f"Automated fallback patch for: {task_description[:80]}",
                "changes": [],
            }

        # Normalize patches and changes
        if "patches" in parsed and "changes" not in parsed:
            parsed["changes"] = [
                {"file_path": p.get("file_path"), "content": p.get("modified_code", "")}
                for p in parsed["patches"]
            ]
        elif "changes" in parsed and "patches" not in parsed:
            parsed["patches"] = [
                {"file_path": c.get("file_path"), "modified_code": c.get("content", "")}
                for c in parsed["changes"]
            ]
        return parsed
