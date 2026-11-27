import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/agents/runs/route";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => {
    throw new Error("Supabase not configured in unit test");
  }),
}));

vi.mock("@/lib/agents/engine/telemetry/execution-coordinator", () => {
  return {
    ExecutionCoordinator: vi.fn().mockImplementation(() => ({
      executeTaskStep: vi.fn().mockResolvedValue({
        runId: "11111111-2222-4333-a444-555555555555",
        taskId: "12345678-1234-4234-a234-123456789012",
        status: "success",
        commitHash: "abcdef1234567890",
        durationMs: 450,
        testSummary: { passed: 5, failed: 0, skipped: 0, durationMs: 120 },
        artifactCount: 1,
      }),
    })),
  };
});

describe("/api/agents/runs Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/agents/runs", () => {
    it("returns 200 with empty runs array when database is offline/unconfigured", async () => {
      const request = new NextRequest("http://localhost:3000/api/agents/runs");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runs).toEqual([]);
      expect(data.metrics).toBeDefined();
    });
  });

  describe("POST /api/agents/runs", () => {
    it("returns 400 when request body fails Zod validation", async () => {
      const request = new NextRequest("http://localhost:3000/api/agents/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "invalid-uuid",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
      expect(data.details).toBeDefined();
    });

    it("returns 200 with execution summary when valid payload is submitted", async () => {
      const validPayload = {
        taskId: "12345678-1234-4234-a234-123456789012",
        step: {
          id: "step-101",
          title: "Implement auth guard",
          description: "Protect sensitive routes from unauthorized access",
          filesTargeted: ["src/guard.ts"],
          actionType: "create",
          wave: 1,
          dependencies: [],
          riskLevel: "medium",
          requiresApproval: false,
          verificationCommand: "npm test",
          rollbackProcedure: "git checkout src/guard.ts",
        },
        project: {
          slug: "platform-core",
          repositoryUrl: "https://github.com/org/platform-core",
        },
      };

      const request = new NextRequest("http://localhost:3000/api/agents/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("success");
      expect(data.commitHash).toBe("abcdef1234567890");
      expect(data.runId).toBe("11111111-2222-4333-a444-555555555555");
    });
  });
});
