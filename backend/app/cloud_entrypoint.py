"""
Project Jarvis — 24/7 Cloud Entrypoint Daemon.
Runs the FastAPI API server and the Telegram Bot long-polling daemon concurrently
inside a single cloud container (Render, Railway, Fly.io, or VPS) so Jarvis
stays alive 24/7 even when your laptop is turned off.
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

# Ensure root and backend are on sys.path
_repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_repo_root / "backend"))
sys.path.insert(0, str(_repo_root))

from dotenv import load_dotenv
load_dotenv(_repo_root / ".env")

import uvicorn
from app.main import app
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.models.base import Base
from app.services.auth_service import ensure_owner_user_exists
from app.services.telegram_service import TelegramService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("jarvis.cloud_daemon")


async def run_telegram_worker(owner_id: str):
    """Runs long-polling loop for Telegram Bot notifications and commands."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not configured. Skipping Telegram listener.")
        return

    svc = TelegramService()
    logger.info(f"Telegram Cloud Worker active. Target owner ID: {settings.AUTHORIZED_TELEGRAM_USER_ID}")

    try:
        await svc.set_bot_commands()
    except Exception as e:
        logger.warning(f"Could not register commands: {e}")

    offset = None
    while True:
        try:
            updates_resp = await svc.get_updates(offset=offset, timeout=25)
            if updates_resp.get("ok"):
                for update in updates_resp.get("result", []):
                    offset = update["update_id"] + 1
                    async with async_session_factory() as session:
                        try:
                            await svc.handle_incoming_update(
                                update_data=update,
                                session=session,
                                owner_user_id=owner_id
                            )
                        except Exception as err:
                            logger.error(f"Error handling Telegram update: {err}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Telegram polling retry: {e}")
            await asyncio.sleep(3)

    await svc.close()


async def main():
    logger.info("Starting Jarvis 24/7 Cloud Architecture...")

    # 1. Initialize DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Ensure owner user exists
    async with async_session_factory() as session:
        owner = await ensure_owner_user_exists(session)
        owner_id = owner.id
        logger.info(f"Verified Owner Account: {owner.username} ({owner_id})")

    # 3. Configure uvicorn server
    port = int(os.environ.get("PORT", "8000"))
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=False
    )
    server = uvicorn.Server(config)

    # 4. Run both the API server and the Telegram listener concurrently
    logger.info(f"Launching API on 0.0.0.0:{port} + 24/7 Telegram Worker...")
    await asyncio.gather(
        server.serve(),
        run_telegram_worker(owner_id)
    )


if __name__ == "__main__":
    asyncio.run(main())

