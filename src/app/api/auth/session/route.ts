import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // Fetch extended profile if present
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
