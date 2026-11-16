import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/verification/route";

vi.mock("@/lib/agents/engine/verification/verification-harness", () => {
  return {
    VerificationHarness: vi.fn().mockImplementation(() => ({
      runAll: vi.fn().mockResolvedValue({
        status: "passed",
        overallDurationMs: 420,
        stages: [
          {
            stage: "lint",
            command: "eslint .",
            status: "passed",
            exitCode: 0,
            stdout: "",
            stderr: "",
            durationMs: 50,
          },
          {
            stage: "test",
            command: "vitest run",
            status: "passed",
            exitCode: 0,
            stdout: "Tests 5 passed",
            stderr: "",
            durationMs: 370,
            testMetrics: { passed: 5, failed: 0, skipped: 0 },
          },
        ],
        summary: { passed: 5, failed: 0, skipped: 0, durationMs: 420 },
        artifacts: [
          {
            name: "test.log",
            artifactType: "test_log",
            mimeType: "text/plain",
            content: "log content",
          },
        ],
      }),
    })),
  };
});

describe("/api/verification Route Handlers (REQ-VR-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/verification", () => {
    it("returns supported stages and default configurations", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.supportedStages).toEqual([
        "lint",
        "typecheck",
        "test",
        "build",
        "custom",
      ]);
      expect(data.defaultFailFast).toBe(true);
      expect(data.defaultTimeoutMs).toBe(60000);
    });
  });

  describe("POST /api/verification", () => {
    it("executes verification harness on valid payload and returns 200 with result", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: ["lint", "test"],
          failFast: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("passed");
      expect(data.stages).toHaveLength(2);
      expect(data.summary.passed).toBe(5);
    });

    it("returns 400 when an invalid stage name is provided", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: ["non_existent_stage"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });
  });
});
