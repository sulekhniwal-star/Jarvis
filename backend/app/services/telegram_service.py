"""
Project Jarvis — Telegram Bot Service.
Handles mobile task intake, status queries, completion notifications,
and emergency kill-switch commands with strict single-user allowlist enforcement.
"""

import re
from typing import Any

import httpx
import structlog
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.task import TaskCreate, TaskPriority
from app.services.approval_service import evaluate_approval
from app.services.audit_service import log_audit_event
from app.services.memory_service import MemoryService, SecurityViolationError
from app.services.task_service import cancel_task, create_task, get_task_by_id, list_tasks

logger = structlog.get_logger()

# MarkdownV2 special characters that require escaping
_TELEGRAM_ESCAPE_CHARS = r"\_*[]()~`>#+-=|{}.!"


def escape_markdown_v2(text: str) -> str:
    """Escapes special characters for safe Telegram MarkdownV2 rendering."""
    if not text:
        return ""
    return re.sub(r"([\_*\[\]()~`>#+\-=|{}.!])", r"\\\1", str(text))


BOT_COMMANDS = [
    {"command": "start", "description": "Initialize Jarvis & verify connection"},
    {"command": "help", "description": "Display command list and usage instructions"},
    {"command": "task", "description": "Submit a coding task (/task <description>)"},
    {"command": "tasks", "description": "List all active and recent tasks"},
    {"command": "status", "description": "Check task status (/status <task_id>)"},
    {"command": "remember", "description": "Save preference to memory (/remember <key>: <value>)"},
    {"command": "approve", "description": "Approve a pending action (/approve <approval_id>)"},
    {"command": "reject", "description": "Reject a pending action (/reject <approval_id>)"},
    {"command": "emergency_stop", "description": "Emergency lockdown: cancel all active tasks"},
]


