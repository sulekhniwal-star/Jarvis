import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { requireApiAuth } from "@/lib/auth/require-auth";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateTaskSchema = z.object({
  title: z.string({ message: "Task title is required" }).min(1, "Task title is required"),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  riskLevel: z.enum(["low", "medium", "high"]).optional().default("low"),
  estimatedCostInr: z.number().nonnegative().optional().default(0),
  milestoneId: z.string().uuid().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Project ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { supabase, user } = auth;
    const userId = user.id;

    const projectRepo = new ProjectRepository(supabase);
    const taskRepo = new TaskRepository(supabase);

    let project;
    if (UUID_REGEX.test(id)) {
      try {
        project = await projectRepo.getById(id, userId);
      } catch {
        project = await projectRepo.getBySlug(id, userId);
      }
    } else {
      project = await projectRepo.getBySlug(id, userId);
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const task = await taskRepo.create(project.id, {
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      priority: parsed.data.priority,
      riskLevel: parsed.data.riskLevel,
      estimatedCostInr: parsed.data.estimatedCostInr,
      milestoneId: parsed.data.milestoneId ?? undefined,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
