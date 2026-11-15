import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export function createAdminClient() {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    throw new Error(
      "FATAL: Attempted to instantiate Supabase Admin Client in browser environment. Blocked by NFR-SEC-02."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
