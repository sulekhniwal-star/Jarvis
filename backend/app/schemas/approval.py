"""
Project Jarvis — Approval Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ApprovalDecision(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    reason: Optional[str] = Field(None, max_length=500)


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: Optional[str] = None
    action_type: str
    canonical_payload: str
    payload_hash: str
    status: str
    expires_at: datetime
    decided_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
    created_at: datetime
