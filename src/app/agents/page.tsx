import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  AgentsConsoleView,
  EnrichedAgentRun,
  AgentMetrics,
} from "@/components/agents/agents-console-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  let runs: EnrichedAgentRun[] = [];
  let metrics: AgentMetrics = {
    totalRuns: 0,
    activeRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    successRate: 100,
    avgDurationMs: 0,
  };

  try {
    const adminClient = createAdminClient();
    const agentRunRepo = new AgentRunRepository(adminClient);
    const taskRepo = new TaskRepository(adminClient);
    const projectRepo = new ProjectRepository(adminClient);

    const result = await agentRunRepo.listRuns({
      limit: 50,
      offset: 0,
    });

    const rawRuns = result.data;

    runs = await Promise.all(
      rawRuns.map(async (run) => {
        let taskTitle: string | undefined;
        let taskPriority: string | undefined;
        let projectName: string | undefined;
        let projectSlug: string | undefined;

        if (run.task_id) {
          try {
            const task = await taskRepo.getById(run.task_id);
            if (task) {
              taskTitle = task.title;
              taskPriority = task.priority;

              if (task.project_id) {
                try {
                  const project = await projectRepo.getById(
                    task.project_id,
                    "00000000-0000-0000-0000-000000000001"
                  );
                  if (project) {
                    projectName = project.name;
                    projectSlug = project.slug;
                  }
                } catch {
                  // Ignore project fetch failure
                }
              }
            }
          } catch {
            // Ignore task fetch failure
          }
        }

        let durationMs: number | null = null;
        if (run.started_at && run.completed_at) {
          durationMs =
            new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
        }

        return {
          ...run,
          taskTitle: taskTitle || "Unknown Task",
          taskPriority: taskPriority || "medium",
          projectName: projectName || "Default Project",
          projectSlug: projectSlug || "default-project",
          durationMs,
        };
      })
    );

    const totalRuns = result.total;
    const activeRuns = runs.filter(
      (r) => r.status === "queued" || r.status === "running" || r.status === "verifying"
    ).length;
    const completedRuns = runs.filter((r) => r.status === "completed").length;
    const failedRuns = runs.filter(
      (r) => r.status === "failed" || r.status === "timed_out"
    ).length;
    const successRate =
      completedRuns + failedRuns > 0
        ? Math.round((completedRuns / (completedRuns + failedRuns)) * 100)
        : 100;

    const runsWithDuration = runs.filter(
      (r) => typeof r.durationMs === "number" && r.durationMs >= 0
    );
    const avgDurationMs =
      runsWithDuration.length > 0
        ? Math.round(
            runsWithDuration.reduce((acc, r) => acc + (r.durationMs || 0), 0) /
              runsWithDuration.length
          )
        : 0;

    metrics = {
      totalRuns,
      activeRuns,
      completedRuns,
      failedRuns,
      successRate,
      avgDurationMs,
    };
  } catch {
    // In build or environments without DB credentials, metrics and runs remain empty
  }

  return (
    <AppShell title="Agent Operations Console">
      <ErrorBoundary>
        <AgentsConsoleView initialRuns={runs} initialMetrics={metrics} />
      </ErrorBoundary>
    </AppShell>
  );
}
