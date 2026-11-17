import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import {
  UnapprovedProductionDeploymentError,
  DeploymentNotFoundError,
} from "@/lib/deployment/types";

const PromoteSchema = z.object({
  deploymentId: z.string().min(1, "deploymentId is required"),
  approvalId: z.string().min(1, "approvalId is required"),
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
    const parseResult = PromoteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid promotion execution payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const manager = new DeploymentManager({ supabaseClient: supabase });
    const deployment = await manager.executeProductionPromotion(
      parseResult.data.deploymentId,
      parseResult.data.approvalId,
      user.id
    );

    return NextResponse.json({
      success: true,
      deployment,
    });
  } catch (error) {
    if (error instanceof UnapprovedProductionDeploymentError) {
      return NextResponse.json(
        { error: "UNAPPROVED_PROMOTION", message: error.message },
        { status: 403 }
      );
    }
    if (error instanceof DeploymentNotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    console.error("POST /api/deployments/production/promote error:", error);
    const message = error instanceof Error ? error.message : "Failed to execute production promotion";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
