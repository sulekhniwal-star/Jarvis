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

export default function Home() {
  return (
    <AppShell title="Dashboard Overview" pendingApprovalsCount={0}>
      <ErrorBoundary>
        <div className="space-y-6">
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
              model="meta-llama/llama-3.3-70b-instruct:free"
              provider="OpenRouter"
              dailySpendInr={0.0}
              dailyLimitInr={25.0}
              monthlySpendInr={0.0}
              monthlyLimitInr={750.0}
            />
            <GitSyncStatusCard />
            <PendingApprovalsCard approvals={[]} />
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
            <ActiveProjectsList projects={[]} />
            <RecentActivityFeed events={[]} />
          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
