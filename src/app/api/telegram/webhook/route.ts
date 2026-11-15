import { NextRequest, NextResponse } from "next/server";
import {
  TelegramUpdate,
  TelegramClient,
  verifyWebhookSecret,
  validateUpdate,
  handleTelegramCommand,
  TelegramIntakeService,
  TelegramDecisionService,
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
    const userId = process.env.OWNER_USER_ID ?? "00000000-0000-0000-0000-000000000000";

    // 4. Handle incoming callback query (inline button clicks on approval cards)
    if (update.callback_query) {
      const decisionService = new TelegramDecisionService({ client });
      await decisionService.handleCallbackQuery(update.callback_query, userId);
      return NextResponse.json({ ok: true });
    }

    // 5. Handle incoming message text
    if (update.message?.text) {
      const text = update.message.text.trim();
      const chatId = update.message.chat.id;

      if (text.startsWith("/")) {
        const reply = await handleTelegramCommand(text, { userId });
        await client.sendMessage(chatId, reply);
      } else {
        // Natural language task prompt or clarification answer
        const intakeService = new TelegramIntakeService();
        const activeSession = await intakeService.getActiveClarificationSession(userId);

        let reply: string;
        if (activeSession) {
          reply = await intakeService.handleClarificationAnswer(userId, text);
        } else {
          reply = await intakeService.handleNewTaskPrompt(userId, text);
        }

        await client.sendMessage(chatId, reply);
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
