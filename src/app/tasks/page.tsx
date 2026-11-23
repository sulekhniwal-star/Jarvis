import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TasksBacklogView } from "@/components/tasks/tasks-backlog-view";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { Task } from "@/lib/repositories/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  let supabase;
  let userId = "00000000-0000-0000-0000-000000000001";

  try {
    supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  } catch {
    supabase = createAdminClient();
  }

  let tasks: Task[] = [];
  let pendingApprovalsCount = 0;

  try {
    const taskRepo = new TaskRepository(supabase);
    const approvalRepo = new ApprovalRepository(supabase);

    const [tasksRes, pendingApprovals] = await Promise.all([
      taskRepo.listAll({ limit: 100 }),
      approvalRepo.listPending(userId),
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
