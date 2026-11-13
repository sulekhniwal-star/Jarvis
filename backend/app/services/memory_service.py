"""
Project Jarvis — Memory Service.
Manages shared preferences, project conventions, architectural decisions, and lessons learned.
Strictly scans for and rejects any attempt to persist credentials or secrets.
Maintains historical decision lineage via supersession links.
"""

import re
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.services.audit_service import log_audit_event

# Patterns matching sensitive secrets, API keys, tokens, or private keys
_SECRET_PATTERNS = [
    re.compile(r"gh[pous]_[A-Za-z0-9_]{36,255}"),                 # GitHub tokens
    re.compile(r"eyJ[A-Za-z0-9-_]{10,}\.eyJ[A-Za-z0-9-_]{2,}\.[A-Za-z0-9-_]+"),  # JWT
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),            # Private keys
    re.compile(r"AKIA[0-9A-Z]{16}"),                              # AWS Access Key
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),                         # Google API key
    re.compile(r"sk-[a-zA-Z0-9_-]{20,}"),                         # OpenAI / Anthropic / generic secret key
    re.compile(r"\b[0-9]{8,10}:[a-zA-Z0-9_-]{35}\b"),             # Telegram Bot token
    re.compile(r"(?i)(password|secret|api[_-]?key)\s*[:=]\s*['\"][^\s'\"]{6,}['\"]"),  # Inline credentials
]


def contains_secret(text: str) -> bool:
    """Returns True if the provided text contains any recognizable secret pattern."""
    if not text:
        return False
    return any(pattern.search(text) for pattern in _SECRET_PATTERNS)


class SecurityViolationError(Exception):
    """Raised when an operation violates security policy (e.g. attempting to store secrets)."""
    pass


class MemoryService:
    """
    Service for managing Jarvis long-term knowledge and preferences.
    """

    @staticmethod
    async def store_memory(
        session: AsyncSession,
        scope_type: str,
        category: str,
        key: str,
        content: str,
        scope_id: Optional[str] = None,
        source: str = "owner_instruction",
        confidence: float = 1.0,
        actor_id: str = "owner"
    ) -> Memory:
        """
        Stores a memory record.
        If an active memory with the same (scope_type, scope_id, category, key) exists,
        it is superseded to maintain historical decision lineage without overwriting.
        Raises SecurityViolationError if the content contains secrets or tokens.
        """
        # 1. Strict security check: reject credentials in long-term memory
        if contains_secret(content) or contains_secret(key):
            await log_audit_event(
                session=session,
                actor_type="user",
                actor_id=actor_id,
                action="MEMORY_SECRET_STORAGE_BLOCKED",
                target_type="memory",
                target_id=f"{scope_type}:{key}",
                metadata={"reason": "Contains credential or secret pattern"}
            )
            await session.commit()
            raise SecurityViolationError(
                "Security policy violation: Cannot store secrets, tokens, or credentials in memory records."
            )

        # 2. Look for existing active record for the same key & scope
        stmt = (
            select(Memory)
            .where(
                Memory.scope_type == scope_type,
                Memory.scope_id == scope_id,
                Memory.category == category,
                Memory.key == key,
                Memory.status == "active"
            )
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()

        # 3. Create new active memory
        new_memory = Memory(
            scope_type=scope_type,
            scope_id=scope_id,
            category=category,
            key=key,
            content=content,
            source=source,
            confidence=confidence,
            status="active"
        )
        session.add(new_memory)
        await session.flush()  # Generate new_memory.id

        # 4. If an existing record was found, supersede it
        if existing:
            existing.status = "superseded"
            existing.superseded_by = new_memory.id

        await log_audit_event(
            session=session,
            actor_type="user",
            actor_id=actor_id,
            action="STORE_MEMORY",
            target_type="memory",
            target_id=new_memory.id,
            metadata={
                "scope_type": scope_type,
                "scope_id": scope_id,
                "category": category,
                "key": key,
                "superseded_previous_id": existing.id if existing else None
            }
        )
        await session.commit()
        await session.refresh(new_memory)
        return new_memory

    @staticmethod
    async def get_active_memories(
        session: AsyncSession,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None,
        category: Optional[str] = None,
        key: Optional[str] = None
    ) -> List[Memory]:
        """
        Queries active memory records matching the filter criteria.
        """
        stmt = select(Memory).where(Memory.status == "active")

        if scope_type:
            stmt = stmt.where(Memory.scope_type == scope_type)
        if scope_id is not None:
            stmt = stmt.where(Memory.scope_id == scope_id)
        if category:
            stmt = stmt.where(Memory.category == category)
        if key:
            stmt = stmt.where(Memory.key == key)

        stmt = stmt.order_by(desc(Memory.created_at))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_context_for_project(
        session: AsyncSession,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Retrieves combined long-term memory context for a project:
        - Project-specific conventions, architecture decisions, and lessons learned.
        - Shared owner preferences (overridden by project-specific conventions if key collides).
        """
        # Fetch shared active preferences
        shared_stmt = select(Memory).where(
            Memory.scope_type == "shared",
            Memory.status == "active"
        )
        shared_res = await session.execute(shared_stmt)
        shared_records = shared_res.scalars().all()

        # Fetch project-specific active memories
        proj_stmt = select(Memory).where(
            Memory.scope_type == "project",
            Memory.scope_id == project_id,
            Memory.status == "active"
        )
        proj_res = await session.execute(proj_stmt)
        proj_records = proj_res.scalars().all()

        context: Dict[str, Any] = {
            "preferences": {},
            "conventions": {},
            "decisions": {},
            "lessons_learned": {},
            "known_issues": {},
        }

        # Populate shared
        for m in shared_records:
            target_dict = context.get(m.category + "s", context["preferences"])
            target_dict[m.key] = m.content

        # Populate/override with project specific
        for m in proj_records:
            target_dict = context.get(m.category + "s", context["conventions"])
            target_dict[m.key] = m.content

        return context

    @staticmethod
    async def archive_memory(
        session: AsyncSession,
        memory_id: str,
        actor_id: str = "owner"
    ) -> Optional[Memory]:
        """Marks a memory record as archived so it is excluded from active prompts."""
        stmt = select(Memory).where(Memory.id == memory_id)
        result = await session.execute(stmt)
        memory = result.scalar_one_or_none()
        if not memory:
            return None

        memory.status = "archived"
        await log_audit_event(
            session=session,
            actor_type="user",
            actor_id=actor_id,
            action="ARCHIVE_MEMORY",
            target_type="memory",
            target_id=memory.id
        )
        await session.commit()
        await session.refresh(memory)
        return memory
