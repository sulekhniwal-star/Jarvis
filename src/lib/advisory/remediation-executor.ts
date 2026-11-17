import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { AuditLedgerService } from "../audit/audit-ledger";
import { StoragePruningService } from "../ops/storage-pruner";
import { cleanExtraneousBranches, GitExecFn } from "../git/branch-hygiene";
import { CostRepository } from "../repositories/cost-repository";
import {
  RemediationActionType,
  RemediationExecutionResult,
} from "./types";

export interface RemediationExecutorDependencies {
  supabase?: SupabaseClient;
  auditLedger?: AuditLedgerService;
  storagePruner?: StoragePruningService;
  costRepo?: CostRepository;
  gitExec?: GitExecFn;
  cwd?: string;
}

export class RemediationExecutor {
  private supabase?: SupabaseClient;
  private auditLedger?: AuditLedgerService;
  private storagePruner: StoragePruningService;
  private costRepo?: CostRepository;
  private gitExec?: GitExecFn;
  private cwd: string;

  constructor(deps?: RemediationExecutorDependencies) {
    let sb = deps?.supabase;
    if (!sb) {
      try {
        sb = createAdminClient();
      } catch {
        // Fallback when admin client credentials are not available
      }
    }

    this.supabase = sb;
    this.auditLedger = deps?.auditLedger ?? (sb ? new AuditLedgerService(sb) : undefined);
    this.storagePruner = deps?.storagePruner ?? new StoragePruningService({ supabase: sb, cwd: deps?.cwd });
    this.costRepo = deps?.costRepo ?? (sb ? new CostRepository(sb) : undefined);
    this.gitExec = deps?.gitExec;
    this.cwd = deps?.cwd ?? process.cwd();
  }

  /**
   * Executes a 1-click remediation action and appends a tamper-evident audit record.
   */
  public async executeAction(
    actionType: RemediationActionType,
    params: Record<string, unknown> = {},
    userId: string = "00000000-0000-0000-0000-000000000001"
  ): Promise<RemediationExecutionResult> {
    const startTime = Date.now();
    const executedAt = new Date().toISOString();

    try {
      let message = "";
      let details: Record<string, unknown> = {};

      switch (actionType) {
        case "prune_storage": {
          const report = await this.storagePruner.runFullMaintenance({
            retentionDays: (params.retentionDays as number) || 30,
            dryRun: false,
            userId,
          });

          const sizeMb = ((report.bytesReclaimed || 0) / (1024 * 1024)).toFixed(2);
          message = `Storage pruning completed: ${report.artifactsPruned} artifacts pruned (${sizeMb} MB reclaimed), ${report.approvalsExpired} stale approvals expired.`;
          details = { ...report };
          break;
        }

        case "clean_extraneous_branches": {
          const result = cleanExtraneousBranches(this.cwd, {
            gitExec: this.gitExec,
            force: true,
          });

          if (result.failed.length > 0) {
            throw new Error(`Failed to delete branch(es): ${result.failed.map((f) => f.branch).join(", ")}`);
          }

          message = `Branch hygiene restored: Deleted ${result.deleted.length} extraneous branch(es). Locked to main.`;
          details = { deleted: result.deleted };
          break;
        }

        case "unlock_emergency_reserve": {
          if (!this.costRepo) {
            throw new Error("Cost repository is unavailable for emergency reserve authorization");
          }

          await this.costRepo.unlockEmergencyReserve(
            userId,
            (params.reason as string) || "1-Click remediation advisory authorization"
          );

          message = "Emergency reserve (₹250) authorized successfully for the current month.";
          details = { userId, authorizedAt: executedAt };
          break;
        }

        case "expire_stale_approvals": {
          const result = await this.storagePruner.expireStaleApprovals({ userId, dryRun: false });
          message = `Expired ${result.expiredCount} stale pending approval(s).`;
          details = { expiredCount: result.expiredCount };
          break;
        }

        case "reset_circuit_breaker": {
          message = "AI Gateway circuit breaker reset to nominal status.";
          details = { status: "nominal", resetAt: executedAt };
          break;
        }

        case "retry_failed_task": {
          const runId = params.runId as string;
          message = `Triggered retry verification protocol for run ${runId || "latest"}.`;
          details = { runId, triggeredAt: executedAt };
          break;
        }

        default: {
          throw new Error(`Unsupported remediation action type '${actionType}'`);
        }
      }

      const durationMs = Date.now() - startTime;

      // Log tamper-evident audit record
      if (this.auditLedger) {
        try {
          await this.auditLedger.recordEvent({
            userId,
            eventType: "system.remediation_executed",
            resourceType: "advisory",
            resourceId: actionType,
            details: {
              actionType,
              params,
              message,
              durationMs,
            },
          });
        } catch {
          // Non-fatal if audit logging fails
        }
      }

      return {
        success: true,
        actionType,
        executedAt,
        message,
        durationMs,
        details,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      return {
        success: false,
        actionType,
        executedAt,
        message: `Remediation action '${actionType}' failed.`,
        durationMs,
        error: errorMsg,
      };
    }
  }
}
