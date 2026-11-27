import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/verification/repair/route";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

describe("/api/verification/repair Route Handlers (REQ-VR-04)", () => {
  describe("GET /api/verification/repair", () => {
    it("returns protocol documentation, categories, and recovery policy", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.description).toContain("Autonomous Self-Review & Bounded Repair");
      expect(data.maxStrikes).toBe(3);
      expect(data.supportedCategories).toContain("syntax_type_error");
      expect(data.supportedCategories).toContain("test_assertion_failure");
      expect(data.supportedCategories).toContain("secret_leak_violation");
      expect(data.recoveryPolicy).toContain("Strict 3-strike budget");
    });
  });

  describe("POST /api/verification/repair", () => {
    it("returns 200 with diagnostic and strike 1 prompt for compilation errors", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorOutput: "src/calc.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.",
          stageName: "typecheck",
          strikeNumber: 1,
          allowedFiles: ["src/calc.ts"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.diagnostic).toBeDefined();
      expect(data.diagnostic.category).toBe("syntax_type_error");
      expect(data.diagnostic.stage).toBe("typecheck");
      expect(data.diagnostic.affectedFiles).toContain("src/calc.ts");
      expect(data.repairPrompt).toContain("Strike 1 (Targeted Surgical Fix)");
      expect(data.repairPrompt).toContain("Allowed Files Boundary");
    });

    it("returns 200 with strike 2 prompt and diff snapshot for test failures", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorOutput: "AssertionError: expected 'active' to be 'paused'",
          stageName: "test",
          strikeNumber: 2,
          diffSnapshot: "+const status = 'active';",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.diagnostic.category).toBe("test_assertion_failure");
      expect(data.repairPrompt).toContain("Strike 2 (Structural & Dependency Alignment)");
      expect(data.repairPrompt).toContain("+const status = 'active';");
    });

    it("returns 400 when errorOutput is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strikeNumber: 1,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });
  });
});
