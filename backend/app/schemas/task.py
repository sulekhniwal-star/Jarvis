"""
Project Jarvis — Task Schemas.
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class TaskStatus(StrEnum):
    PENDING = "PENDING"
    PLANNING = "PLANNING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    TESTING = "TESTING"
    DIAGNOSING = "DIAGNOSING"
    PR_CREATED = "PR_CREATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    priority: TaskPriority = TaskPriority.MEDIUM
    project_id: str | None = None
    idempotency_key: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    description: str | None = Field(None, min_length=5)
    priority: TaskPriority | None = None


class TaskStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sequence: int
    name: str
    description: str | None = None
    tool_name: str | None = None
    status: str
    result_summary: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    project_id: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    steps: list[TaskStepResponse] = []


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
    page: int
    page_size: int
