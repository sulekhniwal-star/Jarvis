import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RemediationExecutor } from "@/lib/advisory/remediation-executor";
import { RemediationActionType } from "@/lib/advisory/types";

const RemediateRequestSchema = z.object({
  actionType: z.enum([
    "unlock_emergency_reserve",
    "reset_circuit_breaker",
    "prune_storage",
    "clean_extraneous_branches",
    "expire_stale_approvals",
    "retry_failed_task",
  ]),
  params: z.record(z.string(), z.unknown()).optional(),
});

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

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Invalid JSON body provided" },
        { status: 400 }
      );
    }

    const parsed = RemediateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: "Invalid remediation action type or parameters",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const executor = new RemediationExecutor({ supabase });
    const result = await executor.executeAction(
      parsed.data.actionType as RemediationActionType,
      parsed.data.params,
      user.id
    );

    const statusCode = result.success ? 200 : 500;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error("POST /api/advisory/remediate error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to execute remediation action" },
      { status: 500 }
    );
  }
}
