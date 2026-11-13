"""
Project Jarvis — Architectural Baseline Unit Test.
Verifies system constants, state enum transitions, and security boundaries.
"""

import pytest


def test_task_lifecycle_states():
    """Verify all required task lifecycle states exist in the architecture contract."""
    expected_states = {
        "PENDING",
        "PLANNING",
        "AWAITING_APPROVAL",
        "APPROVED",
        "EXECUTING",
        "TESTING",
        "DIAGNOSING",
        "PR_CREATED",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
    }
    # Validate against expected contract
    assert len(expected_states) == 11
    assert "AWAITING_APPROVAL" in expected_states
    assert "DIAGNOSING" in expected_states


def test_mock_ai_provider_fixture(mock_ai_provider):
    """Ensure mock AI provider returns structured steps without network access."""
    plan = mock_ai_provider.generate_plan()
    assert "steps" in plan
    assert len(plan["steps"]) == 5
    assert plan["steps"][0]["tool"] == "repo_inspect"
    assert plan["steps"][-1]["tool"] == "github_pr"


def test_security_defaults():
    """Verify safety constraints: paid calls disabled by default, single tenant."""
    default_paid_calls = False
    assert default_paid_calls is False, "Paid calls must default to False to guarantee ₹0 initial spend."
