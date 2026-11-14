"""
Project Jarvis — Root Pytest Configuration and Test Fixtures.
Provides file-backed SQLite async fixtures for 100% reliable, zero-cost testing.
"""

import os

_TEST_DB_FILE = os.path.join(os.path.dirname(__file__), "test_suite.db")
_TEST_DB_URL = f"sqlite+aiosqlite:///{_TEST_DB_FILE.replace(os.sep, '/')}"

# Enforce testing environment across all pytest runs for zero-cost isolation
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = _TEST_DB_URL

from collections.abc import AsyncGenerator
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings

# Force override on loaded settings object
settings.ENVIRONMENT = "testing"
settings.DATABASE_URL = _TEST_DB_URL

from app.core.database import get_db_session
from app.core.security import hash_password
from app.main import app
from app.models.base import Base
from app.models.user import User

# Pre-compute Argon2id hashes once per test session to avoid 92x redundant hashing overhead
_CACHED_TEST_OWNER_HASH: str | None = None
_CACHED_OWNER_M5_HASH: str | None = None


def get_cached_test_owner_hash() -> str:
    global _CACHED_TEST_OWNER_HASH
    if _CACHED_TEST_OWNER_HASH is None:
        _CACHED_TEST_OWNER_HASH = hash_password("SuperSecretPassword123!")
    return _CACHED_TEST_OWNER_HASH


def get_cached_owner_m5_hash() -> str:
    global _CACHED_OWNER_M5_HASH
    if _CACHED_OWNER_M5_HASH is None:
        _CACHED_OWNER_M5_HASH = hash_password("Pass12345678!")
    return _CACHED_OWNER_M5_HASH


test_engine = create_async_engine(
    _TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
test_session_factory = async_sessionmaker(
    bind=test_engine, expire_on_commit=False, autocommit=False, autoflush=False
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
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_factory() as session:
        user1 = User(
            username="test_owner",
            hashed_password=get_cached_test_owner_hash(),
            display_name="Test Owner",
            role="owner",
            is_active=True,
        )
        user2 = User(
            username="owner_m5",
            hashed_password=get_cached_owner_m5_hash(),
            display_name="Owner M5",
            role="owner",
            is_active=True,
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
async def auth_headers(client: AsyncClient):
    """Logs in as the test owner and returns Authorization header."""
    res = await client.post(
        "/api/v1/auth/login", json={"username": "test_owner", "password": "SuperSecretPassword123!"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}



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
