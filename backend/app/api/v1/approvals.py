"""
Project Jarvis — Approval Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.approval import Approval
from app.models.user import User
from app.schemas.approval import ApprovalDecision, ApprovalResponse
from app.services.approval_service import evaluate_approval
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("", response_model=List[ApprovalResponse])
async def list_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Lists approval requests."""
    query = select(Approval).order_by(Approval.created_at.desc())
    if status_filter:
        query = query.where(Approval.status == status_filter)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.post("/{approval_id}/decide", response_model=ApprovalResponse)
async def decide_approval(
    approval_id: str,
    decision_in: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Authorizes or rejects a pending consequential operation."""
    return await evaluate_approval(
        session=session,
        approval_id=approval_id,
        decision=decision_in.decision,
        decided_by_user_id=current_user.id,
        reason=decision_in.reason
    )
