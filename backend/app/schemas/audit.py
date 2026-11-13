"""
Project Jarvis — Audit Schemas.
"""

from datetime import datetime

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    actor_type: str
    actor_id: str
    action: str
    target_type: str
    target_id: str | None = None
    metadata_json: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
