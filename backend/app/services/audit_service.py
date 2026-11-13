"""
Project Jarvis — Audit Logging Service.
Logs security-sensitive operations, state mutations, and access attempts.
Scans and redacts credentials before committing to the append-only ledger.
"""

import json
import re
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditEvent

# Secret redaction pattern matching JWTs, GitHub tokens, Gemini keys, and passwords
_REDACT_PATTERN = re.compile(
    r"(gh[pousr]_[A-Za-z0-9_]{16,}|ey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{6,}|AIza[0-9A-Za-z-_]{35}|password=['\"][^'\"]+['\"])",
    re.IGNORECASE
)


def redact_sensitive_text(text: str) -> str:
    """Replaces tokens and secrets matching known credential signatures with [REDACTED]."""
    if not text:
        return ""
    return _REDACT_PATTERN.sub("[REDACTED]", text)


async def log_audit_event(
    session: AsyncSession,
    actor_type: str,
    actor_id: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> AuditEvent:
    """Appends an immutable audit event to the database ledger."""
    meta_str = None
    if metadata:
        raw_json = json.dumps(metadata)
        meta_str = redact_sensitive_text(raw_json)

    event = AuditEvent(
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        metadata_json=meta_str
    )
    session.add(event)
    await session.flush()
    return event
