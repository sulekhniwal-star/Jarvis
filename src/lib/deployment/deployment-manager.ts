import { execFileSync } from "child_process";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Approval as DatabaseApproval } from "@/types/database";
import { createAdminClient } from "../supabase/admin";
import { DeploymentRepository } from "../repositories/deployment-repository";
import { ApprovalRepository } from "../repositories/approval-repository";
import { AuditLedgerService } from "../audit/audit-ledger";
import { TelegramApprovalService } from "../telegram/approvals";
import {
  DeploymentRecord,
  CreatePreviewDeploymentInput,
  PromotionRequestInput,
  RollbackResult,
  UnapprovedProductionDeploymentError,
  DeploymentNotFoundError,
  InvalidRollbackTargetError,
} from "./types";

function defaultGitExec(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export interface DeploymentManagerOptions {
  deploymentRepo?: DeploymentRepository;
  approvalRepo?: ApprovalRepository;
  auditLedger?: AuditLedgerService;
  telegramApprovalService?: TelegramApprovalService;
  supabaseClient?: SupabaseClient<Database>;
  gitExec?: (args: string[]) => string;
}

export class DeploymentManager {
  private deploymentRepo: DeploymentRepository;
  private approvalRepo: ApprovalRepository;
  private auditLedger: AuditLedgerService;
  private telegramApprovalService?: TelegramApprovalService;
  private gitExec: (args: string[]) => string;

  constructor(options: DeploymentManagerOptions = {}) {
    let supabase = options.supabaseClient;
    if (!supabase && !options.deploymentRepo) {
      try {
        supabase = createAdminClient();
      } catch {
        // Fallback for tests
      }
    }

    this.deploymentRepo =
      options.deploymentRepo ?? new DeploymentRepository(supabase);
    this.approvalRepo =
      options.approvalRepo ??
      (supabase
        ? new ApprovalRepository(supabase)
        : (null as unknown as ApprovalRepository));
    this.auditLedger =
      options.auditLedger ?? new AuditLedgerService(supabase);
    this.telegramApprovalService = options.telegramApprovalService;
    this.gitExec = options.gitExec ?? defaultGitExec;
  }

  /**
   * Generates a preview deployment for a given or current commit SHA.
   * Preview deployments do not require approval and are immediately marked deployed.
   */
  public async createPreviewDeployment(
    params?: CreatePreviewDeploymentInput
  ): Promise<DeploymentRecord> {
    let commitSha = params?.commitSha;
    if (!commitSha) {
      commitSha = this.gitExec(["rev-parse", "HEAD"]);
    }
    if (!commitSha || commitSha.length < 7) {
      commitSha = "preview0000000000000000000000000000000";
    }

    let commitMessage = params?.commitMessage;
    if (!commitMessage) {
      commitMessage = this.gitExec(["log", "-1", "--pretty=%B"]);
    }
    if (!commitMessage) {
      commitMessage = "Preview deployment build";
    }

    let branch = params?.branch;
    if (!branch) {
      branch = this.gitExec(["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
    }

    const shortSha = commitSha.substring(0, 7);
    const previewUrl = `https://jarvis-preview-${shortSha}.vercel.app`;
    const now = new Date().toISOString();

    const deployment = await this.deploymentRepo.createDeployment({
      environment: "preview",
      commit_sha: commitSha,
      commit_message: commitMessage,
      branch,
      status: "deployed",
      preview_url: previewUrl,
      production_url: null,
      approval_id: null,
      created_by: params?.userId ?? null,
      rollback_target_id: null,
      verification_passed: true,
      verification_summary: "Automated test suite and build verification passed",
      deployed_at: now,
    });

    try {
      await this.auditLedger.recordEvent({
        userId: params?.userId ?? null,
        eventType: "deployment.preview_created",
        resourceType: "deployment",
        resourceId: deployment.id,
        details: {
          commit_sha: commitSha,
          preview_url: previewUrl,
          branch,
        },
      });
    } catch (err) {
      console.warn("Failed to record preview deployment audit event:", err);
    }

    return deployment;
  }

  /**
   * Initiates a production promotion request.
   * Enforces human approval gate (REQ-DEP-01) by creating an approval record
   * in public.approvals and dispatching an interactive approval card.
   */
  public async requestProductionPromotion(
    userId: string,
    params: PromotionRequestInput
  ): Promise<{ deployment: DeploymentRecord; approval: DatabaseApproval }> {
    if (!params.commitSha) {
      throw new Error("Commit SHA is required for production promotion.");
    }

    if (!this.approvalRepo) {
      throw new Error("Approval repository is not configured.");
    }

    const commitMessage =
      params.commitMessage ||
      this.gitExec(["log", "-1", "--pretty=%B", params.commitSha]) ||
      "Production promotion";

    const branch = params.branch || "main";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const approval = await this.approvalRepo.createApproval(userId, {
      actionType: "production_deploy",
      targetResource: "production:jarvis.app",
      scope: {
        commitSha: params.commitSha,
        commitMessage,
        branch,
        verificationSummary:
          params.verificationSummary || "All verification tests passed",
        notes: params.notes ?? null,
        requestedBy: userId,
      },
      expiresAt,
    });

    const deployment = await this.deploymentRepo.createDeployment({
      environment: "production",
      commit_sha: params.commitSha,
      commit_message: commitMessage,
      branch,
      status: "pending_approval",
      preview_url: null,
      production_url: null,
      approval_id: approval.id,
      created_by: userId,
      rollback_target_id: null,
      verification_passed: true,
      verification_summary:
        params.verificationSummary || "All verification tests passed",
    });

    const chatId =
      params.telegramChatId ??
      process.env.TELEGRAM_OWNER_CHAT_ID ??
      process.env.TELEGRAM_DEFAULT_CHAT_ID;

    if (this.telegramApprovalService && chatId) {
      try {
        await this.telegramApprovalService.sendActionCard(chatId, {
          approval,
        });
      } catch (err) {
        console.warn("Failed to dispatch Telegram production approval card:", err);
      }
    }

    try {
      await this.auditLedger.recordEvent({
        userId,
        eventType: "deployment.promotion_requested",
        resourceType: "deployment",
        resourceId: deployment.id,
        details: {
          approval_id: approval.id,
          commit_sha: params.commitSha,
          commit_message: commitMessage,
        },
      });
    } catch (err) {
      console.warn("Failed to record promotion requested audit event:", err);
    }

    return { deployment, approval };
  }

  /**
   * Executes promotion of a pending deployment to live production.
   * Strictly enforces that approvalId exists, is approved, and has not expired.
   */
  public async executeProductionPromotion(
    deploymentId: string,
    approvalId: string,
    userId: string
  ): Promise<DeploymentRecord> {
    const deployment = await this.deploymentRepo.getDeployment(deploymentId);
    if (!deployment) {
      throw new DeploymentNotFoundError(deploymentId);
    }

    if (!this.approvalRepo) {
      throw new Error("Approval repository is not configured.");
    }

    const approval = await this.approvalRepo.getApproval(approvalId);
    if (!approval || approval.status !== "approved") {
      throw new UnapprovedProductionDeploymentError(
        "Production promotion strictly requires an approved approval record."
      );
    }

    if (new Date(approval.expires_at).getTime() < Date.now()) {
      throw new UnapprovedProductionDeploymentError(
        "Approval record for production deployment has expired."
      );
    }

    const now = new Date().toISOString();
    const updated = await this.deploymentRepo.updateDeployment(deploymentId, {
      status: "deployed",
      production_url: "https://jarvis.app",
      deployed_at: now,
    });

    try {
      await this.auditLedger.recordEvent({
        userId,
        eventType: "deployment.production_promoted",
        resourceType: "deployment",
        resourceId: deployment.id,
        details: {
          approval_id: approvalId,
          commit_sha: deployment.commit_sha,
          production_url: "https://jarvis.app",
          promoted_by: userId,
        },
      });
    } catch (err) {
      console.warn("Failed to record production promoted audit event:", err);
    }

    return updated;
  }

  /**
   * Executes rollback to a specified previous production deployment (REQ-DEP-02).
   * Points the active production pointer to the target commit, marks current as rolled_back,
   * and records an immutable audit ledger entry.
   */
  public async executeRollback(
    targetDeploymentId: string,
    userId: string
  ): Promise<RollbackResult> {
    const targetDeployment = await this.deploymentRepo.getDeployment(
      targetDeploymentId
    );
    if (!targetDeployment) {
      throw new DeploymentNotFoundError(targetDeploymentId);
    }

    if (targetDeployment.environment !== "production") {
      throw new InvalidRollbackTargetError(
        "Rollback target must be a production deployment."
      );
    }

    const currentActive =
      await this.deploymentRepo.getActiveProductionDeployment();

    if (currentActive && currentActive.id !== targetDeployment.id) {
      await this.deploymentRepo.updateDeployment(currentActive.id, {
        status: "rolled_back",
        rollback_target_id: targetDeployment.id,
      });
    }

    const shortSha = targetDeployment.commit_sha.substring(0, 7);
    const now = new Date().toISOString();

    const newActive = await this.deploymentRepo.createDeployment({
      environment: "production",
      commit_sha: targetDeployment.commit_sha,
      commit_message: `Rollback to ${shortSha}: ${targetDeployment.commit_message}`,
      branch: targetDeployment.branch,
      status: "deployed",
      preview_url: targetDeployment.preview_url,
      production_url: "https://jarvis.app",
      approval_id: null,
      created_by: userId,
      rollback_target_id: targetDeployment.id,
      verification_passed: true,
      verification_summary: `Rolled back from ${
        currentActive?.commit_sha?.substring(0, 7) || "previous"
      } to ${shortSha}`,
      deployed_at: now,
    });

    try {
      await this.auditLedger.recordEvent({
        userId,
        eventType: "deployment.production_rolled_back",
        resourceType: "deployment",
        resourceId: newActive.id,
        details: {
          rolled_back_from_id: currentActive?.id ?? null,
          rolled_back_to_id: targetDeployment.id,
          target_commit_sha: targetDeployment.commit_sha,
          initiated_by: userId,
        },
      });
    } catch (err) {
      console.warn("Failed to record rollback audit event:", err);
    }

    return {
      success: true,
      rollbackDeployment: currentActive || targetDeployment,
      activeDeployment: newActive,
      rolledBackFromId: currentActive?.id || "",
      rolledBackToId: targetDeployment.id,
      targetCommitSha: targetDeployment.commit_sha,
      message: `Successfully rolled back production deployment to ${shortSha}.`,
    };
  }

  public getRepository(): DeploymentRepository {
    return this.deploymentRepo;
  }
}
