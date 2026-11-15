import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { PushGateService } from "@/lib/git/push-gate";

const GitPushInputSchema = z.object({
  action: z.enum(["request", "execute"]),
  approvalId: z.string().optional(),
  testProof: z.string().optional(),
  taskId: z.string().optional(),
  notes: z.string().optional(),
  telegramChatId: z.union([z.string(), z.number()]).optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GitPushInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      action,
      approvalId,
      testProof,
      taskId,
      notes,
      telegramChatId,
      userId: explicitUserId,
    } = parsed.data;

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

    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User authentication required." },
        { status: 401 }
      );
    }

    const approvalRepo = new ApprovalRepository(supabase);
    const pushGateService = new PushGateService({
      approvalRepo,
      supabaseClient: supabase,
    });

    if (action === "request") {
      const result = await pushGateService.requestPushApproval(userId, {
        testProof,
        taskId,
        notes,
        telegramChatId,
      });

      return NextResponse.json(result, { status: 200 });
    }

    if (action === "execute") {
      if (!approvalId) {
        return NextResponse.json(
          {
            error: "VALIDATION_FAILED",
            message: "approvalId is required for execute action.",
          },
          { status: 400 }
        );
      }

      const result = await pushGateService.executePush(approvalId, userId);
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(
      { error: "INVALID_ACTION", message: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    const message = (error as Error).message || "Internal server error";
    return NextResponse.json(
      {
        error: "PUSH_GATE_ERROR",
        message,
      },
      { status: 400 }
    );
  }
}
