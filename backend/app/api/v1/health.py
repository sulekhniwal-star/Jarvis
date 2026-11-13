"""
Project Jarvis — Health and Readiness Probes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def liveness():
    """Liveness probe to confirm FastAPI service is responding."""
    return {"status": "ok", "service": "jarvis-backend"}


@router.get("/health/ready")
async def readiness(session: AsyncSession = Depends(get_db_session)):
    """Readiness probe to confirm database connectivity."""
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unreachable: {str(e)}"
        )
