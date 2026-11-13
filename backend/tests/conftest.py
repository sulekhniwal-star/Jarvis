"""
Project Jarvis — Root Pytest Configuration and Test Fixtures.
Provides file-backed SQLite async fixtures for 100% reliable, zero-cost testing.
"""

import os
from typing import AsyncGenerator
from unittest.mock import MagicMock
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models as _models_registry  # Ensures all ORM models are registered on Base.metadata
from app.core.config import settings
from app.core.database import get_db_session
from app.core.security import hash_password
from app.main import app
from app.models.base import Base
from app.models.user import User

# Enforce testing environment across all pytest runs for zero-cost isolation
settings.ENVIRONMENT = "testing"

_TEST_DB_FILE = os.path.join(os.path.dirname(__file__), "test_suite.db")
_TEST_DB_URL = f"sqlite+aiosqlite:///{_TEST_DB_FILE.replace(os.sep, '/')}"

test_engine = create_async_engine(
    _TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
test_session_factory = async_sessionmaker(
    bind=test_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def override_get_db_session() -> AsyncGenerator:
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Sets up fresh database schema and default owner users for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_factory() as session:
        user1 = User(
            username="test_owner",
            hashed_password=hash_password("SuperSecretPassword123!"),
            display_name="Test Owner",
            role="owner",
            is_active=True
        )
        user2 = User(
            username="owner_m5",
            hashed_password=hash_password("Pass12345678!"),
            display_name="Owner M5",
            role="owner",
            is_active=True
        )
        session.add_all([user1, user2])
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_ai_provider():
    """Returns a deterministic mock AI provider for testing without API calls."""
    provider = MagicMock()
    provider.name = "mock"
    provider.generate_plan.return_value = {
        "steps": [
            {"sequence": 1, "name": "Analyze repository", "tool": "repo_inspect"},
            {"sequence": 2, "name": "Create branch", "tool": "git_branch"},
            {"sequence": 3, "name": "Implement changes", "tool": "file_edit"},
            {"sequence": 4, "name": "Run tests", "tool": "test_runner"},
            {"sequence": 5, "name": "Create pull request", "tool": "github_pr"},
        ]
    }
    return provider


@pytest.fixture
def sample_task_payload():
    """Provides a canonical valid task creation payload."""
    return {
        "title": "Fix bug in calculation module",
        "description": "Fix divide-by-zero exception in calculate_ratio function.",
        "project_name": "demo-repo",
        "repository": "my-org/demo-repo",
        "priority": "HIGH",
        "idempotency_key": "test-task-uuid-001",
    }
