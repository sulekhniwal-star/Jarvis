import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export interface SupabaseClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  authToken?: string;
}

declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Creates a strongly typed Supabase client for the Jarvis ecosystem.
 */
export function createJarvisDbClient(options: SupabaseClientOptions = {}): SupabaseClient<Database> {
  const env = typeof process !== 'undefined' ? process.env : {};
  const url = options.supabaseUrl ?? env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = options.supabaseKey ?? env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials: Provide supabaseUrl and supabaseKey or set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: options.authToken
      ? {
          headers: {
            Authorization: `Bearer ${options.authToken}`,
          },
        }
      : undefined,
  });
}
