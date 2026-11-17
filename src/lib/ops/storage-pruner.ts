import fs from "fs";
import path from "path";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { AuditLedgerService } from "../audit/audit-ledger";

export interface PruningOptions {
  retentionDays?: number;
  dryRun?: boolean;
  tempDirPaths?: string[];
  userId?: string;
}

export interface MaintenanceExecutionReport {
  success: boolean;
  timestamp: string;
  durationMs: number;
  isDryRun: boolean;
  artifactsPruned: number;
  bytesReclaimed: number;
  approvalsExpired: number;
  tempFilesCleaned: number;
  errors: string[];
}

export interface StoragePrunerDependencies {
  supabase?: SupabaseClient;
  auditLedger?: AuditLedgerService;
  cwd?: string;
}

export class StoragePruningService {
  private supabase?: SupabaseClient;
  private auditLedger?: AuditLedgerService;
  private cwd: string;

  constructor(deps?: StoragePrunerDependencies) {
    let sb = deps?.supabase;
    if (!sb) {
      try {
        sb = createAdminClient();
      } catch {
        // Fallback when admin client credentials are not configured in environment
      }
    }
    this.supabase = sb;
    this.auditLedger = deps?.auditLedger ?? (sb ? new AuditLedgerService(sb) : undefined);
    this.cwd = deps?.cwd ?? process.cwd();
  }

  /**
   * Prunes ephemeral artifacts older than retentionDays (default: 30 days).
   * Removes local files if they exist and removes the database records from `run_artifacts`.
   */
  public async pruneOldArtifacts(
    options: PruningOptions = {}
  ): Promise<{ prunedCount: number; bytesReclaimed: number; errors: string[] }> {
    const retentionDays = options.retentionDays ?? 30;
    const isDryRun = options.dryRun ?? false;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    const errors: string[] = [];

    let prunedCount = 0;
    let bytesReclaimed = 0;

    if (!this.supabase) {
      errors.push("Database client not available: Supabase environment variables missing");
      return { prunedCount, bytesReclaimed, errors };
    }

    try {
      let query = this.supabase
        .from("run_artifacts")
        .select("id, storage_path, file_size_bytes, created_at")
        .lt("created_at", cutoffIso);

      const { data: artifacts, error } = await query;

      if (error) {
        errors.push(`Failed to query run_artifacts: ${error.message}`);
        return { prunedCount, bytesReclaimed, errors };
      }

      if (!artifacts || artifacts.length === 0) {
        return { prunedCount: 0, bytesReclaimed: 0, errors };
      }

      const idsToDelete: string[] = [];

      for (const artifact of artifacts) {
        let size = Number(artifact.file_size_bytes) || 0;

        if (artifact.storage_path) {
          const filePath = path.isAbsolute(artifact.storage_path)
            ? artifact.storage_path
            : path.resolve(this.cwd, artifact.storage_path);

          try {
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              if (size === 0) {
                size = stat.size;
              }

              if (!isDryRun) {
                await fs.promises.unlink(filePath);
              }
            }
          } catch (fileErr) {
            const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
            errors.push(`Failed to delete file '${artifact.storage_path}': ${msg}`);
          }
        }

        bytesReclaimed += size;
        prunedCount++;
        idsToDelete.push(artifact.id);
      }

      if (!isDryRun && idsToDelete.length > 0) {
        const { error: deleteError } = await this.supabase
          .from("run_artifacts")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          errors.push(`Failed to delete database artifact records: ${deleteError.message}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Unexpected error during artifact pruning: ${msg}`);
    }

    return { prunedCount, bytesReclaimed, errors };
  }

