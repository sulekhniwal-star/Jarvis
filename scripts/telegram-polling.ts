import fs from "fs";
import path from "path";
import {
  TelegramClient,
  validateUpdate,
  handleTelegramCommand,
  TelegramIntakeService,
  TelegramDecisionService,
} from "../src/lib/telegram";

/**
 * Loads environment variables from .env.local and .env if present.
 */
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...values] = trimmed.split("=");
          const val = values.join("=").trim().replace(/^["'](.*)["']$/, "$1");
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

async function main() {
  loadEnv();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.OWNER_TELEGRAM_ID;

  if (!token) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN is not set in environment or .env.local");
    process.exit(1);
  }

  if (!ownerId) {
    console.error("❌ Error: OWNER_TELEGRAM_ID is not set in environment or .env.local");
    process.exit(1);
  }

  const client = new TelegramClient({ botToken: token });

  console.log("🚀 Initializing Jarvis Telegram Polling Service (Dev Mode)...");

  try {
    const botInfo = await client.getMe();
    console.log(`✅ Connected as bot: @${botInfo.username} (ID: ${botInfo.id})`);
    console.log(`🔒 Single-owner lockdown active for ID: ${ownerId}`);

    console.log("🧹 Clearing active webhooks to enable long-polling...");
    await client.deleteWebhook({ dropPendingUpdates: false });
    console.log("👂 Listening for updates via long-polling (Press Ctrl+C to stop)...");

    let offset = 0;
    let isRunning = true;

    process.on("SIGINT", () => {
      console.log("\n🛑 Stopping Telegram polling service...");
      isRunning = false;
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Stopping Telegram polling service...");
      isRunning = false;
      process.exit(0);
    });

    while (isRunning) {
      try {
        const updates = await client.getUpdates({ offset, timeout: 30 });

        for (const update of updates) {
          offset = update.update_id + 1;

          const validation = validateUpdate(update);
          if (!validation.isAuthorized) {
            console.warn(
              `⚠️ Dropped update from unauthorized sender: ${validation.senderId} (${validation.reason})`
            );
            continue;
          }

          if (update.callback_query) {
            console.log(`🔘 Received callback query: ${update.callback_query.data}`);
            const decisionService = new TelegramDecisionService({ client });
            await decisionService.handleCallbackQuery(update.callback_query, ownerId);
            console.log("📤 Processed approval callback query.");
            continue;
          }

          if (update.message?.text) {
            const text = update.message.text.trim();
            const chatId = update.message.chat.id;

            console.log(`📩 Received message from owner: "${text}"`);

            if (text.startsWith("/")) {
              const reply = await handleTelegramCommand(text, { userId: ownerId });
              await client.sendMessage(chatId, reply);
              console.log(`📤 Dispatched command response for: ${text.split(" ")[0]}`);
            } else {
              const intakeService = new TelegramIntakeService();
              const activeSession = await intakeService.getActiveClarificationSession(ownerId);

              let reply: string;
              if (activeSession) {
                console.log(`💬 Processing clarification answer for task: ${activeSession.taskId}`);
                reply = await intakeService.handleClarificationAnswer(ownerId, text);
              } else {
                console.log("📝 Ingesting new task prompt...");
                reply = await intakeService.handleNewTaskPrompt(ownerId, text);
              }

              await client.sendMessage(chatId, reply);
              console.log("📤 Sent task intake / clarification response.");
            }
          }
        }
      } catch (pollErr) {
        if ((pollErr as Error).name !== "AbortError") {
          console.error("⚠️ Polling error:", (pollErr as Error).message);
        }
        // Wait 3 seconds before reconnecting
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } catch (err) {
    console.error("❌ Fatal error in Telegram polling runner:", (err as Error).message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
