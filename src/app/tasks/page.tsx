import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TasksBacklogView } from "@/components/tasks/tasks-backlog-view";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { Task } from "@/lib/repositories/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Tasks Backlog">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let tasks: Task[] = [];
  let pendingApprovalsCount = 0;

  try {
    const taskRepo = new TaskRepository(supabase);
    const approvalRepo = new ApprovalRepository(supabase);

    const [tasksRes, pendingApprovals] = await Promise.all([
      taskRepo.listAll({ limit: 100 }),
      approvalRepo.listPending(user.id),
    ]);

    tasks = tasksRes.data;
    pendingApprovalsCount = pendingApprovals.length;
  } catch {
    tasks = [];
  }

  return (
    <AppShell title="Tasks Backlog" pendingApprovalsCount={pendingApprovalsCount}>
      <ErrorBoundary>
        <TasksBacklogView initialTasks={tasks} />
      </ErrorBoundary>
    </AppShell>
  );
}
