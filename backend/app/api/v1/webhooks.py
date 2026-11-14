"""
Project Jarvis — GitHub Webhook Handler.
Verifies HMAC-SHA256 signature and processes repository and pull request events.
"""

import hashlib
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def verify_github_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    """
    Validates the GitHub HMAC-SHA256 signature using constant-time comparison.
    Format: 'sha256=<hex_digest>'
    """
    if not signature_header or not secret:
        return False

    prefix, _, hex_digest = signature_header.partition("=")
    if prefix != "sha256" or not hex_digest:
        return False

    mac = hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256)
    expected_digest = mac.hexdigest()

    return hmac.compare_digest(expected_digest, hex_digest)


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
    x_github_delivery: str = Header(None, alias="X-GitHub-Delivery"),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Ingests GitHub webhook events with mandatory cryptographic signature validation.
    """
    raw_body = await request.body()

    # Secret verification
    webhook_secret = settings.GITHUB_WEBHOOK_SECRET
    if not webhook_secret:
        if settings.ENVIRONMENT in ("development", "testing"):
            webhook_secret = "development_test_webhook_secret_key"
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GITHUB_WEBHOOK_SECRET is not configured on this server.",
            )

    if not verify_github_signature(raw_body, x_hub_signature_256, webhook_secret):
        await log_audit_event(
            session=session,
            actor_type="anonymous",
            actor_id="github_webhook",
            action="WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
            target_type="webhook",
            metadata={"delivery_id": x_github_delivery},
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid GitHub webhook signature."
        )

    payload = await request.json()
    action = payload.get("action", "unknown")
    repository = payload.get("repository", {}).get("full_name", "unknown")

    task_id: str | None = None

    # Autonomous Issue-to-PR Daemon: Detect issue creation or mentions
    if x_github_event == "issues" and action in ("opened", "labeled"):
        issue = payload.get("issue", {})
        issue_num = issue.get("number")
        issue_title = issue.get("title", "")
        issue_body = issue.get("body") or "No description provided."

        labels = [lbl.get("name", "").lower() for lbl in issue.get("labels", [])]
        is_targeted = "jarvis" in labels or "@jarvis" in f"{issue_title} {issue_body}".lower() or action == "opened"

        if is_targeted and issue_title:
            from app.schemas.task import TaskCreate, TaskPriority
            from app.services.task_service import create_task

            task_in = TaskCreate(
                title=f"[ISSUE #{issue_num}] {repository}: {issue_title[:60]}",
                description=(
                    f"GitHub Issue #{issue_num} reported on {repository}:\n\n"
                    f"Issue Title: {issue_title}\n"
                    f"Issue Body:\n{issue_body}\n\n"
                    f"Directive: Reproduce the problem, generate code patch, execute tests, "
                    f"and prepare Pull Request referencing 'Fixes #{issue_num}'."
                ),
                priority=TaskPriority.HIGH,
                idempotency_key=f"gh-issue-{repository}-{issue_num}",
            )
            created_task = await create_task(session, task_in, user_id="github_automation")
            task_id = created_task.id

    elif x_github_event == "issue_comment" and action == "created":
        comment = payload.get("comment", {})
        comment_body = comment.get("body", "")
        if "@jarvis" in comment_body.lower():
            issue = payload.get("issue", {})
            issue_num = issue.get("number")
            issue_title = issue.get("title", "")

            from app.schemas.task import TaskCreate, TaskPriority
            from app.services.task_service import create_task

            task_in = TaskCreate(
                title=f"[COMMENT FIX #{issue_num}] {repository}: {issue_title[:50]}",
                description=(
                    f"GitHub Mention on Issue #{issue_num} ({repository}):\n\n"
                    f"User Comment:\n{comment_body}\n\n"
                    f"Context:\n{issue_title}\n\n"
                    f"Directive: Implement requested resolution and open Pull Request referencing #{issue_num}."
                ),
                priority=TaskPriority.HIGH,
                idempotency_key=f"gh-comment-{comment.get('id')}",
            )
            created_task = await create_task(session, task_in, user_id="github_automation")
            task_id = created_task.id

    await log_audit_event(
        session=session,
        actor_type="github",
        actor_id=repository,
        action=f"GITHUB_EVENT_{x_github_event.upper()}",
        target_type="repository",
        target_id=repository,
        metadata={"action": action, "event": x_github_event, "delivery_id": x_github_delivery, "task_id": task_id},
    )
    await session.commit()

    response_data: dict[str, str | bool | None] = {
        "status": "processed",
        "event": x_github_event,
        "action": action,
        "delivery_id": x_github_delivery,
    }
    if task_id:
        response_data["task_id"] = task_id
        response_data["auto_task_dispatched"] = True

    return response_data
