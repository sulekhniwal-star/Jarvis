import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { SpecificationRepository } from "@/lib/repositories/specification-repository";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { TaskStateMachine } from "@/lib/state-machines/task-state-machine";
import { TaskStatus } from "@/types/database";

const UpdateTaskSchema = z.object({
  status: z
    .enum([
      "intake",
      "specifying",
      "planned",
      "awaiting_approval",
      "running",
      "verifying",
      "failed",
      "completed",
      "cancelled",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  milestoneId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Task ID is required" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      supabase = createAdminClient();
    }

    const taskRepo = new TaskRepository(supabase);
    const specRepo = new SpecificationRepository(supabase);
    const planRepo = new PlanRepository(supabase);
    const runRepo = new AgentRunRepository(supabase);

    const task = await taskRepo.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [specification, plan, runs] = await Promise.all([
      specRepo.findByTaskId(taskId).catch(() => null),
      planRepo.findByTaskId(taskId).catch(() => null),
      runRepo.listRunsByTask(taskId).catch(() => []),
    ]);

    return NextResponse.json({
      task,
      specification,
      plan,
      runs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch task details";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Task ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      supabase = createAdminClient();
    }

    const taskRepo = new TaskRepository(supabase);
    const currentTask = await taskRepo.getById(taskId);

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { status, priority, riskLevel, milestoneId, title, description } = parsed.data;

    if (status !== undefined) {
      if (!TaskStateMachine.canTransition(currentTask.status as TaskStatus, status as TaskStatus)) {
        return NextResponse.json(
          {
            error: "INVALID_STATE_TRANSITION",
            message: `Cannot transition task from '${currentTask.status}' to '${status}'`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await taskRepo.update(taskId, {
      status: status as TaskStatus | undefined,
      priority,
      riskLevel,
      milestoneId,
      title,
      description,
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
