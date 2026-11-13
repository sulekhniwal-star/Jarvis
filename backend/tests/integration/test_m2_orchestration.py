"""
Project Jarvis — Milestone 2 Orchestration & Acceptance Test Suite.
Verifies LangGraph StateGraph execution, Human-in-the-Loop interrupts,
pause/resume mechanics, diagnostic retry loops, and checkpoint recovery across restarts.
"""

import pytest
from langgraph.checkpoint.memory import MemorySaver
from app.orchestrator.state import TaskGraphState
from app.orchestrator.workflow import build_task_workflow


@pytest.mark.asyncio
async def test_end_to_end_unrestricted_workflow():
    """Verify a standard coding task completes end-to-end without interruptions."""
    checkpointer = MemorySaver()
    app = build_task_workflow(checkpointer=checkpointer)

    initial_state: TaskGraphState = {
        "task_id": "task-unrestricted-001",
        "title": "Optimize cache retrieval logic",
        "description": "Refactor dictionary lookup to use LRU cache.",
        "project_id": "demo-proj",
        "status": "PENDING",
        "plan_steps": [],
        "current_step_index": 0,
        "requires_approval": False,
        "approval_id": None,
        "approval_status": None,
        "approval_action": None,
        "execution_logs": [],
        "patch_diff": None,
        "test_passed": False,
        "test_output": None,
        "error_message": None,
        "retry_count": 0,
        "max_retries": 3,
        "pr_url": None,
    }

    config = {"configurable": {"thread_id": "thread-unrestricted-001"}}
    final_state = await app.ainvoke(initial_state, config=config)

    assert final_state["status"] == "COMPLETED"
    assert final_state["requires_approval"] is False
    assert final_state["patch_diff"] is not None
    assert final_state["test_passed"] is True
    assert final_state["pr_url"] is not None
    assert any("[PRGenerator]" in log for log in final_state["execution_logs"])


@pytest.mark.asyncio
async def test_human_in_the_loop_approval_pause_and_resume():
    """
    CRITICAL ACCEPTANCE TEST:
    Verify a sensitive task pauses at approval gate, saves state to checkpointer,
    and resumes seamlessly upon human authorization.
    """
    checkpointer = MemorySaver()
    app = build_task_workflow(checkpointer=checkpointer)

    initial_state: TaskGraphState = {
        "task_id": "task-sensitive-002",
        "title": "Drop table and clean production database",
        "description": "Run schema cleanup on production data.",
        "project_id": "demo-proj",
        "status": "PENDING",
        "plan_steps": [],
        "current_step_index": 0,
        "requires_approval": False,
        "approval_id": None,
        "approval_status": None,
        "approval_action": None,
        "execution_logs": [],
        "patch_diff": None,
        "test_passed": False,
        "test_output": None,
        "error_message": None,
        "retry_count": 0,
        "max_retries": 3,
        "pr_url": None,
    }

    config = {"configurable": {"thread_id": "thread-sensitive-002"}}

    # 1. Execute initial run: Graph MUST interrupt before approval_gate
    paused_state = await app.ainvoke(initial_state, config=config)

    # Verify graph stopped at the interrupt
    snapshot = app.get_state(config)
    assert "approval_gate" in snapshot.next
    assert paused_state["requires_approval"] is True
    assert any("[Planner] High-consequence keywords detected." in log for log in paused_state["execution_logs"])

    # 2. Simulate Human Owner approving via Dashboard: Update state with APPROVED
    app.update_state(
        config=config,
        values={
            "approval_status": "APPROVED",
            "status": "APPROVED"
        },
        as_node="approval_gate"
    )

    # 3. Resume execution from checkpoint with None input
    resumed_state = await app.ainvoke(None, config=config)

    # 4. Verify workflow completed successfully after human authorization
    assert resumed_state["status"] == "COMPLETED"
    assert resumed_state["patch_diff"] is not None
    assert resumed_state["test_passed"] is True
    assert resumed_state["pr_url"] is not None


