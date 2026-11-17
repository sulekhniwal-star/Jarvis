import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postKill } from "@/app/api/system/kill/route";
import { GET as getStatus } from "@/app/api/system/kill/status/route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("Kill Switch API Routes", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-test-123" } },
          error: null,
        }),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe("POST /api/system/kill", () => {
    it("executes emergency stop and returns 200 with termination details", async () => {
      const executeSpy = vi
        .spyOn(
          (await import("@/lib/system/kill-switch")).EmergencyKillSwitchService
            .prototype,
          "executeEmergencyStop"
        )
        .mockResolvedValueOnce({
          success: true,
          durationMs: 42.5,
          subSecondPerformanceAchieved: true,
          terminatedProcessesCount: 1,
          cancelledRunsCount: 1,
          cancelledTasksCount: 1,
          revokedApprovalsCount: 2,
          timestamp: new Date().toISOString(),
          source: "web",
        });

      const request = new NextRequest("http://localhost:3000/api/system/kill", {
        method: "POST",
        body: JSON.stringify({ source: "web" }),
      });

      const response = await postKill(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.terminatedProcessesCount).toBe(1);
      expect(json.subSecondPerformanceAchieved).toBe(true);
      expect(executeSpy).toHaveBeenCalledWith("user-test-123", "web");
    });
  });

  describe("GET /api/system/kill/status", () => {
    it("returns system kill switch status and active process counts", async () => {
      vi.spyOn(
        (await import("@/lib/system/kill-switch")).EmergencyKillSwitchService
          .prototype,
        "getKillSwitchStatus"
      ).mockResolvedValueOnce({
        activeProcessesCount: 0,
        activeRunsCount: 0,
        pendingApprovalsCount: 1,
        lastEmergencyStop: {
          timestamp: "2026-11-17T12:00:00Z",
          durationMs: 50,
          source: "web",
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/system/kill/status"
      );
      const response = await getStatus(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.pendingApprovalsCount).toBe(1);
      expect(json.lastEmergencyStop.source).toBe("web");
    });
  });
});
