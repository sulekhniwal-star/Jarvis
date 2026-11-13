"""
Project Jarvis — System Control & Emergency Kill-Switch Endpoints.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit_event
from app.services.task_service import cancel_task, list_tasks

router = APIRouter(prefix="/system", tags=["System"])

# In-memory operational flag (defaults to OPERATIONAL)
_SYSTEM_STATE = {"status": "OPERATIONAL"}


@router.get("/status")
async def get_system_status():
    """Returns current system health and operational mode."""
    return _SYSTEM_STATE


@router.post("/emergency-stop")
async def emergency_stop(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """
    Emergency kill-switch: Immediately halts all active tasks,
    locks the system, and commits security audit event.
    """
    _SYSTEM_STATE["status"] = "LOCKED"

    # Cancel all active tasks
    tasks, _ = await list_tasks(session)
    cancelled = 0
    for t in tasks:
        if t.status in ["PENDING", "PLANNING", "EXECUTING", "TESTING", "AWAITING_APPROVAL"]:
            await cancel_task(session, t.id, user_id=current_user.id)
            cancelled += 1

    await log_audit_event(
        session=session,
        actor_type="user",
        actor_id=current_user.id,
        action="EMERGENCY_KILL_SWITCH_ACTIVATED",
        target_type="system",
        metadata={"tasks_cancelled": cancelled}
    )
    await session.commit()

    return {
        "status": "LOCKED",
        "message": f"Emergency stop executed. Cancelled {cancelled} active tasks.",
        "tasks_cancelled": cancelled
    }


@router.post("/resume")
async def resume_system(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Restores system to OPERATIONAL mode after review."""
    _SYSTEM_STATE["status"] = "OPERATIONAL"
    await log_audit_event(
        session=session,
        actor_type="user",
        actor_id=current_user.id,
        action="SYSTEM_RESUMED",
        target_type="system"
    )
    await session.commit()
    return {"status": "OPERATIONAL", "message": "System restored to normal operations."}

