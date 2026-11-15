import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { SpecificationRepository } from "@/lib/repositories/specification-repository";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { createDefaultAIGateway } from "@/lib/ai/gateway";
import {
  PlannerAgent,
  PlannerValidationError,
  PlannerDAGError,
} from "@/lib/agents/planner";
import { AcceptanceCriterion, SpecificationPayload } from "@/lib/agents/specifier";

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

    // Resolve Supabase client and authenticated user
    let supabase;
    let userId: string | undefined;

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
    const planRepo = new PlanRepository(supabase);

    // 1. Verify task exists and is in specifying status
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
          message: `Task is in '${task.status}' status. Execution plans can only be generated for tasks in 'specifying' status.`,
        },
        { status: 409 }
      );
    }

    // 2. Fetch latest specification
    const specRecord = await specRepo.findByTaskId(taskId);
    if (!specRecord) {
      return NextResponse.json(
        {
          error: "SPECIFICATION_NOT_FOUND",
          message: `No approved specification found for task '${taskId}'. Complete the specification phase first.`,
        },
        { status: 404 }
      );
    }

    const specificationPayload: SpecificationPayload = {
      scope: specRecord.scope,
      exclusions: specRecord.exclusions,
      acceptanceCriteria: (specRecord.acceptance_criteria ?? []) as unknown as AcceptanceCriterion[],
      assumptions: [],
    };

    // 3. Dispatch Planner Agent
    const aiGateway = createDefaultAIGateway();
    const planner = new PlannerAgent(aiGateway);

    const planResult = await planner.plan({
      taskId,
      specification: specificationPayload,
      userId,
    });

    // 4. Persist plan in PlanRepository (or create revision if previous exists)
    const existingPlan = await planRepo.findByTaskId(taskId);
    let planRecord;

    if (existingPlan) {
      planRecord = await planRepo.createRevision(taskId, {
        steps: planResult.steps,
        dependencies: planResult.dependencies,
        riskAssessment: planResult.riskAssessment,
        requiredApprovals: planResult.requiredApprovals,
        status: planResult.riskAssessment.requiresHumanApproval
          ? "pending_approval"
          : "draft",
      });
    } else {
      planRecord = await planRepo.create({
        taskId,
        steps: planResult.steps,
        dependencies: planResult.dependencies,
        riskAssessment: planResult.riskAssessment,
        requiredApprovals: planResult.requiredApprovals,
        status: planResult.riskAssessment.requiresHumanApproval
          ? "pending_approval"
          : "draft",
        version: 1,
      });
    }

    // 5. Transition task status to planned via TaskStateMachine
    await taskRepo.updateStatus(taskId, "planned");

    return NextResponse.json(
      {
        taskId: task.id,
        planId: planRecord.id,
        version: planRecord.version,
        status: "planned",
        plan: planResult,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PlannerValidationError) {
      return NextResponse.json(
        {
          error: "PLANNER_VALIDATION_ERROR",
          message: error.message,
          rawContent: error.rawContent,
          details: error.validationErrors,
        },
        { status: 422 }
      );
    }

    if (error instanceof PlannerDAGError) {
      return NextResponse.json(
        {
          error: "PLANNER_DAG_ERROR",
          message: error.message,
          details: error.details,
        },
        { status: 422 }
      );
    }

    const err = error as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: err.message ?? "An unexpected error occurred during execution planning.",
      },
      { status: 500 }
    );
  }
}
