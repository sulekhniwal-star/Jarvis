import { NextRequest, NextResponse } from "next/server";
import {
  TelegramUpdate,
  TelegramClient,
  verifyWebhookSecret,
  validateUpdate,
  handleTelegramCommand,
  bold,
  italic,
} from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify X-Telegram-Bot-Api-Secret-Token header
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    if (!verifyWebhookSecret(secretHeader)) {
      return NextResponse.json(
        { error: "Invalid Telegram webhook secret token" },
        { status: 401 }
      );
    }

    // 2. Parse Telegram Update body
    let update: TelegramUpdate;
    try {
      update = (await req.json()) as TelegramUpdate;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON update payload" },
        { status: 400 }
      );
    }

    // 3. Security Guard: Verify update originates from the authorized owner
    const validation = validateUpdate(update);
    if (!validation.isAuthorized) {
      console.warn(
        `[Telegram Webhook Security] Dropped unauthorized update from sender: ${validation.senderId} (${validation.reason})`
      );
      // Return 200 to acknowledge receipt and prevent Telegram retry loops, while silently dropping
      return NextResponse.json({ ok: true, dropped: true });
    }

    const client = new TelegramClient();

    // 4. Handle incoming message text
    if (update.message?.text) {
      const text = update.message.text.trim();
      const chatId = update.message.chat.id;

      if (text.startsWith("/")) {
        const reply = await handleTelegramCommand(text);
        await client.sendMessage(chatId, reply);
      } else {
        // Natural language task prompt
        const ackMessage = [
          `📥 ${bold("Task Prompt Received")}`,
          "",
          "Your prompt has been acknowledged by Jarvis\\. Full autonomous specification and clarification will process this in Phase 10\\.",
          "",
          italic("Use /status to inspect active workloads or /budget for quota\\."),
        ].join("\n");

        await client.sendMessage(chatId, ackMessage);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook Error]", err);
    return NextResponse.json(
      { error: "Internal server error processing Telegram update" },
      { status: 500 }
    );
  }
}
