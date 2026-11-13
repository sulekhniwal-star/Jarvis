"""
Project Jarvis — Root Pytest Configuration and Test Fixtures.
Provides in-memory mock fixtures for zero-cost, deterministic testing.
"""

import pytest
from typing import AsyncGenerator
from unittest.mock import MagicMock


@pytest.fixture
def mock_ai_provider():
    """Returns a deterministic mock AI provider for testing without API calls."""
    provider = MagicMock()
    provider.name = "mock"
    provider.generate_plan.return_value = {
        "steps": [
            {"sequence": 1, "name": "Analyze repository", "tool": "repo_inspect"},
            {"sequence": 2, "name": "Create branch", "tool": "git_branch"},
            {"sequence": 3, "name": "Implement changes", "tool": "file_edit"},
            {"sequence": 4, "name": "Run tests", "tool": "test_runner"},
            {"sequence": 5, "name": "Create pull request", "tool": "github_pr"},
        ]
    }
    return provider


@pytest.fixture
def sample_task_payload():
    """Provides a canonical valid task creation payload."""
    return {
        "title": "Fix bug in calculation module",
        "description": "Fix divide-by-zero exception in calculate_ratio function.",
        "project_name": "demo-repo",
        "repository": "my-org/demo-repo",
        "priority": "HIGH",
        "idempotency_key": "test-task-uuid-001",
    }