class TelegramService:
    def __init__(
        self,
        bot_token: str | None = None,
        authorized_user_id: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ):
        self.bot_token = bot_token or settings.TELEGRAM_BOT_TOKEN or "mock_telegram_bot_token"
        self.authorized_user_id = str(
            authorized_user_id or settings.AUTHORIZED_TELEGRAM_USER_ID or ""
        )
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self._client = http_client or httpx.AsyncClient(timeout=15.0)
        self._owns_client = http_client is None

    async def close(self):
        if self._owns_client:
            await self._client.aclose()

    def is_authorized_user(self, user_id: Any) -> bool:
        """Strict identity check: only messages from the designated owner are accepted."""
        if not self.authorized_user_id:
            return False
        return str(user_id) == self.authorized_user_id

    async def set_bot_commands(self) -> dict[str, Any]:
        """Registers the official command menu with Telegram Bot API."""
        url = f"{self.base_url}/setMyCommands"
        res = await self._client.post(url, json={"commands": BOT_COMMANDS})
        return res.json()

    async def get_updates(self, offset: int | None = None, timeout: int = 30) -> dict[str, Any]:
        """Fetches pending updates via long polling."""
        url = f"{self.base_url}/getUpdates"
        params: dict[str, Any] = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset
        res = await self._client.get(url, params=params, timeout=timeout + 10.0)
        return res.json()

    async def send_message(
        self,
        chat_id: str,
        text: str,
        parse_mode: str = "MarkdownV2",
        reply_markup: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Dispatches an outbound notification to Telegram with optional inline buttons."""
        url = f"{self.base_url}/sendMessage"
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        res = await self._client.post(url, json=payload)
        return res.json()

    async def notify_task_completed(
        self,
        chat_id: str,
        task_id: str,
        title: str,
        pr_url: str | None = None,
        test_summary: str = "5 passed (exit code 0)",
    ) -> dict[str, Any]:
        """Dispatches a task completion report with PR link and test badge."""
        msg = (
            f"✅ *Task Completed Successfully*\n\n"
            f"*ID:* `{escape_markdown_v2(task_id)}`\n"
            f"*Title:* {escape_markdown_v2(title)}\n"
            f"*Tests:* {escape_markdown_v2(test_summary)}\n"
        )
        if pr_url:
            msg += f"\n🔗 *Pull Request:* [View on GitHub]({escape_markdown_v2(pr_url)})\n"
        msg += "\n_Review diff and approve merge via Dashboard._"

        return await self.send_message(chat_id, msg)

    async def notify_approval_requested(
        self,
        chat_id: str,
        approval_id: str,
        action_type: str,
        payload_summary: str,
        dashboard_url: str = "http://localhost:3000",
    ) -> dict[str, Any]:
        """Dispatches a high-priority approval notification with interactive one-tap buttons."""
        msg = (
            f"⚠️ *Human Approval Required*\n\n"
            f"*Approval ID:* `{escape_markdown_v2(approval_id)}`\n"
            f"*Action:* `{escape_markdown_v2(action_type)}`\n"
            f"*Summary:* {escape_markdown_v2(payload_summary)}\n\n"
            f"👉 [Review on Dashboard]({escape_markdown_v2(dashboard_url)})\n"
        )
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "✅ AUTHORIZE & RUN", "callback_data": f"approve_{approval_id}"},
                    {"text": "❌ ABORT MISSION", "callback_data": f"reject_{approval_id}"},
                ]
            ]
        }
        return await self.send_message(chat_id, msg, reply_markup=reply_markup)

    async def handle_incoming_update(
        self,
        update_data: dict[str, Any],
        session: AsyncSession,
        owner_user_id: str = "owner_default",
    ) -> str | None:
        """
        Processes an incoming Telegram update.
        Handles text commands and interactive inline keyboard callback queries.
        Rejects unauthorized users silently.
        """
        # 1. Handle interactive inline keyboard callbacks
        callback_query = update_data.get("callback_query")
        if callback_query:
            sender = callback_query.get("from", {})
            sender_id = str(sender.get("id", ""))
            if not self.is_authorized_user(sender_id):
                logger.warning("Rejected unauthorized Telegram callback", sender_id=sender_id)
                return None

            data = callback_query.get("data", "")
            chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))

            if data.startswith("approve_"):
                appr_id = data.replace("approve_", "")
                await evaluate_approval(
                    session,
                    appr_id,
                    "APPROVED",
                    "Approved via Telegram one-tap inline button",
                    owner_user_id,
                )
                await session.commit()
                await self.send_message(
                    chat_id, f"✅ Action `{escape_markdown_v2(appr_id)}` authorized via inline button."
                )
                return "inline_approved"
            elif data.startswith("reject_"):
                appr_id = data.replace("reject_", "")
                await evaluate_approval(
                    session,
                    appr_id,
                    "REJECTED",
                    "Rejected via Telegram one-tap inline button",
                    owner_user_id,
                )
                await session.commit()
                await self.send_message(
                    chat_id, f"❌ Action `{escape_markdown_v2(appr_id)}` rejected via inline button."
                )
                return "inline_rejected"

        # 2. Handle standard message commands
        message = update_data.get("message", {})
        sender = message.get("from", {})
        sender_id = str(sender.get("id", ""))
        text = message.get("text", "").strip()
        chat_id = str(message.get("chat", {}).get("id", ""))

        # Identity allowlist check
        if not self.is_authorized_user(sender_id):
            logger.warning("Rejected unauthorized Telegram message", sender_id=sender_id)
            await log_audit_event(
                session=session,
                actor_type="unauthorized_telegram",
                actor_id=sender_id,
                action="UNAUTHORIZED_TELEGRAM_MESSAGE_DROPPED",
                target_type="telegram",
                metadata={"text_snippet": text[:30]},
            )
            await session.commit()
            return None

        # 2. Command routing
        cmd = text.split()[0].split("@")[0].lower() if text else ""

        if cmd == "/start":
            reply = (
                "🤖 *Project Jarvis Online*\n\n"
                "Personal Autonomous AI Assistant is active and connected.\n\n"
                "Type /help to inspect available commands."
            )
            await self.send_message(chat_id, reply)
            return "start_handled"

        elif cmd == "/help":
            reply = (
                "🛠️ *Jarvis Command Guide*\n\n"
                "• `/task <prompt>` — Submit an autonomous coding assignment\n"
                "• `/status <id>` — Check status and step execution of a task\n"
                "• `/tasks` — List recent tasks and status\n"
                "• `/remember <key>: <value>` — Store long-term developer preference\n"
                "• `/approve <id>` — Approve pending human authorization\n"
                "• `/reject <id>` — Reject pending action\n"
                "• `/emergency_stop` — Immediately abort all running tasks"
            )
            await self.send_message(chat_id, reply)
            return "help_handled"

        elif cmd == "/tasks":
            tasks, total = await list_tasks(session, page_size=5)
            if not tasks:
                await self.send_message(chat_id, "ℹ️ No tasks currently in the system.")
                return "tasks_empty"

            lines = ["📋 *Recent Tasks*\n"]
            for t in tasks:
                lines.append(
                    f"• `{t.id[:8]}` — *{escape_markdown_v2(t.title[:40])}* [{escape_markdown_v2(t.status)}]"
                )
            await self.send_message(chat_id, "\n".join(lines))
            return "tasks_handled"

        elif cmd == "/task":
            parts = text.split(maxsplit=1)
            prompt = parts[1].strip() if len(parts) > 1 else ""
            if not prompt:
                await self.send_message(
                    chat_id, "Usage: `/task <description of coding assignment>`"
                )
                return "task_empty"

            # Create persistent task
            task_in = TaskCreate(title=prompt[:80], description=prompt, priority=TaskPriority.HIGH)
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

        elif cmd == "/status":
            parts = text.split(maxsplit=1)
            if len(parts) > 1:
                task_id = parts[1].strip()
                queried_task = await get_task_by_id(session, task_id)
                if not queried_task:
                    await self.send_message(
                        chat_id, f"❌ Task `{escape_markdown_v2(task_id)}` not found."
                    )
                    return "task_not_found"
                reply = (
                    f"📊 *Task Status*\n\n"
                    f"*ID:* `{escape_markdown_v2(queried_task.id)}`\n"
                    f"*Title:* {escape_markdown_v2(queried_task.title)}\n"
                    f"*Status:* `{escape_markdown_v2(queried_task.status)}`\n"
                    f"*Steps:* {len(queried_task.steps)}"
                )
                await self.send_message(chat_id, reply)
                return "status_handled"
            else:
                await self.send_message(chat_id, "Usage: `/status <task_id>`")
                return "status_missing_id"

        elif cmd == "/remember":
            parts = text.split(maxsplit=1)
            content = parts[1].strip() if len(parts) > 1 else ""
            if ":" not in content:
                await self.send_message(
                    chat_id, "Usage: `/remember <key>: <preference or convention>`"
                )
                return "remember_invalid_format"
            key, val = content.split(":", 1)
            try:
                mem = await MemoryService.store_memory(
                    session=session,
                    scope_type="shared",
                    category="preference",
                    key=key.strip(),
                    content=val.strip(),
                    actor_id=sender_id,
                )
                await self.send_message(
                    chat_id,
                    f"🧠 *Preference Saved to Memory*\n\n*Key:* `{escape_markdown_v2(mem.key)}`\n*Content:* {escape_markdown_v2(mem.content)}",
                )
                return "remember_handled"
            except SecurityViolationError as e:
                await self.send_message(
                    chat_id, f"🚫 *Security Block:* {escape_markdown_v2(str(e))}"
                )
                return "remember_security_blocked"

        elif cmd == "/approve":
            parts = text.split(maxsplit=1)
            if len(parts) < 2:
                await self.send_message(chat_id, "Usage: `/approve <approval_id>`")
                return "approve_missing_id"
            approval_id = parts[1].strip()
            try:
                appr = await evaluate_approval(
                    session=session,
                    approval_id=approval_id,
                    decision="APPROVED",
                    decided_by_user_id=owner_user_id,
                    reason="Approved via authorized Telegram command",
                )
                await session.commit()
                await self.send_message(
                    chat_id,
                    f"✅ *Approval Granted*\nAction `{escape_markdown_v2(appr.action_type)}` approved.",
                )
                return "approve_handled"
            except HTTPException as e:
                await self.send_message(chat_id, f"❌ *Error:* {escape_markdown_v2(e.detail)}")
                return "approve_failed"

        elif cmd == "/reject":
            parts = text.split(maxsplit=1)
            if len(parts) < 2:
                await self.send_message(chat_id, "Usage: `/reject <approval_id>`")
                return "reject_missing_id"
            approval_id = parts[1].strip()
            try:
                appr = await evaluate_approval(
                    session=session,
                    approval_id=approval_id,
                    decision="REJECTED",
                    decided_by_user_id=owner_user_id,
                    reason="Rejected via Telegram command",
                )
                await session.commit()
                await self.send_message(
                    chat_id,
                    f"🛑 *Action Rejected*\nAction `{escape_markdown_v2(appr.action_type)}` rejected.",
                )
                return "reject_handled"
            except HTTPException as e:
                await self.send_message(chat_id, f"❌ *Error:* {escape_markdown_v2(e.detail)}")
                return "reject_failed"

        elif cmd == "/emergency_stop":
            tasks, _ = await list_tasks(session)
            cancelled_count = 0
            for t in tasks:
                if t.status in ["PENDING", "PLANNING", "EXECUTING", "TESTING", "AWAITING_APPROVAL"]:
                    await cancel_task(session, t.id, user_id=owner_user_id)
                    cancelled_count += 1
            await session.commit()

            reply = f"🚨 *EMERGENCY STOP EXECUTED*\nTerminated and cancelled {cancelled_count} active tasks."
            await self.send_message(chat_id, reply)
            return "emergency_stop_handled"

        await self.send_message(
            chat_id, "❓ Unknown command. Type /help to see available commands."
        )
        return "unrecognized_command"
