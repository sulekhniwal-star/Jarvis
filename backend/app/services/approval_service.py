"""
Project Jarvis — Approval Engine Service.
Enforces human authorization for high-consequence operations.
Binds approvals to canonical SHA-256 payload hashes to prevent parameter tampering.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.models.base import get_utc_now
from app.services.audit_service import log_audit_event


def compute_payload_hash(payload: Dict[str, Any]) -> str:
    """Computes SHA-256 hash of canonical sorted JSON representation."""
    canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


async def create_approval_request(
    session: AsyncSession,
    action_type: str,
    payload: Dict[str, Any],
    task_id: Optional[str] = None,
    expires_in_minutes: int = 30
) -> Approval:
    """Creates a pending approval request bound to the payload hash."""
    canonical_str = json.dumps(payload, sort_keys=True)
    payload_hash = compute_payload_hash(payload)
    expires_at = get_utc_now() + timedelta(minutes=expires_in_minutes)

    approval = Approval(
        task_id=task_id,
        action_type=action_type,
        canonical_payload=canonical_str,
        payload_hash=payload_hash,
        status="AWAITING_APPROVAL",
        expires_at=expires_at
    )
    session.add(approval)
    await session.flush()

    await log_audit_event(
        session=session,
        actor_type="agent",
        actor_id="orchestrator",
        action="APPROVAL_REQUESTED",
        target_type="approval",
        target_id=approval.id,
        metadata={"action_type": action_type, "payload_hash": payload_hash}
    )
    return approval


async def evaluate_approval(
    session: AsyncSession,
    approval_id: str,
    decision: str,  # "APPROVED" or "REJECTED"
    decided_by_user_id: str,
    reason: Optional[str] = None
) -> Approval:
    """Evaluates an approval request. Revalidates status and expiry."""
    stmt = select(Approval).where(Approval.id == approval_id)
    result = await session.execute(stmt)
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval request not found."
        )

    if approval.status != "AWAITING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval request already resolved: {approval.status}"
        )

    now = get_utc_now()
    if now > approval.expires_at:
        approval.status = "EXPIRED"
        await session.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval request has expired."
        )

    approval.status = decision
    approval.decided_at = now
    approval.decision_reason = reason
    await session.flush()

    await log_audit_event(
        session=session,
        actor_type="user",
        actor_id=decided_by_user_id,
        action=f"APPROVAL_{decision}",
        target_type="approval",
        target_id=approval.id,
        metadata={"reason": reason, "payload_hash": approval.payload_hash}
    )
    return approval

