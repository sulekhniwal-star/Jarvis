import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import {
  DeploymentNotFoundError,
  InvalidRollbackTargetError,
} from "@/lib/deployment/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "INVALID_PARAM", message: "Deployment target ID is required" },
        { status: 400 }
      );
    }

    const manager = new DeploymentManager({ supabaseClient: supabase });
    const result = await manager.executeRollback(id, user.id);

    return NextResponse.json({
      success: true,
      rollback: result,
    });
  } catch (error) {
    if (error instanceof DeploymentNotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof InvalidRollbackTargetError) {
      return NextResponse.json(
        { error: "INVALID_TARGET", message: error.message },
        { status: 400 }
      );
    }

    console.error("POST /api/deployments/[id]/rollback error:", error);
    const message = error instanceof Error ? error.message : "Failed to execute rollback";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
