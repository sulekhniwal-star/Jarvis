import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { SpecificationRepository } from "@/lib/repositories/specification-repository";
import { createDefaultAIGateway } from "@/lib/ai/gateway";
import { SpecifierAgent, SpecifierValidationError } from "@/lib/agents/specifier";

const TaskIntakeInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Task title is required"),
  rawPrompt: z.string().min(1, "User task prompt is required"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TaskIntakeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { projectId, title, rawPrompt, priority, userId: explicitUserId } =
      parsed.data;

    // Resolve Supabase client and user
    let supabase;
    let userId = explicitUserId;

    try {
      supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // In testing or environments without cookies, fallback to admin client
      supabase = createAdminClient();
    }

    const taskRepo = new TaskRepository(supabase);
    const specRepo = new SpecificationRepository(supabase);

    // 1. Create task in intake status
    const task = await taskRepo.create(projectId, {
      title,
      description: rawPrompt,
      priority: priority ?? "medium",
    });

    // 2. Transition task status to specifying
    await taskRepo.updateStatus(task.id, "specifying");

    // 3. Dispatch Specifier Agent
    const aiGateway = createDefaultAIGateway();
    const specifier = new SpecifierAgent(aiGateway);

    const specifierResult = await specifier.specify({
      rawPrompt,
      projectId,
      userId,
    });

    if (specifierResult.status === "needs_clarification") {
      return NextResponse.json(
        {
          taskId: task.id,
          status: "needs_clarification",
          ambiguity: specifierResult.ambiguity,
          questions: specifierResult.questions,
        },
        { status: 200 }
      );
    }

    // 4. Status is specified: Persist specification
    const specRecord = await specRepo.create({
      taskId: task.id,
      scope: specifierResult.specification.scope,
      exclusions: specifierResult.specification.exclusions,
      acceptanceCriteria: specifierResult.specification.acceptanceCriteria,
      rawUserPrompt: rawPrompt,
      version: 1,
    });

    return NextResponse.json(
      {
        taskId: task.id,
        specificationId: specRecord.id,
        status: "specified",
        ambiguity: specifierResult.ambiguity,
        specification: specifierResult.specification,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SpecifierValidationError) {
      return NextResponse.json(
        {
          error: "SPECIFIER_VALIDATION_ERROR",
          message: error.message,
          rawContent: error.rawContent,
          details: error.validationErrors,
        },
        { status: 422 }
      );
    }

    const err = error as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: err.message ?? "An unexpected error occurred during task intake.",
      },
      { status: 500 }
    );
  }
}
