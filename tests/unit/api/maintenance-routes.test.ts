import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/maintenance/prune/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

import { createClient } from "@/lib/supabase/server";

describe("Maintenance API Routes (REQ-OPS-03)", () => {
  const mockUser = { id: "usr-owner-001", email: "owner@javis.ai" };

  function buildMockSupabase(isAuthenticated = true) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: isAuthenticated ? mockUser : null },
          error: isAuthenticated ? null : { message: "No session" },
        }),
      },
      from: vi.fn((_table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          then: (resolve: (val: any) => any) =>
            Promise.resolve({ data: [], error: null }).then(resolve),
        };
        return queryBuilder;
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 if unauthenticated", async () => {
    const mockSupabase = buildMockSupabase(false);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/maintenance/prune");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("GET returns maintenance estimate when authenticated", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/maintenance/prune?retentionDays=15");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.retentionDays).toBe(15);
    expect(body.estimate).toBeDefined();
    expect(body.estimate.artifactsEligible).toBe(0);
  });

  it("POST returns 401 if unauthenticated", async () => {
    const mockSupabase = buildMockSupabase(false);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/maintenance/prune", {
      method: "POST",
      body: JSON.stringify({ retentionDays: 30 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("POST returns 400 on invalid retention days payload", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/maintenance/prune", {
      method: "POST",
      body: JSON.stringify({ retentionDays: -5 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_FAILED");
  });

  it("POST executes maintenance and returns execution report", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/maintenance/prune", {
      method: "POST",
      body: JSON.stringify({ retentionDays: 30, dryRun: true }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isDryRun).toBe(true);
    expect(body.artifactsPruned).toBeDefined();
    expect(body.bytesReclaimed).toBeDefined();
  });
});
