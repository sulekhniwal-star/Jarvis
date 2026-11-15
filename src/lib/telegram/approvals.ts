import { Plan, Task, Approval } from "@/types/database";
import { InlineKeyboardMarkup, TelegramMessage } from "./types";
import { escapeMarkdownV2, bold, code } from "./format";
import { TelegramClient } from "./client";

export interface PlanApprovalCardData {
  plan: Plan;
  task?: Task;
  budgetImpact?: {
    estimatedCostUsd?: number;
    estimatedCostInr?: number;
  };
}

export interface ActionApprovalCardData {
  approval: Approval;
  task?: Task;
}

export type ApprovalDecisionType = "approved" | "rejected";

interface PlanRiskAssessment {
  overallRisk?: string;
  riskFactors?: string[];
  requiresHumanApproval?: boolean;
}

/**
 * Formats an execution plan into an interactive MarkdownV2 card with inline decision buttons.
 */
export function formatPlanApprovalCard(data: PlanApprovalCardData): {
  text: string;
  replyMarkup: InlineKeyboardMarkup;
} {
  const { plan, task, budgetImpact } = data;
  const taskTitle = task?.title ?? `Task ${plan.task_id}`;
  const steps = (plan.steps as Array<{ title?: string; id?: string }> | null) ?? [];
  const stepsCount = steps.length;
  const riskAssessment = plan.risk_assessment as unknown as PlanRiskAssessment | null;
  const riskLevel =
    riskAssessment?.overallRisk?.toUpperCase() ??
    task?.risk_level?.toUpperCase() ??
    "MEDIUM";

  const lines: string[] = [
    `🚨 ${bold("APPROVAL REQUIRED: Execution Plan")}`,
    "",
    `📋 ${bold("Task:")} ${escapeMarkdownV2(taskTitle)}`,
    `🆔 ${bold("Plan ID:")} ${code(plan.id)}`,
    `🔢 ${bold("Version:")} ${escapeMarkdownV2(plan.version?.toString() ?? "1")}`,
    `⚡ ${bold("Steps:")} ${escapeMarkdownV2(stepsCount.toString())} atomic steps`,
    `🛡️ ${bold("Risk Level:")} ${bold(riskLevel)}`,
  ];

  if (budgetImpact?.estimatedCostInr !== undefined) {
    lines.push(
      `💰 ${bold("Estimated Cost:")} ₹${escapeMarkdownV2(
        budgetImpact.estimatedCostInr.toFixed(2)
      )}`
    );
  }

  lines.push("");
  lines.push(escapeMarkdownV2("Please review and authorize execution:"));

  const replyMarkup: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Approve Plan", callback_data: `appr:plan:${plan.id}` },
        { text: "❌ Reject Plan", callback_data: `rejc:plan:${plan.id}` },
      ],
    ],
  };

  return {
    text: lines.join("\n"),
    replyMarkup,
  };
}

/**
 * Formats a sensitive action request into an interactive MarkdownV2 card with inline decision buttons.
 */
export function formatActionApprovalCard(data: ActionApprovalCardData): {
  text: string;
  replyMarkup: InlineKeyboardMarkup;
} {
  const { approval, task } = data;
  const actionTypeLabel = approval.action_type.replace(/_/g, " ").toUpperCase();
  const expiresAt = new Date(approval.expires_at).toUTCString();

  const lines: string[] = [
    `🚨 ${bold("APPROVAL REQUIRED: Sensitive Action")}`,
    "",
    `⚡ ${bold("Action:")} ${bold(actionTypeLabel)}`,
    `🎯 ${bold("Target:")} ${code(approval.target_resource)}`,
  ];

  if (task?.title) {
    lines.push(`📋 ${bold("Task:")} ${escapeMarkdownV2(task.title)}`);
  }

  lines.push(`⏳ ${bold("Expires:")} ${escapeMarkdownV2(expiresAt)}`);
  lines.push("");
  lines.push(escapeMarkdownV2("Do you authorize this operation?"));

  const replyMarkup: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `appr:act:${approval.id}` },
        { text: "❌ Reject", callback_data: `rejc:act:${approval.id}` },
      ],
    ],
  };

  return {
    text: lines.join("\n"),
    replyMarkup,
  };
}

/**
 * Formats an immutable decision receipt in MarkdownV2 to replace the interactive card in-place.
 */
export function formatDecisionReceipt(
  type: "plan" | "action",
  title: string,
  decision: ApprovalDecisionType,
  decidedAt: Date = new Date(),
  notes?: string
): string {
  const isApproved = decision === "approved";
  const headerIcon = isApproved ? "✅" : "❌";
  const statusLabel = isApproved ? "APPROVED" : "REJECTED";
  const timestampStr = decidedAt.toUTCString();

  const lines: string[] = [
    `${headerIcon} ${bold(`${type.toUpperCase()} ${statusLabel}`)}`,
    "",
    `📋 ${bold("Subject:")} ${escapeMarkdownV2(title)}`,
    `👤 ${bold("Decided By:")} Owner at ${escapeMarkdownV2(timestampStr)}`,
    `📊 ${bold("Final Status:")} ${bold(statusLabel)}`,
  ];

  if (notes) {
    lines.push(`📝 ${bold("Notes:")} ${escapeMarkdownV2(notes)}`);
  }

  if (isApproved && type === "plan") {
    lines.push("");
    lines.push(
      `🚀 ${bold("Next:")} ${escapeMarkdownV2(
        "Task transitioned to queued for autonomous execution."
      )}`
    );
  }

  return lines.join("\n");
}

/**
 * Service for delivering approval cards to the authorized owner via Telegram.
 */
export class TelegramApprovalService {
  private client: TelegramClient;

  constructor(client?: TelegramClient) {
    this.client = client ?? new TelegramClient();
  }

  public async sendPlanCard(
    chatId: number | string,
    data: PlanApprovalCardData
  ): Promise<TelegramMessage> {
    const { text, replyMarkup } = formatPlanApprovalCard(data);
    return this.client.sendMessage(chatId, text, {
      parse_mode: "MarkdownV2",
      reply_markup: replyMarkup,
    });
  }

  public async sendActionCard(
    chatId: number | string,
    data: ActionApprovalCardData
  ): Promise<TelegramMessage> {
    const { text, replyMarkup } = formatActionApprovalCard(data);
    return this.client.sendMessage(chatId, text, {
      parse_mode: "MarkdownV2",
      reply_markup: replyMarkup,
    });
  }
}
