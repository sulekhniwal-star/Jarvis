"""
Project Jarvis — Task Management Service.
Handles task lifecycle, idempotency, server-side validated state machine transitions,
cancellation, and automated planning breakdown.
"""

from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.base import get_utc_now
from app.models.task import Task, TaskStep
from app.providers.factory import get_ai_provider
from app.schemas.task import TaskCreate, TaskPriority, TaskStatus, TaskUpdate
from app.services.audit_service import log_audit_event

# Valid state machine transitions
ALLOWED_TRANSITIONS = {
    TaskStatus.PENDING: {TaskStatus.PLANNING, TaskStatus.CANCELLED},
    TaskStatus.PLANNING: {TaskStatus.AWAITING_APPROVAL, TaskStatus.EXECUTING, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.AWAITING_APPROVAL: {TaskStatus.APPROVED, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.APPROVED: {TaskStatus.EXECUTING, TaskStatus.CANCELLED},
    TaskStatus.EXECUTING: {TaskStatus.TESTING, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.TESTING: {TaskStatus.DIAGNOSING, TaskStatus.PR_CREATED, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.DIAGNOSING: {TaskStatus.EXECUTING, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.PR_CREATED: {TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED},
    TaskStatus.COMPLETED: set(),  # Terminal
    TaskStatus.FAILED: set(),     # Terminal
    TaskStatus.CANCELLED: set(),  # Terminal
}


async def create_task(
    session: AsyncSession,
    task_in: TaskCreate,
    user_id: str
) -> Task:
    """Creates a new task. Checks idempotency key to prevent duplicate intake."""
    if task_in.idempotency_key:
        stmt = (
            select(Task)
            .options(selectinload(Task.steps))
            .where(Task.idempotency_key == task_in.idempotency_key)
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            return existing

    task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority.value,
        project_id=task_in.project_id,
        idempotency_key=task_in.idempotency_key,
        created_by=user_id,
        status=TaskStatus.PENDING.value
    )
    session.add(task)
    await session.flush()

    await log_audit_event(
        session=session,
        actor_type="user",
        actor_id=user_id,
        action="TASK_CREATED",
        target_type="task",
        target_id=task.id,
        metadata={"title": task.title, "priority": task.priority}
    )

    # Automatically generate initial structured plan via AI provider
    provider = get_ai_provider()
    plan_data = await provider.generate_plan(task.title, task.description)
    
    for step_data in plan_data.get("steps", []):
        step = TaskStep(
            task_id=task.id,
            sequence=step_data.get("sequence", 1),
            name=step_data.get("name", "Step"),
            description=step_data.get("description"),
            tool_name=step_data.get("tool_name"),
            status="PENDING"
        )
        session.add(step)

    await session.flush()
    # Eager load steps
    return await get_task_by_id(session, task.id)


async def get_task_by_id(session: AsyncSession, task_id: str) -> Optional[Task]:
    """Retrieves a task with its associated task steps."""
    stmt = (
        select(Task)
        .options(selectinload(Task.steps))
        .where(Task.id == task_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_tasks(
    session: AsyncSession,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Task], int]:
    """Lists tasks with pagination and status filtering."""
    query = select(Task).options(selectinload(Task.steps))
    if status_filter:
        query = query.where(Task.status == status_filter)

    # Count
    count_query = select(func.count(Task.id))
    if status_filter:
        count_query = count_query.where(Task.status == status_filter)
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    query = query.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(query)
    tasks = list(result.scalars().all())

    return tasks, total


async def transition_task_status(
    session: AsyncSession,
    task_id: str,
    new_status: TaskStatus,
    actor_id: str,
    error_message: Optional[str] = None
) -> Task:
    """Transitions a task status according to strict state machine rules."""
    task = await get_task_by_id(session, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    current_enum = TaskStatus(task.status)
    if new_status not in ALLOWED_TRANSITIONS[current_enum]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition: Cannot transition from {task.status} to {new_status.value}."
        )

    task.status = new_status.value
    now = get_utc_now()
    if new_status in {TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED}:
        task.completed_at = now
    if new_status in {TaskStatus.PLANNING, TaskStatus.EXECUTING} and not task.started_at:
        task.started_at = now
    if error_message:
        task.error_message = error_message

    await session.flush()
    await log_audit_event(
        session=session,
        actor_type="system",
        actor_id=actor_id,
        action="TASK_STATUS_TRANSITION",
        target_type="task",
        target_id=task.id,
        metadata={"from_status": current_enum.value, "to_status": new_status.value}
    )
    return task


async def cancel_task(session: AsyncSession, task_id: str, user_id: str) -> Task:
    """Cancels a task if it is in an active non-terminal state."""
    return await transition_task_status(
        session=session,
        task_id=task_id,
        new_status=TaskStatus.CANCELLED,
        actor_id=user_id
    )
