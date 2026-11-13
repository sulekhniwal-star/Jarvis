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
