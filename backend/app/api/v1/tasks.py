"""
Project Jarvis — Task Management Endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.user import User
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse
from app.services.auth_service import get_current_user
from app.services.task_service import (
    approve_and_execute_task,
    cancel_task,
    create_task,
    get_task_by_id,
    list_tasks
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def api_create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Creates a new autonomous coding task and triggers step planning."""
    return await create_task(session, task_in, current_user.id)


@router.get("", response_model=TaskListResponse)
async def api_list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Lists tasks with optional status filter and pagination."""
    items, total = await list_tasks(session, status_filter, page, page_size)
    return TaskListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def api_get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Retrieves full task details, including breakdown steps and execution status."""
    task = await get_task_by_id(session, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


@router.post("/{task_id}/cancel", response_model=TaskResponse)
@router.post("/{task_id}/reject", response_model=TaskResponse)
async def api_cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Cancels or rejects an active task and terminates worker execution."""
    return await cancel_task(session, task_id, current_user.id)


@router.post("/{task_id}/approve", response_model=TaskResponse)
@router.post("/{task_id}/execute", response_model=TaskResponse)
async def api_approve_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Approves a pending task and triggers execution protocol."""
    return await approve_and_execute_task(session, task_id, current_user.id)


