import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApprovalRepository, ApprovalFilters } from "@/lib/repositories/approval-repository";
import { generateApprovalToken } from "@/lib/approvals/approval-token";
import { ApprovalActionType, ApprovalStatus } from "@/types/database";

const CreateApprovalSchema = z.object({
  actionType: z.enum([
    "git_remote_push",
    "production_deploy",
    "paid_ai_inference",
    "destructive_db_mutation",
    "external_message",
  ]),
  targetResource: z.string().min(1, "Target resource is required"),
  scope: z.record(z.string(), z.unknown()).default({}),
  expiresAt: z.string().min(1, "Expiration timestamp is required"),
  taskId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status") as ApprovalFilters["status"] | null;
    const actionTypeParam = searchParams.get("actionType") as ApprovalActionType | null;
    const searchParam = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const approvalRepo = new ApprovalRepository(supabase);

    const [listResult, metrics] = await Promise.all([
      approvalRepo.listApprovals(user.id, {
        status: statusParam || undefined,
        actionType: actionTypeParam || undefined,
        search: searchParam,
        limit,
        offset,
      }),
      approvalRepo.getApprovalMetrics(user.id),
    ]);

    const enrichedApprovals = listResult.data.map((item) => {
      const token = generateApprovalToken({
        id: item.id,
        actionType: item.action_type,
        targetResource: item.target_resource,
        userId: user.id,
        expiresAt: item.expires_at,
      });

      return {
        ...item,
        token,
      };
    });

    return NextResponse.json({
      approvals: enrichedApprovals,
      total: listResult.total,
      metrics,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to list approvals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validated = CreateApprovalSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: validated.error.issues[0]?.message || "Invalid payload",
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const approvalRepo = new ApprovalRepository(supabase);
    const created = await approvalRepo.createApproval(user.id, {
      actionType: validated.data.actionType,
      targetResource: validated.data.targetResource,
      scope: validated.data.scope,
      expiresAt: validated.data.expiresAt,
      taskId: validated.data.taskId,
    });

    const token = generateApprovalToken({
      id: created.id,
      actionType: created.action_type,
      targetResource: created.target_resource,
      userId: user.id,
      expiresAt: created.expires_at,
    });

    return NextResponse.json(
      {
        approval: created,
        token,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to create approval" },
      { status: 500 }
    );
  }
}
