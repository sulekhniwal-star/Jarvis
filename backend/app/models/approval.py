"""
Project Jarvis — Approval ORM Model.
Tracks sensitive actions requiring explicit human authorization with cryptographic hash binding.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class Approval(Base, TimestampMixin):
    __tablename__ = "approvals"

    task_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tasks.id"), index=True, nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    canonical_payload: Mapped[str] = mapped_column(Text, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    status: Mapped[str] = mapped_column(String(50), default="AWAITING_APPROVAL", index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
