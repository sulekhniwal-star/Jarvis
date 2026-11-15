import { TelegramCallbackQuery } from "./types";
import { TelegramClient } from "./client";
import { PlanRepository } from "../repositories/plan-repository";
import { ApprovalRepository } from "../repositories/approval-repository";
import { TaskRepository } from "../repositories/task-repository";
import { PushGateService } from "../git/push-gate";
import { createAdminClient } from "../supabase/admin";
import { formatDecisionReceipt, ApprovalDecisionType } from "./approvals";
import { bold, code } from "./format";

export interface DecisionDependencies {
  client?: TelegramClient;
  planRepo?: PlanRepository;
  approvalRepo?: ApprovalRepository;
  taskRepo?: TaskRepository;
  pushGateService?: PushGateService;
}

export interface DecisionResult {
  success: boolean;
  message: string;
}

/**
 * Service to process Telegram callback queries from interactive approval cards,
 * execute durable database state transitions, and edit messages in-place.
 */
export class TelegramDecisionService {
  private client: TelegramClient;
  private planRepo: PlanRepository;
  private approvalRepo: ApprovalRepository;
  private taskRepo: TaskRepository;
  private pushGateService: PushGateService;

  constructor(deps?: DecisionDependencies) {
    this.client = deps?.client ?? new TelegramClient();

    if (deps?.planRepo && deps?.approvalRepo && deps?.taskRepo) {
      this.planRepo = deps.planRepo;
      this.approvalRepo = deps.approvalRepo;
      this.taskRepo = deps.taskRepo;
    } else {
      const supabase = createAdminClient();
      this.planRepo = deps?.planRepo ?? new PlanRepository(supabase);
      this.approvalRepo = deps?.approvalRepo ?? new ApprovalRepository(supabase);
      this.taskRepo = deps?.taskRepo ?? new TaskRepository(supabase);
    }

    this.pushGateService =
      deps?.pushGateService ??
      new PushGateService({ approvalRepo: this.approvalRepo });
  }

  /**
   * Processes a callback_query event from an interactive Telegram inline button.
   */
  public async handleCallbackQuery(
    callbackQuery: TelegramCallbackQuery,
    userId: string
  ): Promise<DecisionResult> {
    // 1. Instant acknowledgment to clear Telegram client spinner
    try {
      await this.client.answerCallbackQuery(
        callbackQuery.id,
        "Processing decision..."
      );
    } catch (err) {
      console.warn(
        `[TelegramDecisionService] Could not answer callback query ${callbackQuery.id}:`,
        err
      );
    }

    if (!callbackQuery.data) {
      return { success: false, message: "Empty callback data." };
    }

    // Expected pattern: appr:plan:<uuid> | rejc:plan:<uuid> | appr:act:<uuid> | rejc:act:<uuid>
    const match = callbackQuery.data.match(
      /^(appr|rejc):(plan|act):([0-9a-fA-F-]+)$/
    );

    if (!match) {
      return {
        success: false,
        message: `Unrecognized callback data format: ${callbackQuery.data}`,
      };
    }

    const [, actionPrefix, targetType, targetId] = match;
    const decision: ApprovalDecisionType =
      actionPrefix === "appr" ? "approved" : "rejected";

    if (targetType === "plan") {
      return this.processPlanDecision(
        targetId!,
        decision,
        callbackQuery
      );
    } else {
      return this.processActionDecision(
        targetId!,
        decision,
        callbackQuery,
        userId
      );
    }
  }

  /**
   * Handles plan approval or rejection via callback query.
   */
  private async processPlanDecision(
    planId: string,
    decision: ApprovalDecisionType,
    callbackQuery: TelegramCallbackQuery
  ): Promise<DecisionResult> {
    const plan = await this.planRepo.getById(planId).catch(() => null);

    if (!plan) {
      return {
        success: false,
        message: `Execution plan '${planId}' not found.`,
      };
    }

    // Idempotency: verify plan is pending approval
    if (plan.status !== "pending_approval") {
      if (callbackQuery.message) {
        const alreadyText = `⚠️ ${bold("ALREADY DECIDED")}\n\nThis execution plan has already been ${bold(
          plan.status
        )}.`;

        await this.client.editMessageText(
          callbackQuery.message.chat.id,
          callbackQuery.message.message_id,
          alreadyText,
          {
            parse_mode: "MarkdownV2",
            reply_markup: { inline_keyboard: [] },
          }
        );
      }
      return {
        success: false,
        message: `Plan has already been ${plan.status}.`,
      };
    }

    // Execute state transitions
    await this.planRepo.updateStatus(planId, decision);

    if (decision === "approved") {
      await this.taskRepo.update(plan.task_id, { status: "running" });
    }

    const task = await this.taskRepo.getById(plan.task_id).catch(() => null);
    const title = task?.title ?? `Task ${plan.task_id}`;

    // Edit Telegram message in-place to display immutable decision receipt
    if (callbackQuery.message) {
      const receipt = formatDecisionReceipt("plan", title, decision, new Date());
      await this.client.editMessageText(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        receipt,
        {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [] },
        }
      );
    }

