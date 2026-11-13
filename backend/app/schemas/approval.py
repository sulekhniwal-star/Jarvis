"""
Project Jarvis — Approval Schemas.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApprovalDecision(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    reason: str | None = Field(None, max_length=500)


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str | None = None
    action_type: str
    canonical_payload: str
    payload_hash: str
    status: str
    expires_at: datetime
    decided_at: datetime | None = None
    decision_reason: str | None = None
    created_at: datetime
