"""
Project Jarvis — Audit Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    actor_type: str
    actor_id: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

