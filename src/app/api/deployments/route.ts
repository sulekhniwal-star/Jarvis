import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import { DeploymentEnvironment, DeploymentStatus } from "@/lib/deployment/types";

const CreatePreviewSchema = z.object({
  commitSha: z.string().optional(),
  commitMessage: z.string().optional(),
  branch: z.string().optional(),
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
    const environment = (searchParams.get("environment") as DeploymentEnvironment) || undefined;
    const status = (searchParams.get("status") as DeploymentStatus) || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : 0;

    const manager = new DeploymentManager({ supabaseClient: supabase });
    const repo = manager.getRepository();

    const [listResult, activeProduction, latestPreview] = await Promise.all([
      repo.listDeployments({ environment, status, limit, offset }),
      repo.getActiveProductionDeployment(),
      repo.getLatestPreviewDeployment(),
    ]);

    return NextResponse.json({
      deployments: listResult.data,
      count: listResult.count,
      activeProduction,
      latestPreview,
    });
  } catch (error) {
    console.error("GET /api/deployments error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to list deployments" },
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

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const parseResult = CreatePreviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const manager = new DeploymentManager({ supabaseClient: supabase });
    const deployment = await manager.createPreviewDeployment({
      ...parseResult.data,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      deployment,
    });
  } catch (error) {
    console.error("POST /api/deployments error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create preview deployment" },
      { status: 500 }
    );
  }
}
