import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmergencyKillSwitchService } from "@/lib/system/kill-switch";

export async function GET(request: NextRequest) {
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

    const killService = new EmergencyKillSwitchService({ supabase });
    const status = await killService.getKillSwitchStatus(userId);

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
