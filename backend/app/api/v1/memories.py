"""
Project Jarvis — Memory API Endpoints.
Allows the authenticated owner to inspect, create, query, and archive memories.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.user import User
from app.schemas.memory import MemoryCreateRequest, MemoryResponse
from app.services.auth_service import get_current_user
from app.services.memory_service import MemoryService, SecurityViolationError

router = APIRouter(prefix="/memories", tags=["Memory"])


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def store_memory_endpoint(
    req: MemoryCreateRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Stores a new memory record, superseding previous active versions for the same key."""
    try:
        memory = await MemoryService.store_memory(
            session=session,
            scope_type=req.scope_type,
            category=req.category,
            key=req.key,
            content=req.content,
            scope_id=req.scope_id,
            source=req.source,
            confidence=req.confidence,
            actor_id=current_user.id,
        )
        return memory
    except SecurityViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[MemoryResponse])
async def list_active_memories(
    scope_type: str | None = Query(None, description="'shared' or 'project'"),
    scope_id: str | None = Query(None, description="Project ID"),
    category: str | None = Query(None),
    key: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Lists active memories with optional filters."""
    memories = await MemoryService.get_active_memories(
        session=session, scope_type=scope_type, scope_id=scope_id, category=category, key=key
    )
    return memories


@router.post("/{memory_id}/archive", response_model=MemoryResponse)
async def archive_memory_endpoint(
    memory_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Archives a memory record so it is not used in active planning contexts."""
    archived = await MemoryService.archive_memory(
        session=session, memory_id=memory_id, actor_id=current_user.id
    )
    if not archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory record not found."
        )
    return archived


@router.get("/project/{project_id}/context")
async def get_project_context_endpoint(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Returns combined active context (preferences, conventions, decisions) for prompt injection into coding agents."""
    return await MemoryService.get_context_for_project(session=session, project_id=project_id)
