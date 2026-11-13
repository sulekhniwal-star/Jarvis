"""
Project Jarvis — Orchestrator State Definition.
Typed dictionary representing the shared state across all LangGraph nodes.
"""

from typing import Any

from typing_extensions import TypedDict


class TaskGraphState(TypedDict):
    task_id: str
    title: str
    description: str
    project_id: str | None
    status: str  # PENDING, PLANNING, AWAITING_APPROVAL, APPROVED, EXECUTING, TESTING, DIAGNOSING, PR_CREATED, COMPLETED, FAILED, CANCELLED
    plan_steps: list[dict[str, Any]]
    current_step_index: int
    requires_approval: bool
    approval_id: str | None
    approval_status: str | None  # PENDING, APPROVED, REJECTED
    approval_action: str | None
    execution_logs: list[str]
    patch_diff: str | None
    test_passed: bool
    test_output: str | None
    error_message: str | None
    retry_count: int
    max_retries: int
    pr_url: str | None