    return {
      success: true,
      message: `Plan ${planId} ${decision}.`,
    };
  }

  /**
   * Handles sensitive action approval or rejection via callback query.
   */
  private async processActionDecision(
    approvalId: string,
    decision: ApprovalDecisionType,
    callbackQuery: TelegramCallbackQuery,
    userId: string
  ): Promise<DecisionResult> {
    const approval = await this.approvalRepo
      .getById(approvalId, userId)
      .catch(() => null);

    if (!approval) {
      return {
        success: false,
        message: `Approval request '${approvalId}' not found.`,
      };
    }

    // Idempotency: verify approval is pending
    if (approval.status !== "pending") {
      if (callbackQuery.message) {
        const alreadyText = `⚠️ ${bold("ALREADY DECIDED")}\n\nThis approval request has already been ${bold(
          approval.status
        )}.`;

        await this.client.editMessageText(
          callbackQuery.message.chat.id,
          callbackQuery.message.message_id,
          alreadyText,
          {
            parse_mode: "MarkdownV2",
            reply_markup: { inline_keyboard: [] },
          }
        );
      }
      return {
        success: false,
        message: `Approval request has already been ${approval.status}.`,
      };
    }

    // Record decision in database
    await this.approvalRepo.recordDecision(
      approvalId,
      userId,
      decision,
      "Decided via Telegram inline card"
    );

    let pushNote = "";
    if (decision === "approved" && approval.action_type === "git_remote_push") {
      try {
        const pushResult = await this.pushGateService.executePush(approvalId, userId);
        pushNote = `Pushed ${pushResult.pushedCommit.substring(0, 7)} to origin/main`;
      } catch (pushErr) {
        pushNote = `Push failed: ${(pushErr as Error).message}`;
      }
    }

    // Edit Telegram message in-place
    if (callbackQuery.message) {
      const receipt = formatDecisionReceipt(
        "action",
        approval.action_type,
        decision,
        new Date(),
        pushNote || undefined
      );

      await this.client.editMessageText(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        receipt,
        {
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [] },
        }
      );
    }

    return {
      success: true,
      message: `Approval ${approvalId} ${decision}.`,
    };
  }

  /**
   * Handles CLI fallback commands: /approve <id> and /reject <id> [reason].
   */
  public async handleCliDecision(
    command: "approve" | "reject",
    targetId: string,
    userId: string,
    reason?: string
  ): Promise<string> {
    const decision: ApprovalDecisionType =
      command === "approve" ? "approved" : "rejected";

    // 1. Try finding sensitive approval record first
    const approval = await this.approvalRepo
      .getById(targetId, userId)
      .catch(() => null);

    if (approval) {
      if (approval.status !== "pending") {
        return `⚠️ ${bold("Already Decided:")} Approval request ${code(
          targetId
        )} is already ${bold(approval.status)}.`;
      }

      await this.approvalRepo.recordDecision(
        targetId,
        userId,
        decision,
        reason ?? "Decided via Telegram CLI"
      );

      let pushNote = reason;
      if (decision === "approved" && approval.action_type === "git_remote_push") {
        try {
          const pushResult = await this.pushGateService.executePush(targetId, userId);
          pushNote = pushNote
            ? `${pushNote} (Pushed ${pushResult.pushedCommit.substring(0, 7)} to origin/main)`
            : `Pushed ${pushResult.pushedCommit.substring(0, 7)} to origin/main`;
        } catch (pushErr) {
          pushNote = pushNote
            ? `${pushNote} (Push failed: ${(pushErr as Error).message})`
            : `Push failed: ${(pushErr as Error).message}`;
        }
      }

      return formatDecisionReceipt(
        "action",
        approval.action_type,
        decision,
        new Date(),
        pushNote
      );
    }

    // 2. Try finding execution plan record
    const plan = await this.planRepo.getById(targetId).catch(() => null);

    if (plan) {
      if (plan.status !== "pending_approval") {
        return `⚠️ ${bold("Already Decided:")} Execution plan ${code(
          targetId
        )} is already ${bold(plan.status)}.`;
      }

      await this.planRepo.updateStatus(targetId, decision);

      if (decision === "approved") {
        await this.taskRepo.update(plan.task_id, { status: "running" });
      }

      const task = await this.taskRepo.getById(plan.task_id).catch(() => null);
      return formatDecisionReceipt(
        "plan",
        task?.title ?? plan.task_id,
        decision,
        new Date(),
        reason
      );
    }

    return `❌ ${bold("Target Not Found:")} No pending plan or approval request found with ID ${code(
      targetId
    )}.`;
  }
}
