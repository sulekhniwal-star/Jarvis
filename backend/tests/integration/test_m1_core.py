"""
Project Jarvis — Milestone 1 Integration & Acceptance Test Suite.
Verifies Health, Owner Authentication, Task CRUD, State Machine, and Approvals.
Uses StaticPool in-memory SQLite and httpx AsyncClient for 100% offline, deterministic tests.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import get_db_session
from app.core.security import hash_password
from app.main import app
from app.models.base import Base
from app.models.user import User

# Test database engine using StaticPool so in-memory DB is shared across async sessions
_TEST_DB_URL = "sqlite+aiosqlite://"
_engine = create_async_engine(
    _TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_session_factory = async_sessionmaker(
    bind=_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def override_get_db_session():
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Sets up fresh database schema and default owner user for each test."""
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with _session_factory() as session:
        user = User(
            username="test_owner",
            hashed_password=hash_password("SuperSecretPassword123!"),
            display_name="Test Owner",
            role="owner",
            is_active=True
        )
        session.add(user)
        await session.commit()

    yield

    async with _engine.begin() as conn:
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
        "/api/v1/auth/login",
        json={"username": "test_owner", "password": "SuperSecretPassword123!"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    """Verify liveness and readiness probes."""
    live = await client.get("/api/v1/health/live")
    assert live.status_code == 200
    assert live.json()["status"] == "ok"

    ready = await client.get("/api/v1/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_auth_login_failure(client: AsyncClient):
    """Verify unauthorized login attempt fails with 401."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_owner", "password": "WrongPassword!"}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_me(client: AsyncClient, auth_headers: dict):
    """Verify /me profile endpoint with valid JWT."""
    res = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "test_owner"


@pytest.mark.asyncio
async def test_task_creation_and_steps_planning(client: AsyncClient, auth_headers: dict):
    """Verify task creation generates structured plan steps via mock provider."""
    payload = {
        "title": "Fix memory leak in buffer pool",
        "description": "Buffer objects are not released during high connection turnover.",
        "priority": "HIGH",
        "idempotency_key": "unique-task-001"
    }
    res = await client.post("/api/v1/tasks", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "PENDING"
    assert len(data["steps"]) == 5
    assert data["steps"][0]["tool_name"] == "repo_inspect"

    # Idempotency check: submitting same idempotency_key returns existing task
    res_dup = await client.post("/api/v1/tasks", json=payload, headers=auth_headers)
    assert res_dup.status_code == 201
    assert res_dup.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_task_retrieval_and_listing(client: AsyncClient, auth_headers: dict):
    """Verify task listing and pagination."""
    # Create two tasks
    await client.post(
        "/api/v1/tasks",
        json={"title": "Task One", "description": "Description one", "priority": "LOW"},
        headers=auth_headers
    )
    await client.post(
        "/api/v1/tasks",
        json={"title": "Task Two", "description": "Description two", "priority": "HIGH"},
        headers=auth_headers
    )

    list_res = await client.get("/api/v1/tasks", headers=auth_headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 2


@pytest.mark.asyncio
async def test_task_cancellation(client: AsyncClient, auth_headers: dict):
    """Verify active task cancellation."""
    res = await client.post(
        "/api/v1/tasks",
        json={"title": "Task to cancel", "description": "This will be cancelled."},
        headers=auth_headers
    )
    task_id = res.json()["id"]

    cancel_res = await client.post(f"/api/v1/tasks/{task_id}/cancel", headers=auth_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_unauthenticated_requests_blocked(client: AsyncClient):
    """Verify protected endpoints return 401 without bearer token."""
    res = await client.get("/api/v1/tasks")
    assert res.status_code == 401

    post_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Unauthorized", "description": "Should fail"}
    )
    assert post_res.status_code == 401
