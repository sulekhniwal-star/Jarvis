import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmergencyKillSwitchService } from "@/lib/system/kill-switch";
import { requireApiAuth } from "@/lib/auth/require-auth";

const KillRequestSchema = z.object({
  source: z.enum(["web", "telegram", "api"]).default("web"),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const validated = KillRequestSchema.safeParse(body);
    const source = validated.success ? validated.data.source : "web";

    const killService = new EmergencyKillSwitchService({
      supabase: auth.supabase,
    });
    const result = await killService.executeEmergencyStop(auth.user.id, source);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err.message || "Failed to execute emergency stop",
      },
      { status: 500 }
    );
  }
}
