"""
Project Jarvis — GitHub Webhook Handler.
Verifies HMAC-SHA256 signature and processes repository and pull request events.
"""

import hashlib
import hmac
from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def verify_github_signature(
    raw_body: bytes,
    signature_header: str,
    secret: str
) -> bool:
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
    session: AsyncSession = Depends(get_db_session)
):
    """
    Ingests GitHub webhook events with mandatory cryptographic signature validation.
    """
    raw_body = await request.body()

    # Secret verification
    webhook_secret = settings.__dict__.get("GITHUB_WEBHOOK_SECRET") or "development_test_webhook_secret_key"
    if not verify_github_signature(raw_body, x_hub_signature_256, webhook_secret):
        await log_audit_event(
            session=session,
            actor_type="anonymous",
            actor_id="github_webhook",
            action="WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
            target_type="webhook",
            metadata={"delivery_id": x_github_delivery}
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitHub webhook signature."
        )

    payload = await request.json()
    action = payload.get("action", "unknown")
    repository = payload.get("repository", {}).get("full_name", "unknown")

    await log_audit_event(
        session=session,
        actor_type="github",
        actor_id=repository,
        action=f"GITHUB_EVENT_{x_github_event.upper()}",
        target_type="repository",
        target_id=repository,
        metadata={
            "action": action,
            "event": x_github_event,
            "delivery_id": x_github_delivery
        }
    )
    await session.commit()

    return {
        "status": "processed",
        "event": x_github_event,
        "action": action,
        "delivery_id": x_github_delivery
    }

