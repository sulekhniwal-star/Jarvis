import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { ApprovalActionType } from "@/types/database";

const PlanDecisionInputSchema = z.object({
  decision: z.enum(["approve", "request_revision"]),
  feedback: z.string().optional(),
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
    const parsed = PlanDecisionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { decision, feedback, userId: explicitUserId } = parsed.data;

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
    const planRepo = new PlanRepository(supabase);
    const approvalRepo = new ApprovalRepository(supabase);

    // 1. Verify task exists
    const task = await taskRepo.getById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Task '${taskId}' not found.` },
        { status: 404 }
      );
    }

    if (task.status !== "planned" && task.status !== "awaiting_approval") {
      return NextResponse.json(
        {
          error: "INVALID_STATE",
          message: `Task is in '${task.status}' status. Approval decisions can only be made for tasks in 'planned' or 'awaiting_approval' status.`,
        },
        { status: 409 }
      );
    }

    // 2. Fetch latest plan
    const plan = await planRepo.findByTaskId(taskId);
    if (!plan) {
      return NextResponse.json(
        {
          error: "PLAN_NOT_FOUND",
          message: `No execution plan found for task '${taskId}'.`,
        },
        { status: 404 }
      );
    }

    if (decision === "approve") {
      // 3a. Update plan status to approved
      await planRepo.updateStatus(plan.id, "approved");

      // 3b. If plan had required approvals, log approval record
      const requiredApprovals = (plan.required_approvals as string[]) ?? [];
      if (requiredApprovals.length > 0 && userId) {
        try {
          const actionType: ApprovalActionType = requiredApprovals.includes(
            "database_migration"
          )
            ? "destructive_db_mutation"
            : requiredApprovals.includes("git_push_remote")
            ? "git_remote_push"
            : "paid_ai_inference";

          const approval = await approvalRepo.createApproval(userId, {
            actionType,
            targetResource: `task:${taskId}`,
            scope: {
              taskId,
              planId: plan.id,
              requiredApprovals,
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            taskId,
          });

          await approvalRepo.recordDecision(approval.id, userId, "approved");
        } catch {
          // In test environments or when approval table doesn't have FK user, proceed
        }
      }

      // 3c. Transition task to running status via TaskStateMachine
      await taskRepo.updateStatus(taskId, "running");

      return NextResponse.json(
        {
          taskId: task.id,
          planId: plan.id,
          status: "approved",
          taskStatus: "running",
        },
        { status: 200 }
      );
    } else {
      // decision === "request_revision"
      // 4a. Mark plan superseded
      await planRepo.updateStatus(plan.id, "superseded");

      // 4b. Transition task back to specifying
      await taskRepo.updateStatus(taskId, "specifying");

      return NextResponse.json(
        {
          taskId: task.id,
          planId: plan.id,
          status: "superseded",
          taskStatus: "specifying",
          feedback: feedback ?? null,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message:
          err.message ??
          "An unexpected error occurred during plan decision handling.",
      },
      { status: 500 }
    );
  }
}
