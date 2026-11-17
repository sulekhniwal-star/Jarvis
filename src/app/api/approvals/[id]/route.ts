import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { generateApprovalToken } from "@/lib/approvals/approval-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Approval ID is required" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const approvalRepo = new ApprovalRepository(supabase);
    const approval = await approvalRepo.getById(id, user.id);

    if (!approval) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Approval '${id}' not found` },
        { status: 404 }
      );
    }

    let taskTitle: string | undefined;
    let projectName: string | undefined;

    if (approval.task_id) {
      try {
        const taskRepo = new TaskRepository(supabase);
        const task = await taskRepo.getById(approval.task_id);
        if (task) {
          taskTitle = task.title;
          if (task.project_id) {
            const projectRepo = new ProjectRepository(supabase);
            const project = await projectRepo.getById(task.project_id, user.id);
            if (project) {
              projectName = project.name;
            }
          }
        }
      } catch {
        // Linked metadata is non-critical enrichment
      }
    }

    const token = generateApprovalToken({
      id: approval.id,
      actionType: approval.action_type,
      targetResource: approval.target_resource,
      userId: user.id,
      expiresAt: approval.expires_at,
    });

    return NextResponse.json({
      approval: {
        ...approval,
        taskTitle,
        projectName,
      },
      token,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to fetch approval" },
      { status: 500 }
    );
  }
}
