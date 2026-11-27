import { NextResponse } from "next/server";
import { EmergencyKillSwitchService } from "@/lib/system/kill-switch";
import { requireApiAuth } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const killService = new EmergencyKillSwitchService({
      supabase: auth.supabase,
    });
    const status = await killService.getKillSwitchStatus(auth.user.id);

    return NextResponse.json(status, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err.message || "Failed to retrieve kill switch status",
      },
      { status: 500 }
    );
  }
}
