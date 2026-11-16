import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { ExecutionCoordinator } from "@/lib/agents/engine/telemetry/execution-coordinator";
import { TelegramClient } from "@/lib/telegram/client";

const ExecuteTaskStepInputSchema = z.object({
  taskId: z.string().uuid("taskId must be a valid UUID"),
  step: z.object({
    id: z.string().min(1, "Step ID is required"),
    title: z.string().min(1, "Step title is required"),
    description: z.string().min(1, "Step description is required"),
    filesTargeted: z
      .array(z.string())
      .min(1, "At least one targeted file is required"),
    actionType: z.enum([
      "create",
      "modify",
      "delete",
      "command",
      "migration",
    ]),
    wave: z.number().int().positive("Wave must be a positive integer"),
    dependencies: z.array(z.string()).default([]),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    requiresApproval: z.boolean(),
    approvalReason: z.string().optional(),
    verificationCommand: z.string().min(1, "Verification command is required"),
    rollbackProcedure: z.string().min(1, "Rollback procedure is required"),
  }),
  project: z.object({
    slug: z.string().min(1, "Project slug is required"),
    repositoryUrl: z.string().min(1, "Repository URL is required"),
    name: z.string().optional(),
  }),
  taskContext: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      userPrompt: z.string().optional(),
    })
    .optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  maxRetries: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const taskId = searchParams.get("taskId") || undefined;
    const status = searchParams.get("status") || undefined;
    const agentEngine = searchParams.get("agentEngine") || undefined;
    const search = searchParams.get("search")?.toLowerCase() || undefined;

    try {
      const adminClient = createAdminClient();
      const agentRunRepo = new AgentRunRepository(adminClient);
      const taskRepo = new TaskRepository(adminClient);
      const projectRepo = new ProjectRepository(adminClient);

      const result = await agentRunRepo.listRuns({
        status,
        agentEngine,
        taskId,
        limit,
        offset,
      });

      const rawRuns = result.data;

      // Enrich runs with task and project metadata
      let enrichedRuns = await Promise.all(
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

      // In-memory search filtering if search term provided
      if (search) {
        enrichedRuns = enrichedRuns.filter(
          (r) =>
            r.id.toLowerCase().includes(search) ||
            r.taskTitle.toLowerCase().includes(search) ||
            r.projectName.toLowerCase().includes(search) ||
            (r.git_commit_hash && r.git_commit_hash.toLowerCase().includes(search)) ||
            (r.error_summary && r.error_summary.toLowerCase().includes(search))
        );
      }

      // Compute aggregate metrics
      const totalRuns = result.total;
      const activeRuns = enrichedRuns.filter(
        (r) => r.status === "queued" || r.status === "running"
      ).length;
      const completedRuns = enrichedRuns.filter((r) => r.status === "completed").length;
      const failedRuns = enrichedRuns.filter((r) => r.status === "failed").length;
      const successRate =
        completedRuns + failedRuns > 0
          ? Math.round((completedRuns / (completedRuns + failedRuns)) * 100)
          : 100;

      const runsWithDuration = enrichedRuns.filter(
        (r) => typeof r.durationMs === "number" && r.durationMs >= 0
      );
      const avgDurationMs =
        runsWithDuration.length > 0
          ? Math.round(
              runsWithDuration.reduce((acc, r) => acc + (r.durationMs || 0), 0) /
                runsWithDuration.length
            )
          : 0;

      const metrics = {
        totalRuns,
        activeRuns,
        completedRuns,
        failedRuns,
        successRate,
        avgDurationMs,
      };

      return NextResponse.json(
        {
          runs: enrichedRuns,
          total: result.total,
          limit,
          offset,
          metrics,
        },
        { status: 200 }
      );
    } catch {
      // Return empty runs array gracefully in environments without DB credentials
      return NextResponse.json(
        {
          runs: [],
          total: 0,
          limit,
          offset,
          metrics: {
            totalRuns: 0,
            activeRuns: 0,
            completedRuns: 0,
            failedRuns: 0,
            successRate: 100,
            avgDurationMs: 0,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "FETCH_RUNS_ERROR", message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExecuteTaskStepInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    let taskRepo: TaskRepository | undefined;
    let agentRunRepo: AgentRunRepository | undefined;

    try {
      const adminClient = createAdminClient();
      taskRepo = new TaskRepository(adminClient);
      agentRunRepo = new AgentRunRepository(adminClient);
    } catch {
      // Repositories remain undefined in headless/offline tests
    }

    const coordinator = new ExecutionCoordinator({
      taskRepo,
      agentRunRepo,
      telegramClient: new TelegramClient(),
    });

    const summary = await coordinator.executeTaskStep(parsed.data);

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      { error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
