import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch {
    return NextResponse.json(
      { error: "Internal server error during signout." },
      { status: 500 }
    );
  }
}
