"""
Project Jarvis — Memory Model.
Stores structured shared preferences, project conventions, architectural decisions, and lessons learned.
"""

import uuid

from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Memory(Base, TimestampMixin):
    """
    Persistent memory record for long-term agent context.
    Separates shared owner preferences from project-specific decisions.
    Strictly forbids storage of secrets or authentication credentials.
    """

    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    scope_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Scope classification: 'shared', 'project', 'research', 'task'",
    )

    scope_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
        comment="Identifier for scoped memory, e.g. project_id, or None for shared",
    )

    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="Category: 'preference', 'architecture', 'convention', 'lesson_learned', 'known_issue', 'decision'",
    )

    key: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
        comment="Normalized key or slug for targeted lookups (e.g. 'code_style', 'auth_scheme')",
    )

    content: Mapped[str] = mapped_column(
        Text, nullable=False, comment="Detailed textual context or structured facts"
    )

    source: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="owner_instruction",
        comment="Provenance of the fact (e.g. 'owner_instruction', 'task_execution', 'repo_analysis')",
    )

    confidence: Mapped[float] = mapped_column(
        Float, default=1.0, nullable=False, comment="Confidence score from 0.0 to 1.0"
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="active",
        nullable=False,
        index=True,
        comment="Status: 'active', 'superseded', 'archived'",
    )

    superseded_by: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("memories.id", ondelete="SET NULL"),
        nullable=True,
        comment="UUID of memory record that superseded this historical decision",
    )

    __table_args__ = (Index("ix_memories_lookup", "scope_type", "scope_id", "category", "status"),)

    def __repr__(self) -> str:
        return f"<Memory id={self.id} scope={self.scope_type}:{self.scope_id} key={self.key} status={self.status}>"
