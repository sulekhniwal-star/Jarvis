import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { CostRepository } from "../repositories/cost-repository";
import { AgentRunRepository } from "../repositories/agent-run-repository";
import { TaskRepository } from "../repositories/task-repository";
import { ApprovalRepository } from "../repositories/approval-repository";
import { SystemHealthDiagnosticService } from "../ops/health-checker";
import { StoragePruningService } from "../ops/storage-pruner";
import { auditBranchHygiene, GitExecFn } from "../git/branch-hygiene";
import {
  MaintenanceRecommendation,
  AdvisoryReport,
  RecommendationSeverity,
} from "./types";

export interface AdvisoryEngineDependencies {
  costRepo?: CostRepository;
  agentRunRepo?: AgentRunRepository;
  taskRepo?: TaskRepository;
  approvalRepo?: ApprovalRepository;
  healthService?: SystemHealthDiagnosticService;
  storagePruner?: StoragePruningService;
  gitExec?: GitExecFn;
  supabase?: SupabaseClient;
  cwd?: string;
}

export class ProactiveAdvisoryEngine {
  private costRepo?: CostRepository;
  private agentRunRepo?: AgentRunRepository;
  private taskRepo?: TaskRepository;
  private approvalRepo?: ApprovalRepository;
  private healthService?: SystemHealthDiagnosticService;
  private storagePruner?: StoragePruningService;
  private gitExec?: GitExecFn;
  private cwd: string;

  constructor(deps?: AdvisoryEngineDependencies) {
    let sb = deps?.supabase;
    if (!sb) {
      try {
        sb = createAdminClient();
      } catch {
        // Fallback when admin client credentials are not available
      }
    }

    this.costRepo = deps?.costRepo ?? (sb ? new CostRepository(sb) : undefined);
    this.agentRunRepo = deps?.agentRunRepo ?? (sb ? new AgentRunRepository(sb) : undefined);
    this.taskRepo = deps?.taskRepo ?? (sb ? new TaskRepository(sb) : undefined);
    this.approvalRepo = deps?.approvalRepo ?? (sb ? new ApprovalRepository(sb) : undefined);
    this.healthService = deps?.healthService ?? (sb ? new SystemHealthDiagnosticService({ supabaseClient: sb as any }) : undefined);
    this.storagePruner = deps?.storagePruner ?? new StoragePruningService({ supabase: sb });
    this.gitExec = deps?.gitExec;
    this.cwd = deps?.cwd ?? process.cwd();
  }

  /**
   * Detects budget caps, high spending burn, or tripped circuit breakers.
   */
  public async detectCostAnomalies(userId: string): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    if (!this.costRepo) return recommendations;

    try {
      const summary = await this.costRepo.getSpendSummary(userId);
      const now = new Date().toISOString();

      if (summary.circuitBreakerStatus === "hard_locked") {
        recommendations.push({
          id: `cost-hard-locked-${Date.now()}`,
          category: "cost_budget",
          severity: "critical",
          title: "Hard Monthly Ceiling Reached (₹1,000)",
          description: "Inviolable absolute monthly spending ceiling has been reached. All paid inference is locked.",
          rationale: "Enforces financial safeguards to prevent uncontrollable AI expenditure.",
          detectedAt: now,
        });
      } else if (summary.circuitBreakerStatus === "tripped_monthly") {
        recommendations.push({
          id: `cost-tripped-monthly-${Date.now()}`,
          category: "cost_budget",
          severity: "critical",
          title: "Monthly Budget Limit Tripped (₹500)",
          description: `Monthly spend of ₹${summary.monthSpendInr.toFixed(2)} exceeded baseline ceiling. Paid calls paused.`,
          rationale: "Emergency reserve authorization required to resume paid model usage.",
          detectedAt: now,
          remediation: {
            type: "unlock_emergency_reserve",
            label: "Authorize Emergency Reserve (₹250)",
            description: "Unlocks the ₹250 emergency reserve for the remainder of the calendar month.",
            endpoint: "/api/costs/emergency-reserve",
          },
        });
      } else if (summary.circuitBreakerStatus === "tripped_daily") {
        recommendations.push({
          id: `cost-tripped-daily-${Date.now()}`,
          category: "cost_budget",
          severity: "critical",
          title: "Daily Spending Limit Tripped (₹100)",
          description: `Daily spend of ₹${summary.todaySpendInr.toFixed(2)} reached the daily safety cap.`,
          rationale: "Prevents runaway spend loops from active automated agents.",
          detectedAt: now,
          remediation: {
            type: "unlock_emergency_reserve",
            label: "Unlock Emergency Reserve",
            description: "Authorize emergency headroom to continue development today.",
            endpoint: "/api/costs/emergency-reserve",
          },
        });
      } else if (summary.todaySpendInr >= summary.dailyLimitInr * 0.8) {
        recommendations.push({
          id: `cost-warning-80-${Date.now()}`,
          category: "cost_budget",
          severity: "warning",
          title: "Daily Budget Approaching Cap (80%+)",
          description: `Today's spend of ₹${summary.todaySpendInr.toFixed(2)} is near the daily limit of ₹${summary.dailyLimitInr.toFixed(2)}.`,
          rationale: "Proactive alert allows workload planning before automated circuit breaking.",
          detectedAt: now,
        });
      }
    } catch {
      // Graceful fallback on inspection error
    }

