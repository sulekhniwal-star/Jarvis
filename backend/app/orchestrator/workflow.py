"""
Project Jarvis — Orchestration Workflow Graph.
Builds the LangGraph StateGraph, defines conditional routing,
and sets up durable checkpointers with human-in-the-loop interrupt support.
"""

from typing import Literal, Optional
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.orchestrator.nodes import (
    approval_gate_node,
    diagnoser_node,
    executor_node,
    failed_node,
    intake_node,
    planner_node,
    pr_generator_node,
    test_runner_node
)
from app.orchestrator.state import TaskGraphState


# --- Routing Conditions ---
def route_after_planner(state: TaskGraphState) -> Literal["approval_gate", "executor"]:
    """Routes to approval gate if sensitive operations detected, otherwise directly to execution."""
    if state.get("requires_approval"):
        return "approval_gate"
    return "executor"


def route_after_approval_gate(state: TaskGraphState) -> Literal["executor", "failed", "__end__"]:
    """Routes after approval evaluation."""
    status = state.get("status")
    if status == "APPROVED":
        return "executor"
    elif status == "FAILED":
        return "failed"
    # Still awaiting approval -> interrupt / halt graph
    return "__end__"


def route_after_tester(state: TaskGraphState) -> Literal["pr_generator", "diagnoser"]:
    """Routes to PR generation if tests pass, otherwise to error diagnosis."""
    if state.get("test_passed"):
        return "pr_generator"
    return "diagnoser"


def route_after_diagnoser(state: TaskGraphState) -> Literal["executor", "failed"]:
    """Retries execution within budget, otherwise fails."""
    retries = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 3)
    if retries <= max_retries:
        return "executor"
    return "failed"


def build_task_workflow(checkpointer: Optional[BaseCheckpointSaver] = None):
    """Constructs and compiles the complete task lifecycle graph."""
    builder = StateGraph(TaskGraphState)

    # Register nodes
    builder.add_node("intake", intake_node)
    builder.add_node("planner", planner_node)
    builder.add_node("approval_gate", approval_gate_node)
    builder.add_node("executor", executor_node)
    builder.add_node("tester", test_runner_node)
    builder.add_node("diagnoser", diagnoser_node)
    builder.add_node("pr_generator", pr_generator_node)
    builder.add_node("failed", failed_node)

    # Connect edges
    builder.add_edge(START, "intake")
    builder.add_edge("intake", "planner")

    builder.add_conditional_edges(
        "planner",
        route_after_planner,
        {
            "approval_gate": "approval_gate",
            "executor": "executor"
        }
    )

    builder.add_conditional_edges(
        "approval_gate",
        route_after_approval_gate,
        {
            "executor": "executor",
            "failed": "failed",
            "__end__": END
        }
    )

    builder.add_edge("executor", "tester")

    builder.add_conditional_edges(
        "tester",
        route_after_tester,
        {
            "pr_generator": "pr_generator",
            "diagnoser": "diagnoser"
        }
    )

    builder.add_conditional_edges(
        "diagnoser",
        route_after_diagnoser,
        {
            "executor": "executor",
            "failed": "failed"
        }
    )

    builder.add_edge("pr_generator", END)
    builder.add_edge("failed", END)

    # Use provided checkpointer or default to in-memory checkpointer
    saver = checkpointer if checkpointer is not None else MemorySaver()

    # Compile with human-in-the-loop interrupt configuration
    return builder.compile(
        checkpointer=saver,
        interrupt_before=["approval_gate"]
    )

