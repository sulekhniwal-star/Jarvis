import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { processRegistry, ProcessCancellationRegistry } from "./process-registry";

export interface KillSwitchResult {
  success: boolean;
  durationMs: number;
  subSecondPerformanceAchieved: boolean;
  terminatedProcessesCount: number;
  cancelledRunsCount: number;
  cancelledTasksCount: number;
  revokedApprovalsCount: number;
  auditEventId?: string;
  timestamp: string;
  source: "web" | "telegram" | "api";
}

export interface KillSwitchStatus {
  activeProcessesCount: number;
  activeRunsCount: number;
  pendingApprovalsCount: number;
  lastEmergencyStop?: {
    timestamp: string;
    durationMs: number;
    source: string;
  } | null;
}

export interface EmergencyKillSwitchOptions {
  supabase?: SupabaseClient<Database>;
  registry?: ProcessCancellationRegistry;
}

export class EmergencyKillSwitchService {
  private readonly supabase?: SupabaseClient<Database>;
  private readonly registry: ProcessCancellationRegistry;

  constructor(options: EmergencyKillSwitchOptions = {}) {
    this.supabase = options.supabase;
    this.registry = options.registry ?? processRegistry;
  }

  /**
   * Executes the global emergency stop sequence across all local subprocesses,
   * database agent runs, tasks, and authorization approvals in < 1.0 second (NFR-PERF-03).
   */
  public async executeEmergencyStop(
    userId: string,
    source: "web" | "telegram" | "api" = "web"
  ): Promise<KillSwitchResult> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // 1. Terminate all active registered subprocess trees immediately (REQ-SEC-02)
    const terminationSummary = await this.registry.terminateAll("SIGKILL");

    let cancelledRunsCount = 0;
    let cancelledTasksCount = 0;
    let revokedApprovalsCount = 0;
    let auditEventId: string | undefined;

    // 2. Cascade state cancellations across Supabase if database client is available
    if (this.supabase) {
      try {
        const [runsRes, tasksRes, approvalsRes] = await Promise.all([
          // Cancel active agent runs
          this.supabase
            .from("agent_runs")
            .update({
              status: "failed",
              error_summary: "Emergency Stop: Process tree terminated by owner kill switch.",
              completed_at: timestamp,
            })
            .in("status", ["queued", "running", "verifying"])
            .select("id"),

          // Cancel in-flight or awaiting tasks
          this.supabase
            .from("tasks")
            .update({
              status: "cancelled",
              updated_at: timestamp,
            })
            .in("status", ["running", "verifying", "planned", "awaiting_approval"])
            .select("id"),

          // Revoke all pending approvals
          this.supabase
            .from("approvals")
            .update({
              status: "rejected",
              decision_reason: "Revoked by Emergency Kill Switch.",
              decided_at: timestamp,
            })
            .eq("status", "pending")
            .select("id"),
        ]);

        cancelledRunsCount = runsRes.data?.length ?? 0;
        cancelledTasksCount = tasksRes.data?.length ?? 0;
        revokedApprovalsCount = approvalsRes.data?.length ?? 0;

        // 3. Log immutable emergency stop event to audit_events (REQ-AUD-01 baseline)
        const auditRes = await this.supabase
          .from("audit_events")
          .insert({
            user_id: userId,
            event_type: "EMERGENCY_KILL_SWITCH_ACTIVATED",
            resource_type: "system",
            resource_id: "global",
            details: {
              source,
              terminatedProcesses: terminationSummary.terminatedCount,
              pids: terminationSummary.pids,
              cancelledRuns: cancelledRunsCount,
              cancelledTasks: cancelledTasksCount,
              revokedApprovals: revokedApprovalsCount,
              timestamp,
            },
          })
          .select("id")
          .single();

        auditEventId = auditRes.data?.id;
      } catch (dbErr) {
        console.error(
          "[EmergencyKillSwitchService] Database cascade update warning:",
          dbErr
        );
      }
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    const subSecondPerformanceAchieved = durationMs < 1000.0;

    return {
      success: true,
      durationMs,
      subSecondPerformanceAchieved,
      terminatedProcessesCount: terminationSummary.terminatedCount,
      cancelledRunsCount,
      cancelledTasksCount,
      revokedApprovalsCount,
      auditEventId,
      timestamp,
      source,
    };
  }

  /**
   * Retrieves current system readiness and active process status.
   */
  public async getKillSwitchStatus(userId: string): Promise<KillSwitchStatus> {
    const activeProcessesCount = this.registry.getActiveProcesses().length;
    let activeRunsCount = 0;
    let pendingApprovalsCount = 0;
    let lastEmergencyStop: KillSwitchStatus["lastEmergencyStop"] = null;

    if (this.supabase) {
      try {
        const [runsRes, approvalsRes, auditRes] = await Promise.all([
          this.supabase
            .from("agent_runs")
            .select("id", { count: "exact", head: true })
            .in("status", ["queued", "running", "verifying"]),

          this.supabase
            .from("approvals")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .eq("user_id", userId),

          this.supabase
            .from("audit_events")
            .select("created_at, details")
            .eq("event_type", "EMERGENCY_KILL_SWITCH_ACTIVATED")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        activeRunsCount = runsRes.count ?? 0;
        pendingApprovalsCount = approvalsRes.count ?? 0;

        if (auditRes.data) {
          const details = auditRes.data.details as Record<string, any>;
          lastEmergencyStop = {
            timestamp: auditRes.data.created_at,
            durationMs: details?.durationMs ?? 0,
            source: details?.source ?? "unknown",
          };
        }
      } catch {
        // Fallback to local counts
      }
    }

    return {
      activeProcessesCount,
      activeRunsCount,
      pendingApprovalsCount,
      lastEmergencyStop,
    };
  }
}