    return recommendations;
  }

  /**
   * Detects high model latencies or circuit breaker trips on AI services.
   */
  public async detectModelDegradation(): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    if (!this.healthService) return recommendations;

    try {
      const report = await this.healthService.getHealthReport({ timeoutMs: 180 });
      const now = new Date().toISOString();

      if (report.services?.aiGateway?.circuitBreakerState === "OPEN") {
        recommendations.push({
          id: `model-cb-open-${Date.now()}`,
          category: "model_health",
          severity: "critical",
          title: "AI Gateway Circuit Breaker Open",
          description: "Primary model endpoint failed consecutively and has been paused by the circuit breaker.",
          rationale: "Protect downstream tasks from repeated inference failures and timeout loops.",
          detectedAt: now,
          remediation: {
            type: "reset_circuit_breaker",
            label: "Reset Model Gateway Circuit Breaker",
            description: "Resets the breaker to HALF_OPEN to test gateway readiness.",
          },
        });
      }

      if (report.services?.database?.latencyMs > 250) {
        recommendations.push({
          id: `db-latency-high-${Date.now()}`,
          category: "model_health",
          severity: "warning",
          title: "Elevated Database Latency",
          description: `Supabase database probe took ${report.services.database.latencyMs}ms (target: <150ms).`,
          rationale: "Sustained high database latency degrades agent real-time reaction performance.",
          detectedAt: now,
        });
      }
    } catch {
      // Graceful fallback
    }

    return recommendations;
  }

  /**
   * Detects repeated test regressions or verification failures in recent agent runs.
   */
  public async detectTestRegressions(): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    if (!this.agentRunRepo) return recommendations;

    try {
      const runs = await this.agentRunRepo.listRecentRuns(10);
      const now = new Date().toISOString();

      const failedRuns = runs.filter((r) => r.status === "failed" || r.exit_code !== 0);
      if (failedRuns.length >= 2) {
        recommendations.push({
          id: `test-regression-${Date.now()}`,
          category: "test_reliability",
          severity: "warning",
          title: `Repeated Test Failures (${failedRuns.length} of last ${runs.length} runs)`,
          description: `Recent agent runs encountered repeated failures. Last error: ${failedRuns[0]?.error_summary || "Verification failed"}.`,
          rationale: "Unresolved regressions block subsequent milestone transitions.",
          detectedAt: now,
          remediation: {
            type: "retry_failed_task",
            label: "Retry Run with Verification",
            description: "Re-triggers verification and bounded repair protocol for the latest run.",
            payload: { runId: failedRuns[0]?.id },
          },
        });
      }
    } catch {
      // Graceful fallback
    }

    return recommendations;
  }

  /**
   * Detects pending approvals nearing expiration (< 2 hours) or expired approvals.
   */
  public async detectStaleWorkItems(userId: string): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    if (!this.approvalRepo) return recommendations;

    try {
      const pending = await this.approvalRepo.listPending(userId);
      const nowMs = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      const nowIso = new Date().toISOString();

      const expiringSoon = pending.filter((a) => {
        const expiresMs = new Date(a.expires_at).getTime();
        return expiresMs > nowMs && expiresMs - nowMs < twoHoursMs;
      });

      if (expiringSoon.length > 0) {
        recommendations.push({
          id: `approvals-expiring-${Date.now()}`,
          category: "stale_tasks",
          severity: "warning",
          title: `${expiringSoon.length} Pending Approval(s) Expiring Soon`,
          description: `Approvals for resource(s) '${expiringSoon.map((a) => a.target_resource).join(", ")}' expire in under 2 hours.`,
          rationale: "Pending action will be discarded if not reviewed before expiration.",
          detectedAt: nowIso,
        });
      }
    } catch {
      // Graceful fallback
    }

    return recommendations;
  }

  /**
   * Detects continuous branch safety compliance (NFR-SEC-04) and storage retention needs.
   */
  public async detectHygieneIssues(cwd: string = this.cwd): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    const nowIso = new Date().toISOString();

    // 1. Git branch hygiene check (NFR-SEC-04)
    try {
      const hygiene = auditBranchHygiene(cwd, this.gitExec);
      if (!hygiene.isCompliant) {
        recommendations.push({
          id: `branch-hygiene-violation-${Date.now()}`,
          category: "branch_safety",
          severity: "critical",
          title: "Git Branch Safety Invariant Violation (NFR-SEC-04)",
          description: `Non-main local branch(es) detected: ${hygiene.extraneousBranches.join(", ")}. Active branch: ${hygiene.activeBranch}.`,
          rationale: "The architecture strictly forbids non-main branches. Commits must occur directly on main.",
          detectedAt: nowIso,
          remediation: {
            type: "clean_extraneous_branches",
            label: "Prune Extraneous Branches",
            description: "Deletes non-main local branches with force (-D) to restore compliance.",
          },
        });
      }
    } catch {
      // Graceful fallback
    }

    // 2. Storage retention check
    if (this.storagePruner) {
      try {
        const estimate = await this.storagePruner.runFullMaintenance({ retentionDays: 30, dryRun: true });
        if (estimate.artifactsPruned > 0 || estimate.approvalsExpired > 0) {
          const mb = (estimate.bytesReclaimed / (1024 * 1024)).toFixed(2);
          recommendations.push({
            id: `storage-pruning-eligible-${Date.now()}`,
            category: "storage_hygiene",
            severity: "info",
            title: "Storage Retention & Pruning Eligible",
            description: `${estimate.artifactsPruned} artifact(s) older than 30 days eligible for pruning (${mb} MB reclaimable, ${estimate.approvalsExpired} stale approvals).`,
            rationale: "Regular pruning reclaims disk space and maintains database query performance.",
            detectedAt: nowIso,
            remediation: {
              type: "prune_storage",
              label: "Run Storage Pruning Maintenance",
              description: "Prunes ephemeral logs and artifacts older than 30 days.",
            },
          });
        }
      } catch {
        // Graceful fallback
      }
    }

    return recommendations;
  }

  /**
   * Generates a unified, prioritized advisory report.
   */
  public async generateAdvisoryReport(userId?: string): Promise<AdvisoryReport> {
    const effectiveUserId = userId || "00000000-0000-0000-0000-000000000001";
    const timestamp = new Date().toISOString();

    const [costRecs, modelRecs, testRecs, staleRecs, hygieneRecs] = await Promise.all([
      this.detectCostAnomalies(effectiveUserId),
      this.detectModelDegradation(),
      this.detectTestRegressions(),
      this.detectStaleWorkItems(effectiveUserId),
      this.detectHygieneIssues(),
    ]);

    const all = [...costRecs, ...modelRecs, ...testRecs, ...staleRecs, ...hygieneRecs];

    // Priority sorting: critical -> warning -> info
    const priorityWeight: Record<RecommendationSeverity, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    all.sort((a, b) => priorityWeight[b.severity] - priorityWeight[a.severity]);

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const rec of all) {
      if (rec.severity === "critical") criticalCount++;
      else if (rec.severity === "warning") warningCount++;
      else if (rec.severity === "info") infoCount++;
    }

    return {
      timestamp,
      totalRecommendations: all.length,
      criticalCount,
      warningCount,
      infoCount,
      recommendations: all,
    };
  }
}
