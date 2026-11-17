import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";

const PromotionRequestSchema = z.object({
  commitSha: z.string().min(4, "Valid commit SHA is required"),
  commitMessage: z.string().optional(),
  branch: z.string().optional(),
  verificationSummary: z.string().optional(),
  notes: z.string().optional(),
  telegramChatId: z.union([z.string(), z.number()]).optional(),
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

    const body = await request.json();
    const parseResult = PromotionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid promotion request payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const manager = new DeploymentManager({ supabaseClient: supabase });
    const result = await manager.requestProductionPromotion(user.id, parseResult.data);

    return NextResponse.json({
      success: true,
      deployment: result.deployment,
      approval: result.approval,
    });
  } catch (error) {
    console.error("POST /api/deployments/production/request error:", error);
    const message = error instanceof Error ? error.message : "Failed to request production promotion";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
