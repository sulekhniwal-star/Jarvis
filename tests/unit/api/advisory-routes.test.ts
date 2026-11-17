import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAdvisory } from "@/app/api/advisory/route";
import { POST as remediateAction } from "@/app/api/advisory/remediate/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

import { createClient } from "@/lib/supabase/server";

describe("Advisory API Routes (REQ-OPS-04, REQ-OPS-05)", () => {
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
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

    const req = new NextRequest("http://localhost:3000/api/advisory");
    const res = await getAdvisory(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("GET returns advisory report when authenticated", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/advisory");
    const res = await getAdvisory(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timestamp).toBeDefined();
    expect(body.totalRecommendations).toBeDefined();
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it("POST returns 401 if unauthenticated", async () => {
    const mockSupabase = buildMockSupabase(false);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/advisory/remediate", {
      method: "POST",
      body: JSON.stringify({ actionType: "reset_circuit_breaker" }),
    });
    const res = await remediateAction(req);

    expect(res.status).toBe(401);
  });

  it("POST returns 400 on invalid action type", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/advisory/remediate", {
      method: "POST",
      body: JSON.stringify({ actionType: "unsupported_hack" }),
    });
    const res = await remediateAction(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_FAILED");
  });

  it("POST executes valid remediation action successfully", async () => {
    const mockSupabase = buildMockSupabase(true);
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/advisory/remediate", {
      method: "POST",
      body: JSON.stringify({ actionType: "reset_circuit_breaker" }),
    });
    const res = await remediateAction(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.actionType).toBe("reset_circuit_breaker");
    expect(body.message).toBeDefined();
  });
});
