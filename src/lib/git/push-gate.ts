import { execFileSync } from "child_process";
import { ApprovalRepository } from "../repositories/approval-repository";
import { TelegramApprovalService } from "../telegram/approvals";
import { validatePrePush } from "./push-validator";
import { PrePushValidationResult } from "./types";
import { Approval as DatabaseApproval } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { createAdminClient } from "../supabase/admin";

export interface PushApprovalRequest {
  testProof?: string;
  taskId?: string;
  notes?: string;
  telegramChatId?: string | number;
}

export interface PushRequestResult {
  success: boolean;
  approval: DatabaseApproval;
  validation: PrePushValidationResult;
}

export interface PushExecutionResult {
  success: boolean;
  pushedCommit: string;
  remoteRef: string;
  aheadCount: number;
  output: string;
  executedAt: string;
}

export interface PushGateServiceOptions {
  approvalRepo?: ApprovalRepository;
  telegramApprovalService?: TelegramApprovalService;
  supabaseClient?: SupabaseClient<Database>;
  gitExec?: (args: string[]) => string;
}

export class PushGateService {
  private approvalRepo: ApprovalRepository;
  private telegramApprovalService?: TelegramApprovalService;
  private supabaseClient?: SupabaseClient<Database>;
  private gitExec: (args: string[]) => string;

  constructor(options: PushGateServiceOptions = {}) {
    const supabase = options.supabaseClient ?? createAdminClient();
    this.approvalRepo =
      options.approvalRepo ?? new ApprovalRepository(supabase);
    this.telegramApprovalService = options.telegramApprovalService;
    this.supabaseClient = supabase;
    this.gitExec =
      options.gitExec ??
      ((args: string[]) =>
        execFileSync("git", args, {
          encoding: "utf-8",
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        }));
  }

  /**
   * Evaluates repository readiness and creates a pending approval record.
   * Dispatches an interactive approval card via Telegram if configured.
   */
  public async requestPushApproval(
    userId: string,
    request: PushApprovalRequest = {}
  ): Promise<PushRequestResult> {
    const validation = validatePrePush({ gitExec: this.gitExec });

    if (!validation.isReady) {
      throw new Error(
        `Pre-push validation failed:\n${validation.errors.join("\n")}`
      );
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    const approval = await this.approvalRepo.createApproval(userId, {
      actionType: "git_remote_push",
      targetResource: "origin/main",
      taskId: request.taskId,
      expiresAt,
      scope: {
        headCommitSha: validation.headCommitSha,
        headCommitMessage: validation.headCommitMessage,
        aheadCount: validation.aheadCount,
        behindCount: validation.behindCount,
        remoteRef: validation.remoteRef,
        commits: validation.commits,
        filesChanged: validation.filesChanged,
        testProof: request.testProof ?? null,
        notes: request.notes ?? null,
      },
    });

    const chatId =
      request.telegramChatId ??
      process.env.TELEGRAM_OWNER_CHAT_ID ??
      process.env.TELEGRAM_DEFAULT_CHAT_ID;

    if (this.telegramApprovalService && chatId) {
      try {
        await this.telegramApprovalService.sendActionCard(chatId, { approval });
      } catch (err) {
        console.error("Failed to dispatch Telegram push approval card:", err);
      }
    }

    return {
      success: true,
      approval,
      validation,
    };
  }

  /**
   * Executes git push origin main if and only if explicit human approval has been granted.
   * Strictly enforces safety invariants before executing.
   */
  public async executePush(
    approvalId: string,
    userId: string
  ): Promise<PushExecutionResult> {
    const approval = await this.approvalRepo.getById(approvalId, userId);

    if (!approval) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }

    if (approval.action_type !== "git_remote_push") {
      throw new Error(
        `Invalid action type '${approval.action_type}'. Expected 'git_remote_push'.`
      );
    }

    if (approval.status !== "approved") {
      throw new Error(
        `Push rejected: approval status is '${approval.status}'. Explicit human approval is required.`
      );
    }

    if (new Date(approval.expires_at) < new Date()) {
      throw new Error(
        `Push rejected: approval expired at ${approval.expires_at}.`
      );
    }

    // Safety re-validation: repository state must still be clean and locked to main
    const validation = validatePrePush({ gitExec: this.gitExec });
    if (!validation.isClean) {
      throw new Error(
        `Push rejected: working tree has uncommitted changes (${validation.errors.join(", ")}).`
      );
    }

    if (validation.activeBranch !== "main") {
      throw new Error(
        `Push rejected: active branch is '${validation.activeBranch}'. Only 'main' is permitted.`
      );
    }

    if (validation.aheadCount === 0) {
      throw new Error("Push rejected: no commits ahead of remote to push.");
    }

    let output = "";
    try {
      output = this.gitExec(["push", "origin", "main"]);
    } catch (err) {
      throw new Error(`git push origin main failed: ${(err as Error).message}`);
    }

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from("audit_events").insert({
          user_id: userId,
          event_type: "GIT_REMOTE_PUSH_EXECUTED",
          resource_type: "git_repository",
          resource_id: "origin/main",
          details: {
            approvalId,
            headCommitSha: validation.headCommitSha,
            aheadCount: validation.aheadCount,
            output: output.trim(),
          },
        });
      } catch (auditErr) {
        console.error("Failed to record push audit event:", auditErr);
      }
    }

    return {
      success: true,
      pushedCommit: validation.headCommitSha,
      remoteRef: "origin/main",
      aheadCount: validation.aheadCount,
      output: output.trim(),
      executedAt: new Date().toISOString(),
    };
  }
}
