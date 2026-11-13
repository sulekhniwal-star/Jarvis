"""
Setup and test script for Telegram Bot integration with Project Jarvis.
- Registers official command menu (/start, /help, /task, /tasks, /status, /remember, /approve, /reject, /emergency_stop)
- Fetches bot details and verifies identity
- Sends a test greeting to the authorized owner if available
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure root and backend are on sys.path
_repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_repo_root / "backend"))
sys.path.insert(0, str(_repo_root))

load_dotenv(_repo_root / ".env")

from app.core.config import settings
from app.services.telegram_service import TelegramService


async def main():
    print(f"[*] Initializing Telegram Service...")
    print(f"[*] Base URL: https://api.telegram.org/bot<TOKEN>")
    print(f"[*] Authorized User ID: {settings.AUTHORIZED_TELEGRAM_USER_ID}")

    if not settings.TELEGRAM_BOT_TOKEN:
        print("[!] ERROR: TELEGRAM_BOT_TOKEN is not configured in .env!")
        return

    svc = TelegramService()

    try:
        # 1. Test getMe
        res_me = await svc._client.get(f"{svc.base_url}/getMe")
        me_data = res_me.json()
        print(f"[+] Bot identity: {me_data}")

        # 2. Register commands with Telegram
        print("[*] Registering bot commands...")
        res_cmd = await svc.set_bot_commands()
        print(f"[+] setMyCommands response: {res_cmd}")

        # 3. Send test confirmation message to authorized user if set
        if settings.AUTHORIZED_TELEGRAM_USER_ID:
            print(f"[*] Sending greeting to authorized owner ({settings.AUTHORIZED_TELEGRAM_USER_ID})...")
            greeting = (
                "🤖 *Project Jarvis v1.0 Online*\n\n"
                "System initialized and connected to cloud backend.\n"
                "Type /help to view command list."
            )
            res_msg = await svc.send_message(
                chat_id=settings.AUTHORIZED_TELEGRAM_USER_ID,
                text=greeting
            )
            print(f"[+] Outbound message status: {res_msg.get('ok')}")

    except Exception as e:
        print(f"[!] Exception during telegram setup: {e}")
    finally:
        await svc.close()


if __name__ == "__main__":
    asyncio.run(main())

