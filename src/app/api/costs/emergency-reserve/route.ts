import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CostRepository } from "@/lib/repositories/cost-repository";

const UnlockReserveSchema = z.object({
  reason: z.string().optional(),
  token: z.string().optional(),
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

    const body = await request.json().catch(() => ({}));
    const validated = UnlockReserveSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: validated.error.issues[0]?.message || "Invalid payload",
          details: validated.error.issues,
        },
        { status: 400 }
      );
    }

    const costRepo = new CostRepository(supabase);
    await costRepo.unlockEmergencyReserve(
      user.id,
      validated.data.reason || "Owner authorized emergency reserve"
    );

    const updatedSummary = await costRepo.getSpendSummary(user.id);

    return NextResponse.json({
      success: true,
      message: "Emergency reserve of ₹250.00 successfully authorized for the current billing cycle.",
      summary: updatedSummary,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "Failed to unlock emergency reserve" },
      { status: 500 }
    );
  }
}
