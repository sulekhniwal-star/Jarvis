import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CostRepository } from "@/lib/repositories/cost-repository";

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

    const costRepo = new CostRepository(supabase);
    const summary = await costRepo.getSpendSummary(user.id);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to fetch cost summary" },
      { status: 500 }
    );
  }
}
