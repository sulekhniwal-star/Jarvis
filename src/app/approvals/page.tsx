import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ApprovalsPortalView } from "@/components/approvals/approvals-portal-view";
import { EnrichedApprovalItem } from "@/components/approvals/approval-request-card";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { ApprovalMetrics, ApprovalRepository } from "@/lib/repositories/approval-repository";
import { generateApprovalToken } from "@/lib/approvals/approval-token";

export const dynamic = "force-dynamic";

interface TaskLookup {
  id: string;
  title: string;
  project_id: string;
}

interface ProjectLookup {
  id: string;
  name: string;
}

export default async function ApprovalsPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Human Approvals">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let approvals: EnrichedApprovalItem[] = [];
  let metrics: ApprovalMetrics = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  };

  try {
    const approvalRepo = new ApprovalRepository(supabase);

    const [listResult, dbMetrics, tasksResult, projectsResult] =
      await Promise.all([
        approvalRepo.listApprovals(user.id, { limit: 100 }),
        approvalRepo.getApprovalMetrics(user.id),
        supabase.from("tasks").select("id, title, project_id"),
        supabase.from("projects").select("id, name"),
      ]);

    metrics = dbMetrics;

    const tasksList: TaskLookup[] = (tasksResult.data as TaskLookup[]) || [];
    const projectsList: ProjectLookup[] = (projectsResult.data as ProjectLookup[]) || [];

    const taskMap = new Map<string, TaskLookup>(tasksList.map((t) => [t.id, t]));
    const projectMap = new Map<string, string>(projectsList.map((p) => [p.id, p.name]));

    approvals = listResult.data.map((item) => {
      const task = item.task_id ? taskMap.get(item.task_id) : undefined;
      const projectName = task?.project_id ? projectMap.get(task.project_id) : undefined;

      const token = generateApprovalToken({
        id: item.id,
        actionType: item.action_type,
        targetResource: item.target_resource,
        userId: user.id,
        expiresAt: item.expires_at,
      });

      return {
        ...item,
        taskTitle: task?.title,
        projectName,
        token,
      };
    });
  } catch (err) {
    console.error("[ApprovalsPage] Failed to prefetch approvals data:", err);
  }

  return (
    <AppShell title="Human Approvals" pendingApprovalsCount={metrics.pending}>
      <ErrorBoundary>
        <ApprovalsPortalView
          initialApprovals={approvals}
          initialMetrics={metrics}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
