"""
Project Jarvis — GitHub Fleet & Project Audit API Endpoints.
Allows Jarvis to inspect, research, audit, and auto-improve user repositories.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.user import User
from app.schemas.task import TaskCreate, TaskPriority
from app.services.auth_service import get_current_user
from app.services.project_auditor import ProjectAuditorService
from app.services.self_improvement import SelfImprovementService
from app.services.task_service import create_task

router = APIRouter(prefix="/projects", tags=["Project Auditor"])


@router.get("/repos")
async def list_user_repos():
    """
    Discovers all user repositories from GitHub, categorized by priority.
    """
    auditor = ProjectAuditorService()
    return await auditor.list_fleet_repositories()


@router.get("/audit/{repo_name}")
async def audit_repository(repo_name: str):
    """
    Runs a deep architectural research and AI gap analysis on a target repository.
    """
    auditor = ProjectAuditorService()
    try:
        return await auditor.audit_repository_deep(repo_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to audit repository '{repo_name}': {str(e)}"
        )


@router.post("/improve/{repo_name}")
async def auto_improve_project(
    repo_name: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """
    Dispatches a high-priority autonomous coding task in Jarvis to
    complete unfinished features and improve the target repository.
    """
    auditor = ProjectAuditorService()
    report = await auditor.audit_repository_deep(repo_name)
    analysis = report.get("analysis", {})
    summary = analysis.get("summary", "Complete missing components and improve repo health.")

    task_in = TaskCreate(
        title=f"[AUTO-IMPROVE] {repo_name}: Complete Core Features",
        description=(
            f"Autonomous improvement protocol for repository {repo_name}.\n\n"
            f"Audit Summary:\n{summary}\n\n"
            f"Missing Components:\n{analysis.get('missing_components', [])}\n\n"
            f"Implementation Directive: Review code, write missing tests, and prepare pull request."
        ),
        priority=TaskPriority.HIGH if "jarvis" not in repo_name.lower() else TaskPriority.CRITICAL
    )

    task = await create_task(session, task_in, user_id=current_user.id)
    await session.commit()
    return {
        "status": "DISPATCHED",
        "task_id": task.id,
        "repo_name": repo_name,
        "priority": task.priority,
        "planned_steps": len(task.steps)
    }


@router.post("/self-improve")
async def self_improve_jarvis(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    """
    Highest priority directive: Triggers self-audit and improvement on Project Jarvis itself.
    """
    from pathlib import Path
    repo_path = Path(__file__).resolve().parent.parent.parent.parent

    # 1. Run local health self-analysis
    health_report = SelfImprovementService.analyze_codebase_health(repo_path)

    # 2. Dispatch self-evolution task
    task_in = TaskCreate(
        title="[SELF-IMPROVEMENT] Jarvis Core Evolution & Health Hardening",
        description=(
            f"Self-improvement protocol executed on Project Jarvis.\n\n"
            f"Current Health Score: {health_report.get('health_score')}/100\n"
            f"Components Analyzed: {len(health_report.get('components', []))}\n"
            f"Action: Implement architectural hardening, security audit checks, and optimize response pipelines."
        ),
        priority=TaskPriority.CRITICAL
    )

    task = await create_task(session, task_in, user_id=current_user.id)
    await session.commit()

    return {
        "status": "SELF_IMPROVEMENT_DISPATCHED",
        "task_id": task.id,
        "health_score": health_report.get("health_score"),
        "priority": "CRITICAL"
    }
