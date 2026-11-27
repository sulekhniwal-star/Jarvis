import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AICoreStatus } from "@/components/dashboard/ai-core-status";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { GitSyncStatusCard } from "@/components/dashboard/git-sync-status";
import { AgentRunsCard } from "@/components/dashboard/agent-runs-card";
import { ActiveProjectsList } from "@/components/dashboard/active-projects-list";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { SystemHealthCard } from "@/components/ops/system-health-card";
import { RecommendationsCard } from "@/components/advisory/recommendations-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { CostRepository } from "@/lib/repositories/cost-repository";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { AuditLedgerService } from "@/lib/audit/audit-ledger";
import { DEFAULT_FREE_MODEL } from "@/lib/ai/models";
import type { PendingApprovalItem } from "@/components/dashboard/pending-approvals-card";
import type { ActivityEventItem } from "@/components/dashboard/recent-activity-feed";
import type { Project } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, supabase, isConfigured } = await getServerAuth();

  let dailySpendInr = 0;
  let dailyLimitInr = CostRepository.DEFAULT_DAILY_LIMIT_INR;
  let monthlySpendInr = 0;
  let monthlyLimitInr = CostRepository.DEFAULT_MONTHLY_LIMIT_INR;
  let pendingApprovals: PendingApprovalItem[] = [];
  let activeProjects: Project[] = [];
  let recentEvents: ActivityEventItem[] = [];

  if (user && supabase) {
    try {
      const costRepo = new CostRepository(supabase);
      const approvalRepo = new ApprovalRepository(supabase);
      const projectRepo = new ProjectRepository(supabase);
      const auditService = new AuditLedgerService(supabase);

      const [costSummary, approvalsRes, projectsRes, auditRes] =
        await Promise.all([
          costRepo.getSpendSummary(user.id).catch(() => null),
          approvalRepo.listPending(user.id).catch(() => []),
          projectRepo.list(user.id, { limit: 10 }).catch(() => ({ data: [] })),
          auditService.listEvents(user.id, { limit: 10 }).catch(() => ({ events: [] })),
        ]);

      if (costSummary) {
        dailySpendInr = costSummary.todaySpendInr;
        dailyLimitInr = costSummary.dailyLimitInr;
        monthlySpendInr = costSummary.monthSpendInr;
        monthlyLimitInr = costSummary.monthlyLimitInr;
      }

      pendingApprovals = approvalsRes.map((a) => ({
        id: a.id,
        actionType: a.action_type,
        targetResource: a.target_resource,
        expiresAt: a.expires_at,
        requestedAt: a.requested_at,
      }));
      activeProjects = projectsRes.data.filter((p) => p.status === "active");
      recentEvents = auditRes.events.map((e) => ({
        id: e.id,
        type: e.event_type.includes("failed")
          ? "run_failed"
          : e.event_type.includes("approval")
            ? "approval_decided"
            : e.event_type.includes("git")
              ? "git_commit"
              : "run_completed",
        title: e.event_type.replace(/_/g, " "),
        summary: `${e.resource_type}: ${e.resource_id}`,
        timestamp: e.created_at,
      }));
    } catch {
      // Keep safe empty defaults on partial DB errors
    }
  }

  return (
    <AppShell
      title="Dashboard Overview"
      pendingApprovalsCount={pendingApprovals.length}
    >
      <ErrorBoundary>
        <div className="space-y-6">
          {(!isConfigured || !user) && (
            <AuthRequiredBanner isConfigured={isConfigured} />
          )}

          {/* Welcome Banner */}
          <div className="flex flex-col gap-1 pb-2 border-b border-surface-3">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              System Command Center
            </h2>
            <p className="text-sm text-text-secondary">
              Autonomous software engineering platform operating under locked branch policies and financial ceilings.
            </p>
          </div>

          {/* Top Row: AI Core Gateway, Repository Sync & Pending Approvals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AICoreStatus
              model={DEFAULT_FREE_MODEL}
              provider="OpenRouter"
              dailySpendInr={dailySpendInr}
              dailyLimitInr={dailyLimitInr}
              monthlySpendInr={monthlySpendInr}
              monthlyLimitInr={monthlyLimitInr}
            />
            <GitSyncStatusCard />
            <PendingApprovalsCard approvals={pendingApprovals} />
          </div>

          {/* System Health & Liveness Diagnostics */}
          <SystemHealthCard />

          {/* Proactive Maintenance Recommendations & Autonomous Advisory */}
          <RecommendationsCard />

          {/* Autonomous Execution Telemetry & Runs */}
          <div className="grid grid-cols-1 gap-6">
            <AgentRunsCard />
          </div>

          {/* Bottom Row: Active Projects & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveProjectsList projects={activeProjects} />
            <RecentActivityFeed events={recentEvents} />
          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
