"""
Project Jarvis — Memory Schemas.
Pydantic models for managing long-term memory records and project context.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MemoryCreateRequest(BaseModel):
    scope_type: str = Field(..., description="'shared' or 'project'")
    scope_id: Optional[str] = Field(None, description="Project ID if scope_type is project")
    category: str = Field(..., description="'preference', 'architecture', 'convention', 'lesson_learned', 'known_issue', 'decision'")
    key: str = Field(..., min_length=2, max_length=128, description="Normalized slug or identifier")
    content: str = Field(..., min_length=1, description="Memory text content or context")
    source: str = Field("owner_instruction", description="Provenance of the fact")
    confidence: float = Field(1.0, ge=0.0, le=1.0)


class MemoryResponse(BaseModel):
    id: str
    scope_type: str
    scope_id: Optional[str]
    category: str
    key: str
    content: str
    source: str
    confidence: float
    status: str
    superseded_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
