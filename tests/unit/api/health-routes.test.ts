import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getDiagnostics } from "@/app/api/health/diagnostics/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

describe("Health API Routes (REQ-OPS-02, NFR-REL-03)", () => {
  const mockUser = { id: "usr-admin-1", email: "owner@javis.ai" };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ id: "usr-1" }], error: null }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
    (createAdminClient as any).mockReturnValue(mockAdmin);
  });

  describe("GET /api/health", () => {
    it("returns HTTP 200 with no-store cache headers for healthy state", async () => {
      const res = await getHealth();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("healthy");
      expect(json.services.database.status).toBe("healthy");
      expect(json.durationMs).toBeLessThan(200);

      expect(res.headers.get("Cache-Control")).toContain("no-store");
      expect(res.headers.get("X-Response-Time-Ms")).toBeDefined();
    });

    it("returns HTTP 503 when primary database is down", async () => {
      (createAdminClient as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: "DB DOWN" } }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const res = await getHealth();
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.status).toBe("unhealthy");
      expect(json.services.database.status).toBe("unhealthy");
    });
  });

  describe("GET /api/health/diagnostics", () => {
    it("returns HTTP 401 when unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const res = await getDiagnostics();
      expect(res.status).toBe(401);
    });

    it("returns HTTP 200 with deep diagnostics when authenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [{ id: "usr-1" }], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const res = await getDiagnostics();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("healthy");
      expect(json.diagnostics.requestedBy).toBe(mockUser.id);
      expect(json.diagnostics.executionId).toBeDefined();
      expect(json.services.system.memory).toBeDefined();
    });
  });
});
