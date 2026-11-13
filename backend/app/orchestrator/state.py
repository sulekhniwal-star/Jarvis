"""
Project Jarvis — Orchestrator State Definition.
Typed dictionary representing the shared state across all LangGraph nodes.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class TaskGraphState(TypedDict):
    task_id: str
    title: str
    description: str
    project_id: Optional[str]
    status: str  # PENDING, PLANNING, AWAITING_APPROVAL, APPROVED, EXECUTING, TESTING, DIAGNOSING, PR_CREATED, COMPLETED, FAILED, CANCELLED
    plan_steps: List[Dict[str, Any]]
    current_step_index: int
    requires_approval: bool
    approval_id: Optional[str]
    approval_status: Optional[str]  # PENDING, APPROVED, REJECTED
    approval_action: Optional[str]
    execution_logs: List[str]
    patch_diff: Optional[str]
    test_passed: bool
    test_output: Optional[str]
    error_message: Optional[str]
    retry_count: int
    max_retries: int
    pr_url: Optional[str]

