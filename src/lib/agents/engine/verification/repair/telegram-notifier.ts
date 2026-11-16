import { TelegramClient } from "../../../../telegram/client";
import { escapeMarkdownV2, bold, code, pre } from "../../../../telegram/format";
import { FailureDiagnostic } from "./types";
import { InlineKeyboardMarkup } from "../../../../telegram/types";

export interface TelegramRecoveryNotifierOptions {
  telegramClient?: TelegramClient;
}

export class TelegramRecoveryNotifier {
  private client: TelegramClient;

  constructor(options: TelegramRecoveryNotifierOptions = {}) {
    this.client = options.telegramClient ?? new TelegramClient();
  }

  public formatRecoveryCard(
    taskId: string,
    runId: string,
    diagnostic: FailureDiagnostic,
    strikeCount: number,
    rollbackSha?: string
  ): { text: string; replyMarkup: InlineKeyboardMarkup } {
    const lines: string[] = [];

    lines.push(`🚨 ${bold("Jarvis Bounded Repair Exhausted")}`);
    lines.push("");
    lines.push(`📋 ${bold("Task ID:")} ${code(taskId)}`);
    lines.push(`🏃 ${bold("Run ID:")} ${code(runId)}`);
    lines.push(`⚡ ${bold("Stage Failed:")} ${code(diagnostic.stage.toUpperCase())}`);
    lines.push(`🏷️ ${bold("Category:")} ${code(diagnostic.category)}`);
    lines.push(`💥 ${bold("Strikes Consumed:")} ${escapeMarkdownV2(String(strikeCount))}/3`);

    if (rollbackSha) {
      lines.push("");
      lines.push(
        `🛡️ ${bold("Safety Rollback:")} Workspace reverted to ${code(rollbackSha.slice(0, 7))}`
      );
    }

    lines.push("");
    lines.push(`📝 ${bold("Primary Diagnostic:")}`);
    lines.push(pre(diagnostic.primaryError.slice(0, 300)));

    if (diagnostic.affectedFiles.length > 0) {
      lines.push(
        `📂 ${bold("Affected Files:")} ${escapeMarkdownV2(diagnostic.affectedFiles.slice(0, 3).join(", "))}`
      );
    }

    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          {
            text: "🔄 Retry Task",
            callback_data: `task_retry:${taskId}`,
          },
          {
            text: "📋 View Failure Logs",
            callback_data: `run_logs:${runId}`,
          },
        ],
        [
          {
            text: "❌ Dismiss Alert",
            callback_data: `task_dismiss:${taskId}`,
          },
        ],
      ],
    };

    return {
      text: lines.join("\n"),
      replyMarkup,
    };
  }

  public async sendFailureAlert(
    chatId: string | number,
    taskId: string,
    runId: string,
    diagnostic: FailureDiagnostic,
    strikeCount: number,
    rollbackSha?: string
  ): Promise<boolean> {
    const card = this.formatRecoveryCard(
      taskId,
      runId,
      diagnostic,
      strikeCount,
      rollbackSha
    );

    try {
      await this.client.sendMessage(chatId, card.text, {
        parse_mode: "MarkdownV2",
        reply_markup: card.replyMarkup,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const telegramRecoveryNotifier = new TelegramRecoveryNotifier();
