import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/verification/diff/route";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

describe("/api/verification/diff Route Handlers (REQ-VR-02)", () => {
  describe("GET /api/verification/diff", () => {
    it("returns rules, description, and churn limits", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.description).toContain("Automated Diff Inspector & Quality Gate");
      expect(data.rules).toBeDefined();
      expect(data.rules.forbiddenExtensions).toContain(".env");
      expect(data.rules.limits.singleFileChurnBlocker).toBe(800);
      expect(data.rules.limits.totalChurnBlocker).toBe(2000);
    });
  });

  describe("POST /api/verification/diff", () => {
    it("returns 200 with passed inspection report on clean diff", async () => {
      const cleanDiff = `diff --git a/src/lib/calc.ts b/src/lib/calc.ts
--- a/src/lib/calc.ts
+++ b/src/lib/calc.ts
@@ -1,3 +1,3 @@
 export function add(a: number, b: number): number {
-  return 0;
+  return a + b;
 }
`;
      const request = new NextRequest("http://localhost:3000/api/verification/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffPatch: cleanDiff,
          allowedFilePatterns: ["src/**"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.passed).toBe(true);
      expect(data.metrics.filesCount).toBe(1);
      expect(data.metrics.additions).toBe(1);
      expect(data.metrics.deletions).toBe(1);
      expect(data.violations).toHaveLength(0);
      expect(data.markdownSummary).toContain("Diff Inspection Quality Report");
      expect(data.markdownSummary).toContain("PASSED");
    });

    it("returns 200 with failed inspection report when boundary violation occurs", async () => {
      const forbiddenDiff = `diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1,1 @@
+SECRET_KEY=12345
`;
      const request = new NextRequest("http://localhost:3000/api/verification/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffPatch: forbiddenDiff,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.passed).toBe(false);
      expect(data.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "FORBIDDEN_FILE_PATTERN",
            severity: "blocker",
          }),
        ])
      );
      expect(data.markdownSummary).toContain("BLOCKED");
    });

    it("returns 400 when diffPatch is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedFilePatterns: ["src/**"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });

    it("returns 400 when body is invalid JSON or empty", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json string",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });
  });
});
