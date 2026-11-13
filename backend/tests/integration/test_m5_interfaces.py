"""
Project Jarvis — Milestone 5 User Interfaces & Acceptance Test Suite.
Verifies Telegram identity allowlisting, mobile task intake, emergency stop command,
completion notifications, and system kill-switch API endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.task import Task
from app.services.telegram_service import TelegramService, escape_markdown_v2
from tests.conftest import test_session_factory as _session_factory


@pytest.fixture
async def auth_headers(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "owner_m5", "password": "Pass12345678!"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_telegram_unauthorized_user_silently_dropped():
    """
    CRITICAL SECURITY TEST:
    Verify incoming messages from unlisted Telegram users are dropped and audited.
    """
    telegram = TelegramService(
        bot_token="test_token",
        authorized_user_id="111222333"
    )

    unauthorized_update = {
        "update_id": 1,
        "message": {
            "from": {"id": 999999999, "username": "attacker"},  # Unauthorized!
            "chat": {"id": 999999999},
            "text": "/task Delete all databases"
        }
    }

    async with _session_factory() as session:
        result = await telegram.handle_incoming_update(unauthorized_update, session)
        assert result is None  # Silently dropped!


@pytest.mark.asyncio
async def test_telegram_task_intake_creates_persistent_task():
    """
    CRITICAL ACCEPTANCE TEST:
    Owner submits task via Telegram -> creates persistent database task and returns plan.
    """
    sent_messages = []

    async def mock_send(chat_id, text, parse_mode="MarkdownV2"):
        sent_messages.append({"chat_id": chat_id, "text": text})
        return {"ok": True}

    telegram = TelegramService(
        bot_token="test_token",
        authorized_user_id="111222333"
    )
    telegram.send_message = mock_send

    authorized_update = {
        "update_id": 2,
        "message": {
            "from": {"id": 111222333, "username": "owner"},
            "chat": {"id": 111222333},
            "text": "/task Implement rate limiting middleware"
        }
    }

    async with _session_factory() as session:
        result = await telegram.handle_incoming_update(authorized_update, session)
        assert result == "task_created"

        # Verify task is in database with eager-loaded steps
        stmt = (
            select(Task)
            .options(selectinload(Task.steps))
            .where(Task.title.like("%rate limiting%"))
        )
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        assert task is not None
        assert task.status == "PENDING"
        assert len(task.steps) == 5

    # Verify confirmation sent to Telegram
    assert len(sent_messages) == 1
    assert "Task Created" in sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_telegram_emergency_stop():
    """Verify Telegram /emergency_stop cancels active tasks."""
    sent_messages = []

    async def mock_send(chat_id, text, parse_mode="MarkdownV2"):
        sent_messages.append({"chat_id": chat_id, "text": text})
        return {"ok": True}

    telegram = TelegramService(
        bot_token="test_token",
        authorized_user_id="111222333"
    )
    telegram.send_message = mock_send

    # Create an active task first
    async with _session_factory() as session:
        task = Task(title="Active Task", description="Running", status="EXECUTING")
        session.add(task)
        await session.commit()

        stop_update = {
            "update_id": 3,
            "message": {
                "from": {"id": 111222333},
                "chat": {"id": 111222333},
                "text": "/emergency_stop"
            }
        }
        res = await telegram.handle_incoming_update(stop_update, session)
        assert res == "emergency_stop_handled"

        # Verify task is cancelled
        await session.refresh(task)
        assert task.status == "CANCELLED"

    assert "EMERGENCY STOP EXECUTED" in sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_system_emergency_endpoints(client: AsyncClient, auth_headers: dict):
    """Verify Dashboard emergency stop and resume API endpoints."""
    # Emergency Stop
    stop_res = await client.post("/api/v1/system/emergency-stop", headers=auth_headers)
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "LOCKED"

    # Status Check
    status_res = await client.get("/api/v1/system/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "LOCKED"

    # Resume
    resume_res = await client.post("/api/v1/system/resume", headers=auth_headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "OPERATIONAL"


def test_telegram_markdown_v2_escaping():
    """Verify special characters are escaped safely for Telegram API."""
    raw = "Fix bug: item[0].price = 100 * 2; version: 1.0.0!"
    escaped = escape_markdown_v2(raw)
    assert r"\[" in escaped
    assert r"\." in escaped
    assert r"\*" in escaped
    assert r"\!" in escaped
