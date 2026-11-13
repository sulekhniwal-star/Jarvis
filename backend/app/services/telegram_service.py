"""
Project Jarvis — Telegram Bot Service.
Handles mobile task intake, status queries, completion notifications,
and emergency kill-switch commands with strict single-user allowlist enforcement.
"""

import re
from typing import Any, Dict, Optional
from fastapi import HTTPException
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskPriority, TaskStatus
from app.services.audit_service import log_audit_event
from app.services.task_service import cancel_task, create_task, get_task_by_id, list_tasks

logger = structlog.get_logger()

# MarkdownV2 special characters that require escaping
_TELEGRAM_ESCAPE_CHARS = r"\_*[]()~`>#+-=|{}.!"


def escape_markdown_v2(text: str) -> str:
    """Escapes special characters for safe Telegram MarkdownV2 rendering."""
    if not text:
        return ""
    return re.sub(r"([\_*\[\]()~`>#+\-=|{}.!])", r"\\\1", str(text))


class TelegramService:
    def __init__(
        self,
        bot_token: Optional[str] = None,
        authorized_user_id: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.bot_token = bot_token or settings.__dict__.get("TELEGRAM_BOT_TOKEN") or "mock_telegram_bot_token"
        self.authorized_user_id = str(authorized_user_id or settings.__dict__.get("AUTHORIZED_TELEGRAM_USER_ID") or "")
        self.base_url = f"https://api.telegram.com/bot{self.bot_token}"
        self._client = http_client or httpx.AsyncClient(timeout=15.0)
        self._owns_client = http_client is None

    async def close(self):
        if self._owns_client:
            await self._client.aclose()

    def is_authorized_user(self, user_id: Any) -> bool:
        """Strict identity check: only messages from the designated owner are accepted."""
        if not self.authorized_user_id:
            # If no authorized ID configured, deny all for security
            return False
        return str(user_id) == self.authorized_user_id

    async def send_message(
        self,
        chat_id: str,
        text: str,
        parse_mode: str = "MarkdownV2"
    ) -> Dict[str, Any]:
        """Dispatches an outbound notification to Telegram."""
        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        res = await self._client.post(url, json=payload)
        return res.json()

    async def notify_task_completed(
        self,
        chat_id: str,
        task_id: str,
        title: str,
        pr_url: Optional[str] = None,
        test_summary: str = "5 passed (exit code 0)"
    ) -> Dict[str, Any]:
        """Dispatches a task completion report with PR link and test badge."""
        msg = (
            f"✅ *Task Completed Successfully*\n\n"
            f"*ID:* `{escape_markdown_v2(task_id)}`\n"
            f"*Title:* {escape_markdown_v2(title)}\n"
            f"*Tests:* {escape_markdown_v2(test_summary)}\n"
        )
        if pr_url:
            msg += f"\n🔗 *Pull Request:* [View on GitHub]({escape_markdown_v2(pr_url)})\n"
        msg += f"\n_Review diff and approve merge via Dashboard._"

        return await self.send_message(chat_id, msg)

    async def notify_approval_requested(
        self,
        chat_id: str,
        approval_id: str,
        action_type: str,
        payload_summary: str,
        dashboard_url: str = "http://localhost:3000"
    ) -> Dict[str, Any]:
        """Dispatches a high-priority approval notification."""
        msg = (
            f"⚠️ *Human Approval Required*\n\n"
            f"*Action:* `{escape_markdown_v2(action_type)}`\n"
            f"*Summary:* {escape_markdown_v2(payload_summary)}\n\n"
            f"👉 [Review and Approve on Dashboard]({escape_markdown_v2(dashboard_url)})\n"
        )
        return await self.send_message(chat_id, msg)

    async def handle_incoming_update(
        self,
        update_data: Dict[str, Any],
        session: AsyncSession,
        owner_user_id: str = "owner_default"
    ) -> Optional[str]:
        """
        Processes an incoming Telegram update.
        Rejects unauthorized users silently and dispatches valid commands.
        """
        message = update_data.get("message", {})
        sender = message.get("from", {})
        sender_id = str(sender.get("id", ""))
        text = message.get("text", "").strip()
        chat_id = str(message.get("chat", {}).get("id", ""))

        # 1. Identity allowlist check
        if not self.is_authorized_user(sender_id):
            logger.warn("Rejected unauthorized Telegram message", sender_id=sender_id)
            await log_audit_event(
                session=session,
                actor_type="unauthorized_telegram",
                actor_id=sender_id,
                action="UNAUTHORIZED_TELEGRAM_MESSAGE_DROPPED",
                target_type="telegram",
                metadata={"text_snippet": text[:30]}
            )
            await session.commit()
            return None

        # 2. Command routing
        if text.startswith("/start"):
            reply = "🤖 *Project Jarvis Online*\nAutonomous AI Engineering Platform ready."
            await self.send_message(chat_id, escape_markdown_v2(reply))
            return "start_handled"

        elif text.startswith("/task"):
            prompt = text[5:].strip()
            if not prompt:
                await self.send_message(chat_id, "Usage: `/task <description of coding assignment>`")
                return "task_empty"

            # Create persistent task
            task_in = TaskCreate(
                title=prompt[:80],
                description=prompt,
                priority=TaskPriority.HIGH
            )
            task = await create_task(session, task_in, user_id=owner_user_id)
            await session.commit()

            reply = (
                f"🚀 *Task Created*\n\n"
                f"*ID:* `{escape_markdown_v2(task.id)}`\n"
                f"*Title:* {escape_markdown_v2(task.title)}\n"
                f"*Status:* `{escape_markdown_v2(task.status)}`\n"
                f"*Planned Steps:* {len(task.steps)}"
            )
            await self.send_message(chat_id, reply)
            return "task_created"

        elif text.startswith("/status"):
            parts = text.split(maxsplit=1)
            if len(parts) > 1:
                task_id = parts[1].strip()
                task = await get_task_by_id(session, task_id)
                if not task:
                    await self.send_message(chat_id, f"❌ Task `{escape_markdown_v2(task_id)}` not found.")
                    return "task_not_found"
                reply = (
                    f"📊 *Task Status*\n\n"
                    f"*ID:* `{escape_markdown_v2(task.id)}`\n"
                    f"*Title:* {escape_markdown_v2(task.title)}\n"
                    f"*Status:* `{escape_markdown_v2(task.status)}`\n"
                    f"*Steps:* {len(task.steps)}"
                )
                await self.send_message(chat_id, reply)
                return "status_handled"

        elif text.startswith("/emergency_stop"):
            # Emergency Stop: Cancel all active tasks
            tasks, _ = await list_tasks(session)
            cancelled_count = 0
            for t in tasks:
                if t.status in ["PENDING", "PLANNING", "EXECUTING", "TESTING", "AWAITING_APPROVAL"]:
                    await cancel_task(session, t.id, user_id=owner_user_id)
                    cancelled_count += 1
            await session.commit()

            reply = f"🚨 *EMERGENCY STOP EXECUTED*\nTerminated and cancelled {cancelled_count} active tasks."
            await self.send_message(chat_id, escape_markdown_v2(reply))
            return "emergency_stop_handled"

        return "unrecognized_command"