  /**
   * Identifies pending approvals whose `expires_at` has passed, transitions them
   * to `expired`, and records tamper-evident audit ledger entries.
   */
  public async expireStaleApprovals(
    options: PruningOptions = {}
  ): Promise<{ expiredCount: number; errors: string[] }> {
    const isDryRun = options.dryRun ?? false;
    const nowIso = new Date().toISOString();
    const errors: string[] = [];
    let expiredCount = 0;

    if (!this.supabase) {
      errors.push("Database client not available: Supabase environment variables missing");
      return { expiredCount, errors };
    }

    try {
      let query = this.supabase
        .from("approvals")
        .select("id, user_id, action_type, target_resource, expires_at, status")
        .eq("status", "pending")
        .lt("expires_at", nowIso);

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }

      const { data: staleApprovals, error } = await query;

      if (error) {
        errors.push(`Failed to query stale approvals: ${error.message}`);
        return { expiredCount, errors };
      }

      if (!staleApprovals || staleApprovals.length === 0) {
        return { expiredCount: 0, errors };
      }

      for (const approval of staleApprovals) {
        if (!isDryRun) {
          const { error: updateError } = await this.supabase
            .from("approvals")
            .update({
              status: "expired",
              decided_at: nowIso,
              decision_reason: "Expired by automated maintenance retention policy",
            })
            .eq("id", approval.id);

          if (updateError) {
            errors.push(`Failed to expire approval ${approval.id}: ${updateError.message}`);
            continue;
          }

          if (this.auditLedger) {
            try {
              await this.auditLedger.recordEvent({
                userId: approval.user_id,
                eventType: "approval.expired",
                resourceType: "approval",
                resourceId: approval.id,
                details: {
                  action_type: approval.action_type,
                  target_resource: approval.target_resource,
                  expires_at: approval.expires_at,
                  expired_at: nowIso,
                  automated: true,
                },
              });
            } catch (auditErr) {
              const msg = auditErr instanceof Error ? auditErr.message : String(auditErr);
              errors.push(`Audit ledger failure for approval ${approval.id}: ${msg}`);
            }
          }
        }

        expiredCount++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Unexpected error during approval expiration: ${msg}`);
    }

    return { expiredCount, errors };
  }

  /**
   * Cleans ephemeral log files or scratch temporary directories.
   */
  public async pruneTemporaryLogs(
    options: PruningOptions = {}
  ): Promise<{ cleanedCount: number; bytesReclaimed: number; errors: string[] }> {
    const isDryRun = options.dryRun ?? false;
    const errors: string[] = [];
    let cleanedCount = 0;
    let bytesReclaimed = 0;

    const targetDirs = options.tempDirPaths && options.tempDirPaths.length > 0
      ? options.tempDirPaths
      : [path.join(this.cwd, ".tmp"), path.join(this.cwd, "tmp")];

    for (const rawDir of targetDirs) {
      const targetDir = path.isAbsolute(rawDir) ? rawDir : path.resolve(this.cwd, rawDir);

      if (!fs.existsSync(targetDir)) {
        continue;
      }

      try {
        const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile()) {
            const filePath = path.join(targetDir, entry.name);
            try {
              const stat = await fs.promises.stat(filePath);
              bytesReclaimed += stat.size;
              cleanedCount++;

              if (!isDryRun) {
                await fs.promises.unlink(filePath);
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              errors.push(`Failed to clean temp file '${filePath}': ${msg}`);
            }
          }
        }
      } catch (dirErr) {
        const msg = dirErr instanceof Error ? dirErr.message : String(dirErr);
        errors.push(`Failed to inspect temp directory '${targetDir}': ${msg}`);
      }
    }

    return { cleanedCount, bytesReclaimed, errors };
  }

  /**
   * Runs the complete maintenance lifecycle: artifact pruning, stale approval expiration,
   * and temp log cleanup. Aggregates results into a unified report.
   */
  public async runFullMaintenance(
    options: PruningOptions = {}
  ): Promise<MaintenanceExecutionReport> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const isDryRun = options.dryRun ?? false;
    const errors: string[] = [];

    const [artifactRes, approvalRes, tempRes] = await Promise.all([
      this.pruneOldArtifacts(options),
      this.expireStaleApprovals(options),
      this.pruneTemporaryLogs(options),
    ]);

    errors.push(...artifactRes.errors, ...approvalRes.errors, ...tempRes.errors);

    const totalBytesReclaimed = artifactRes.bytesReclaimed + tempRes.bytesReclaimed;
    const durationMs = Date.now() - startTime;
    const success = errors.length === 0;

    if (!isDryRun && (artifactRes.prunedCount > 0 || approvalRes.expiredCount > 0) && this.auditLedger) {
      try {
        await this.auditLedger.recordEvent({
          userId: options.userId ?? null,
          eventType: "system.maintenance_prune",
          resourceType: "system",
          resourceId: "storage-pruner",
          details: {
            artifactsPruned: artifactRes.prunedCount,
            bytesReclaimed: totalBytesReclaimed,
            approvalsExpired: approvalRes.expiredCount,
            tempFilesCleaned: tempRes.cleanedCount,
            retentionDays: options.retentionDays ?? 30,
            durationMs,
          },
        });
      } catch (auditErr) {
        const msg = auditErr instanceof Error ? auditErr.message : String(auditErr);
        errors.push(`Failed to record maintenance audit event: ${msg}`);
      }
    }

    return {
      success: errors.length === 0,
      timestamp,
      durationMs,
      isDryRun,
      artifactsPruned: artifactRes.prunedCount,
      bytesReclaimed: totalBytesReclaimed,
      approvalsExpired: approvalRes.expiredCount,
      tempFilesCleaned: tempRes.cleanedCount,
      errors,
    };
  }
}
