import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmergencyKillSwitchService } from "@/lib/system/kill-switch";

const KillRequestSchema = z.object({
  source: z.enum(["web", "telegram", "api"]).default("web"),
});

export async function POST(request: NextRequest) {
  try {
    let supabase;
    let userId = "00000000-0000-0000-0000-000000000001";

    try {
      supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      }
    } catch {
      supabase = createAdminClient();
    }

    const body = await request.json().catch(() => ({}));
    const validated = KillRequestSchema.safeParse(body);
    const source = validated.success ? validated.data.source : "web";

    const killService = new EmergencyKillSwitchService({ supabase });
    const result = await killService.executeEmergencyStop(userId, source);

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
