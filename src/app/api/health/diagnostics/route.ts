import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SystemHealthDiagnosticService } from "@/lib/ops/health-checker";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const service = new SystemHealthDiagnosticService({
      supabaseClient: supabase,
      timeoutMs: 180,
    });

    const report = await service.getHealthReport();
    const statusCode = report.status === "unhealthy" ? 503 : 200;

    return NextResponse.json(
      {
        ...report,
        diagnostics: {
          environment: process.env.NODE_ENV || "development",
          requestedBy: user.id,
          executionId: crypto.randomUUID(),
        },
      },
      {
        status: statusCode,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/health/diagnostics error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Diagnostic inspection failed" },
      { status: 500 }
    );
  }
}