@pytest.mark.asyncio
async def test_human_rejection_halts_task():
    """Verify owner rejection at approval gate terminates task with FAILED status."""
    checkpointer = MemorySaver()
    app = build_task_workflow(checkpointer=checkpointer)

    initial_state: TaskGraphState = {
        "task_id": "task-reject-003",
        "title": "Deploy dangerous production patch",
        "description": "Force push to production without tests.",
        "project_id": "demo-proj",
        "status": "PENDING",
        "plan_steps": [],
        "current_step_index": 0,
        "requires_approval": False,
        "approval_id": None,
        "approval_status": None,
        "approval_action": None,
        "execution_logs": [],
        "patch_diff": None,
        "test_passed": False,
        "test_output": None,
        "error_message": None,
        "retry_count": 0,
        "max_retries": 3,
        "pr_url": None,
    }

    config = {"configurable": {"thread_id": "thread-reject-003"}}

    # Run until interrupt
    await app.ainvoke(initial_state, config=config)

    # Owner rejects the approval request
    app.update_state(
        config=config,
        values={
            "approval_status": "REJECTED",
            "status": "FAILED",
            "error_message": "Rejected by owner: Unsafe operation."
        },
        as_node="approval_gate"
    )

    # Resume graph
    final_state = await app.ainvoke(None, config=config)
    assert final_state["status"] == "FAILED"
    assert "Rejected by owner" in final_state["error_message"]
    assert final_state["pr_url"] is None


@pytest.mark.asyncio
async def test_diagnostic_retry_loop():
    """Verify that test failures trigger the diagnoser and retry loop within budget."""
    checkpointer = MemorySaver()
    app = build_task_workflow(checkpointer=checkpointer)

    initial_state: TaskGraphState = {
        "task_id": "task-retry-004",
        "title": "Fix flaky buffer pool test",
        "description": "Demonstrate fail_first behavior to test diagnosis loop.",
        "project_id": "demo-proj",
        "status": "PENDING",
        "plan_steps": [],
        "current_step_index": 0,
        "requires_approval": False,
        "approval_id": None,
        "approval_status": None,
        "approval_action": None,
        "execution_logs": [],
        "patch_diff": None,
        "test_passed": False,
        "test_output": None,
        "error_message": None,
        "retry_count": 0,
        "max_retries": 3,
        "pr_url": None,
    }

    config = {"configurable": {"thread_id": "thread-retry-004"}}
    final_state = await app.ainvoke(initial_state, config=config)

    # The task should have failed once, diagnosed, retried, and completed!
    assert final_state["status"] == "COMPLETED"
    assert final_state["retry_count"] == 1
    assert any("[Diagnoser] Test failure detected. Attempting retry 1/3" in log for log in final_state["execution_logs"])
    assert final_state["test_passed"] is True


@pytest.mark.asyncio
async def test_checkpoint_recovery_after_simulated_restart():
    """
    CRITICAL RESILIENCE TEST:
    Verify that an interrupted task state can be re-hydrated by a brand new graph instance
    using only the thread ID from the checkpointer.
    """
    shared_checkpointer = MemorySaver()
    app_instance_1 = build_task_workflow(checkpointer=shared_checkpointer)

    initial_state: TaskGraphState = {
        "task_id": "task-restart-005",
        "title": "Production deployment requiring review",
        "description": "Trigger production review checkpoint.",
        "project_id": "demo-proj",
        "status": "PENDING",
        "plan_steps": [],
        "current_step_index": 0,
        "requires_approval": False,
        "approval_id": None,
        "approval_status": None,
        "approval_action": None,
        "execution_logs": [],
        "patch_diff": None,
        "test_passed": False,
        "test_output": None,
        "error_message": None,
        "retry_count": 0,
        "max_retries": 3,
        "pr_url": None,
    }

    config = {"configurable": {"thread_id": "thread-restart-005"}}

    # Graph 1 runs and halts at interrupt
    await app_instance_1.ainvoke(initial_state, config=config)
    snapshot = app_instance_1.get_state(config)
    assert "approval_gate" in snapshot.next

    # --- SIMULATE COORDINATOR CRASH & RESTART ---
    # Instantiate a completely new graph object representing a new backend process
    del app_instance_1
    app_instance_2 = build_task_workflow(checkpointer=shared_checkpointer)

    # Inspect state in new instance
    recovered_snapshot = app_instance_2.get_state(config)
    assert "approval_gate" in recovered_snapshot.next
    assert recovered_snapshot.values["task_id"] == "task-restart-005"
    assert recovered_snapshot.values["requires_approval"] is True

    # Authorize in recovered graph
    app_instance_2.update_state(
        config=config,
        values={"approval_status": "APPROVED", "status": "APPROVED"},
        as_node="approval_gate"
    )

    # Complete execution in new instance
    final_state = await app_instance_2.ainvoke(None, config=config)
    assert final_state["status"] == "COMPLETED"
    assert final_state["pr_url"] is not None

