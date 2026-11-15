import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { SpecificationRepository } from "@/lib/repositories/specification-repository";
import { createDefaultAIGateway } from "@/lib/ai/gateway";
import { SpecifierAgent, SpecifierValidationError } from "@/lib/agents/specifier";

const ClarificationInputSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, "Question ID is required"),
        question: z.string().min(1, "Question text is required"),
        answer: z.string().min(1, "Answer is required"),
      })
    )
    .min(1, "At least one clarification answer is required"),
  userId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Task ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = ClarificationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { answers, userId: explicitUserId } = parsed.data;

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
      supabase = createAdminClient();
    }

    const taskRepo = new TaskRepository(supabase);
    const specRepo = new SpecificationRepository(supabase);

    const task = await taskRepo.getById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Task '${taskId}' not found.` },
        { status: 404 }
      );
    }

    if (task.status !== "specifying") {
      return NextResponse.json(
        {
          error: "INVALID_STATE",
          message: `Task is in '${task.status}' status. Clarifications can only be answered for tasks in 'specifying' status.`,
        },
        { status: 409 }
      );
    }

    const rawPrompt = task.description ?? task.title;

    // Dispatch Specifier Agent with clarifications
    const aiGateway = createDefaultAIGateway();
    const specifier = new SpecifierAgent(aiGateway);

    const specifierResult = await specifier.specifyWithClarifications(
      {
        rawPrompt,
        projectId: task.project_id,
        userId,
      },
      answers
    );

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

    // Status is specified: create revision or initial specification
    const existing = await specRepo.findByTaskId(taskId);
    let specRecord;
    if (existing) {
      specRecord = await specRepo.createRevision(taskId, {
        scope: specifierResult.specification.scope,
        exclusions: specifierResult.specification.exclusions,
        acceptanceCriteria: specifierResult.specification.acceptanceCriteria,
        rawUserPrompt: rawPrompt,
      });
    } else {
      specRecord = await specRepo.create({
        taskId: task.id,
        scope: specifierResult.specification.scope,
        exclusions: specifierResult.specification.exclusions,
        acceptanceCriteria: specifierResult.specification.acceptanceCriteria,
        rawUserPrompt: rawPrompt,
        version: 1,
      });
    }

    return NextResponse.json(
      {
        taskId: task.id,
        specificationId: specRecord.id,
        version: specRecord.version,
        status: "specified",
        ambiguity: specifierResult.ambiguity,
        specification: specifierResult.specification,
      },
      { status: 200 }
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
        message: err.message ?? "An unexpected error occurred during clarification.",
      },
      { status: 500 }
    );
  }
}
