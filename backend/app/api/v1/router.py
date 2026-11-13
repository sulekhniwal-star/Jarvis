"""
Project Jarvis — API v1 Master Router.
"""

from fastapi import APIRouter
from app.api.v1.approvals import router as approvals_router
from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.memories import router as memories_router
from app.api.v1.projects import router as projects_router
from app.api.v1.system import router as system_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.webhooks import router as webhooks_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tasks_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(webhooks_router)
api_v1_router.include_router(memories_router)
