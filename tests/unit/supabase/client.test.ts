import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";

describe("Supabase Client Factories", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws clear error when public environment variables are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => createBrowserClient()).toThrow(/Missing Supabase public environment variables/i);
  });

  it("instantiates browser client when environment variables are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("throws when service role key is missing for admin client", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createAdminClient()).toThrow(/Missing Supabase admin environment variables/i);
  });

  it("instantiates admin client on server when required keys are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const admin = createAdminClient();
    expect(admin).toBeDefined();
    expect(admin.auth).toBeDefined();
  });

  it("blocks admin client initialization in production browser environment", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.NODE_ENV = "production";

    expect(() => createAdminClient()).toThrow(/Blocked by NFR-SEC-02/i);
  });
});
