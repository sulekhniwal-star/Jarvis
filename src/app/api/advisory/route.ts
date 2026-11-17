import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProactiveAdvisoryEngine } from "@/lib/advisory/recommendation-engine";

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

    const engine = new ProactiveAdvisoryEngine({ supabase });
    const report = await engine.generateAdvisoryReport(user.id);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("GET /api/advisory error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to generate advisory report" },
      { status: 500 }
    );
  }
}
