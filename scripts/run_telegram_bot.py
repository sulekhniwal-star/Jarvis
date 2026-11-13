"""
Project Jarvis — Telegram Long-Polling Bot Daemon.
Continuously listens for incoming updates from Telegram, enforces
single-user allowlist, and executes Jarvis commands.
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure root and backend are on sys.path
_repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_repo_root / "backend"))
sys.path.insert(0, str(_repo_root))

load_dotenv(_repo_root / ".env")

from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.models.base import Base
from app.services.auth_service import ensure_owner_user_exists
from app.services.telegram_service import TelegramService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("jarvis.telegram_daemon")


async def run_bot():
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN is not set in environment or .env file.")
        return

    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        owner = await ensure_owner_user_exists(session)
        owner_id = owner.id
        logger.info(f"Verified owner user: {owner.username} (id: {owner_id})")

    svc = TelegramService()
    logger.info(f"Connected to Telegram Bot: {svc.base_url}")
    logger.info(f"Authorized Telegram User ID: {settings.AUTHORIZED_TELEGRAM_USER_ID}")

    # Register commands with Telegram
    logger.info("Publishing official bot commands to Telegram...")
    try:
        cmd_result = await svc.set_bot_commands()
        logger.info(f"setMyCommands response: {cmd_result}")
    except Exception as e:
        logger.warning(f"Failed to publish commands: {e}")

    offset = None
    running = True

    def stop_signal(sig, frame):
        nonlocal running
        logger.info(f"Received stop signal ({sig}). Gracefully shutting down...")
        running = False

    try:
        signal.signal(signal.SIGINT, stop_signal)
        signal.signal(signal.SIGTERM, stop_signal)
    except Exception:
        pass

    logger.info("Jarvis Telegram Daemon is now listening for messages (Press Ctrl+C to stop)...")

    while running:
        try:
            updates_resp = await svc.get_updates(offset=offset, timeout=20)
            if not updates_resp.get("ok"):
                logger.error(f"Telegram API returned error: {updates_resp}")
                await asyncio.sleep(3)
                continue

            updates = updates_resp.get("result", [])
            for update in updates:
                update_id = update["update_id"]
                offset = update_id + 1

                msg = update.get("message", {})
                sender = msg.get("from", {}).get("username") or msg.get("from", {}).get("id")
                text = msg.get("text", "")
                logger.info(f"Received update {update_id} from {sender}: {text[:50]}")

                async with async_session_factory() as session:
                    try:
                        result = await svc.handle_incoming_update(
                            update_data=update,
                            session=session,
                            owner_user_id=owner_id
                        )
                        logger.info(f"Update {update_id} handled with result: {result}")
                    except Exception as err:
                        logger.exception(f"Error handling update {update_id}: {err}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Polling loop exception: {e}")
            await asyncio.sleep(2)

    await svc.close()
    await engine.dispose()
    logger.info("Jarvis Telegram Daemon stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logger.info("Interrupted by user.")
