"""
Project Jarvis — Database Engine and Async Session Factory.
Supports PostgreSQL (Supabase/Docker) and SQLite (Local/Test).
Automatically validates and ensures filesystem paths for SQLite with resilient fallback.
"""

import logging
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

logger = logging.getLogger("jarvis.database")


def resolve_database_url(url: str) -> str:
    """
    Ensures SQLite database parent directories exist and are writable.
    Gracefully falls back to /tmp/jarvis_data/ or local directory if directory permissions prevent writing.
    """
    if "sqlite" not in url or ":memory:" in url:
        return url

    # Extract file path after sqlite:/// or sqlite+aiosqlite:///
    raw_path = url.split(":///")[-1]
    if not raw_path:
        return url

    db_path = Path(raw_path).resolve()
    db_dir = db_path.parent

    try:
        db_dir.mkdir(parents=True, exist_ok=True)
        # Test write permission by touching a test file
        test_file = db_dir / f".write_check_{os.getpid()}"
        test_file.touch()
        test_file.unlink()
        return url
    except Exception as exc:
        logger.warning(
            f"Configured database path '{db_path}' is not accessible/writable ({exc}). "
            "Switching to resilient writable fallback location."
        )
        fallback_dir = Path("/tmp/jarvis_data") if os.path.exists("/tmp") else Path("./jarvis_data")
        try:
            fallback_dir.mkdir(parents=True, exist_ok=True)
            fallback_file = fallback_dir / db_path.name
            logger.info(f"Database successfully relocated to: {fallback_file}")
            return f"sqlite+aiosqlite:///{fallback_file.as_posix()}"
        except Exception as fallback_exc:
            logger.error(
                f"Fallback directory creation failed: {fallback_exc}. Using local directory."
            )
            return "sqlite+aiosqlite:///./jarvis_master.db"


resolved_database_url = resolve_database_url(settings.DATABASE_URL)

# Engine configuration
engine_kwargs: dict[str, Any] = {"echo": settings.DEBUG}
if "sqlite" in resolved_database_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update(
        {
            "pool_size": settings.DATABASE_POOL_SIZE,
            "max_overflow": settings.DATABASE_MAX_OVERFLOW,
            "pool_pre_ping": True,
        }
    )

engine = create_async_engine(resolved_database_url, **engine_kwargs)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for scoped database sessions."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
