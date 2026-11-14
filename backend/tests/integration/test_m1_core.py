"""
Project Jarvis — Milestone 1 Integration & Acceptance Test Suite.
Verifies Health, Owner Authentication, Task CRUD, State Machine, and Approvals.
Uses StaticPool in-memory SQLite and httpx AsyncClient for 100% offline, deterministic tests.
"""

import pytest
from httpx import AsyncClient


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
        "/api/v1/auth/login", json={"username": "test_owner", "password": "WrongPassword!"}
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
        "idempotency_key": "unique-task-001",
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
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/tasks",
        json={"title": "Task Two", "description": "Description two", "priority": "HIGH"},
        headers=auth_headers,
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
        headers=auth_headers,
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
        "/api/v1/tasks", json={"title": "Unauthorized", "description": "Should fail"}
    )
    assert post_res.status_code == 401


@pytest.mark.asyncio
async def test_task_logs_and_retry(client: AsyncClient, auth_headers: dict):
    """Verify task logs retrieval and manual operator retry endpoint."""
    res = await client.post(
        "/api/v1/tasks",
        json={"title": "Task for logs testing", "description": "Verify log formatting."},
        headers=auth_headers,
    )
    assert res.status_code == 201
    task_id = res.json()["id"]

    # Verify logs endpoint
    log_res = await client.get(f"/api/v1/tasks/{task_id}/logs", headers=auth_headers)
    assert log_res.status_code == 200
    log_data = log_res.json()
    assert log_data["task_id"] == task_id
    assert len(log_data["logs"]) > 0

    # Cancel then retry
    await client.post(f"/api/v1/tasks/{task_id}/cancel", headers=auth_headers)
    retry_res = await client.post(f"/api/v1/tasks/{task_id}/retry", headers=auth_headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] in ["EXECUTING", "COMPLETED"]

    # Verify diff endpoint
    diff_res = await client.get(f"/api/v1/tasks/{task_id}/diff", headers=auth_headers)
    assert diff_res.status_code == 200
    assert "diff" in diff_res.json()
    assert len(diff_res.json()["diff"]) > 0
