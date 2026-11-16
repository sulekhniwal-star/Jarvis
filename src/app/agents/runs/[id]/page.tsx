import * as React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  RunTelemetryView,
  RunTelemetryViewProps,
} from "@/components/agents/run-telemetry-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { parseUnifiedDiff } from "@/lib/agents/engine/verification/diff-inspector/diff-parser";
import { scoreDiffQuality } from "@/lib/agents/engine/verification/diff-inspector/quality-scorer";

export const dynamic = "force-dynamic";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  let runData: RunTelemetryViewProps["run"] | null = null;
  let taskData: RunTelemetryViewProps["task"] = null;
  let projectData: RunTelemetryViewProps["project"] = null;
  let artifactsData: RunTelemetryViewProps["artifacts"] = [];
  let diffSummaryData: RunTelemetryViewProps["diffSummary"] = null;

  try {
    const adminClient = createAdminClient();
    const agentRunRepo = new AgentRunRepository(adminClient);
    const taskRepo = new TaskRepository(adminClient);
    const projectRepo = new ProjectRepository(adminClient);

    const run = await agentRunRepo.getById(id);
    if (!run) {
      notFound();
    }

    runData = {
      ...run,
      test_results: (run.test_results as unknown as RunTelemetryViewProps["run"]["test_results"]) || null,
    };

    if (run.task_id) {
      try {
        const task = await taskRepo.getById(run.task_id);
        if (task) {
          taskData = {
            id: task.id,
            title: task.title,
            priority: task.priority,
          };

          if (task.project_id) {
            try {
              const project = await projectRepo.getById(
                task.project_id,
                "00000000-0000-0000-0000-000000000001"
              );
              if (project) {
                projectData = {
                  id: project.id,
                  name: project.name,
                  slug: project.slug,
                };
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

    try {
      artifactsData = await agentRunRepo.listArtifacts(id);
    } catch {
      artifactsData = [];
    }

    if (run.diff_patch) {
      try {
        const parsedFiles = parseUnifiedDiff(run.diff_patch);
        const { metrics, violations } = scoreDiffQuality(parsedFiles);

        diffSummaryData = {
          additions: metrics.additions,
          deletions: metrics.deletions,
          filesCount: metrics.filesCount,
          modifiedFiles: parsedFiles.map((f) => f.newPath || f.oldPath || "unknown"),
          riskTier: metrics.riskTier,
          violations,
          rawPatch: run.diff_patch,
        };
      } catch {
        // Ignore diff parse error
      }
    }
  } catch {
    // If database unavailable or run not found
    if (!runData) {
      notFound();
    }
  }

  return (
    <AppShell title={`Run #${id.slice(0, 8)} Telemetry`}>
      <ErrorBoundary>
        <RunTelemetryView
          run={runData}
          task={taskData}
          project={projectData}
          artifacts={artifactsData}
          diffSummary={diffSummaryData}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
