"""
Project Jarvis — Task and Execution ORM Models.
Tracks lifecycle state transitions, broken-down steps, and execution runs.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )

    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=True
    )
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    steps: Mapped[list["TaskStep"]] = relationship(
        "TaskStep", back_populates="task", cascade="all, delete-orphan"
    )
    executions: Mapped[list["Execution"]] = relationship(
        "Execution", back_populates="task", cascade="all, delete-orphan"
    )


class TaskStep(Base, TimestampMixin):
    __tablename__ = "task_steps"

    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id"), index=True, nullable=False
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tool_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="steps")


class Execution(Base, TimestampMixin):
    __tablename__ = "executions"

    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id"), index=True, nullable=False
    )
    worker_type: Mapped[str] = mapped_column(String(50), default="github_actions", nullable=False)
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="RUNNING", nullable=False)
    logs: Mapped[str | None] = mapped_column(Text, nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="executions")
