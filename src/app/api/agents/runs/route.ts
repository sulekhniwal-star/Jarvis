import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const taskId = searchParams.get("taskId");

    try {
      const adminClient = createAdminClient();
      const agentRunRepo = new AgentRunRepository(adminClient);

      let runs;
      if (taskId) {
        runs = await agentRunRepo.listRunsByTask(taskId);
      } else {
        runs = await agentRunRepo.listRecentRuns(limit);
      }

      return NextResponse.json({ runs }, { status: 200 });
    } catch {
      // Return empty runs array gracefully in environments without DB credentials
      return NextResponse.json({ runs: [] }, { status: 200 });
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
