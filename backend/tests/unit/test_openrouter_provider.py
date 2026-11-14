"""
Project Jarvis — OpenRouter AI Provider Unit Tests.
Verifies JSON parsing, error handling, configuration loading, and mock HTTP exchanges.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.providers.openrouter import OpenRouterProvider, extract_json_from_response


def test_extract_json_from_response():
    """Verify robust extraction of JSON from markdown blocks and raw strings."""
    # Markdown json block
    md_sample = '```json\n{"summary": "Test Plan", "steps": []}\n```'
    parsed = extract_json_from_response(md_sample)
    assert parsed["summary"] == "Test Plan"

    # Markdown block without json tag
    md_generic = '```\n{"key": "value"}\n```'
    assert extract_json_from_response(md_generic)["key"] == "value"

    # Embedded in prose
    prose_sample = 'Here is your plan:\n{"title": "Fix bug"}\nHope this helps!'
    assert extract_json_from_response(prose_sample)["title"] == "Fix bug"


def test_openrouter_missing_key_raises_error():
    """Verify that calling OpenRouter without an API key raises clear ValueError."""
    provider = OpenRouterProvider(api_key="")
    with pytest.raises(ValueError, match="OPENROUTER_API_KEY is not configured"):
        provider._get_headers()


@pytest.mark.asyncio
async def test_openrouter_generate_plan_mocked_http():
    """Verify generate_plan formats request and parses response correctly."""
    mock_response_json = {
        "choices": [
            {
                "message": {
                    "content": '```json\n{"summary": "OpenRouter Plan", "steps": [{"sequence": 1, "name": "Inspect", "tool": "repo_inspect"}]}\n```'
                }
            }
        ]
    }

    mock_resp = httpx.Response(status_code=200, json=mock_response_json)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        provider = OpenRouterProvider(
            api_key="sk-or-v1-testkey12345", model="google/gemini-2.0-flash-001"
        )
        plan = await provider.generate_plan("Test Task", "Test Description")

        assert plan["summary"] == "OpenRouter Plan"
        assert len(plan["steps"]) == 1
        assert plan["steps"][0]["name"] == "Inspect"


@pytest.mark.asyncio
async def test_openrouter_gemini_fallback_cascade():
    """Verify that when OpenRouter fails, it cascades to Gemini if GEMINI_API_KEY is configured."""
    gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '```json\n{"summary": "Gemini Fallback Plan", "steps": [{"sequence": 1, "name": "Gemini Step", "tool_name": "repo_inspect"}]}\n```'
                        }
                    ]
                }
            }
        ]
    }

    # OpenRouter returns 500, then Gemini returns 200
    mock_or_fail = httpx.Response(status_code=500, text="Internal Server Error")
    mock_gemini_success = httpx.Response(status_code=200, json=gemini_response)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_or_fail, mock_gemini_success]

        with patch("app.core.config.settings.GEMINI_API_KEY", "gemini_mock_key_123"):
            provider = OpenRouterProvider(api_key="sk-or-v1-testkey")
            plan = await provider.generate_plan("Fallback Task", "Testing Cascade")

            assert plan["summary"] == "Gemini Fallback Plan"
            assert len(plan["steps"]) == 1
            assert plan["steps"][0]["name"] == "Gemini Step"


@pytest.mark.asyncio
async def test_openrouter_resilient_code_fallback():
    """Verify code solution generator returns safe fallback structure when APIs fail."""
    mock_or_fail = httpx.Response(status_code=429, text="Rate limit exceeded")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_or_fail

        with patch("app.core.config.settings.GEMINI_API_KEY", ""):
            provider = OpenRouterProvider(api_key="sk-or-v1-testkey")
            solution = await provider.generate_code_solution(
                "Task with network down", {"app.py": "print('hello')"}
            )

            assert "fallback" in solution["explanation"].lower()
            assert "changes" in solution
            assert isinstance(solution["changes"], list)

