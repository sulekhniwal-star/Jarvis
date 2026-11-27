import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ApiAuthResult =
  | {
      user: User;
      supabase: SupabaseClient<Database>;
      errorResponse: null;
    }
  | {
      user: null;
      supabase: null;
      errorResponse: NextResponse;
    };

/**
 * Enforces Supabase session authentication on API routes using `supabase.auth.getUser()`.
 * Never falls back to `createAdminClient()` or hardcoded owner UUIDs.
 */
export async function requireApiAuth(): Promise<ApiAuthResult> {
  let supabase: SupabaseClient<Database>;
  try {
    supabase = await createClient();
  } catch {
    return {
      user: null,
      supabase: null,
      errorResponse: NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        supabase: null,
        errorResponse: NextResponse.json(
          { error: "UNAUTHORIZED", message: "User is not authenticated" },
          { status: 401 }
        ),
      };
    }

    return { user, supabase, errorResponse: null };
  } catch {
    return {
      user: null,
      supabase: null,
      errorResponse: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication verification failed" },
        { status: 401 }
      ),
    };
  }
}

export interface ServerAuthResult {
  user: User | null;
  supabase: SupabaseClient<Database> | null;
  isConfigured: boolean;
}

/**
 * Safely resolves the authenticated user and Supabase server client for Server Components.
 * Never throws on missing environment variables and never falls back to admin/service-role clients.
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, supabase: null, isConfigured: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      user: user ?? null,
      supabase,
      isConfigured: true,
    };
  } catch {
    return { user: null, supabase: null, isConfigured: true };
  }
}
