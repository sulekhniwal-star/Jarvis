import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { StoragePruningService } from "@/lib/ops/storage-pruner";

const PruneRequestSchema = z.object({
  retentionDays: z.number().int().positive().optional(),
  dryRun: z.boolean().optional(),
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
    const retentionDays = searchParams.get("retentionDays")
      ? parseInt(searchParams.get("retentionDays")!, 10)
      : 30;

    const prunerService = new StoragePruningService({ supabase });
    const estimate = await prunerService.runFullMaintenance({
      retentionDays,
      dryRun: true,
      userId: user.id,
    });

    return NextResponse.json({
      status: "ready",
      estimate: {
        artifactsEligible: estimate.artifactsPruned,
        bytesReclaimable: estimate.bytesReclaimed,
        approvalsStale: estimate.approvalsExpired,
        tempFilesEligible: estimate.tempFilesCleaned,
      },
      retentionDays,
      timestamp: estimate.timestamp,
    });
  } catch (error) {
    console.error("GET /api/maintenance/prune error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to evaluate maintenance status" },
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
      // Body may be empty, defaults will apply
    }

    const parsed = PruneRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: "Invalid maintenance options provided",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const prunerService = new StoragePruningService({ supabase });
    const report = await prunerService.runFullMaintenance({
      retentionDays: parsed.data.retentionDays,
      dryRun: parsed.data.dryRun,
      userId: user.id,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("POST /api/maintenance/prune error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to execute storage pruning maintenance" },
      { status: 500 }
    );
  }
}
