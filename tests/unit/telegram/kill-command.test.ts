import { describe, it, expect, vi } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram /kill Command", () => {
  it("includes /kill command in /start help list", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("/kill");
    expect(response).toContain("Emergency Stop");
  });

  it("executes emergency stop with injected killService dependency", async () => {
    const mockKillService = {
      executeEmergencyStop: vi.fn().mockResolvedValue({
        terminatedProcessesCount: 3,
        cancelledRunsCount: 2,
        cancelledTasksCount: 4,
        revokedApprovalsCount: 1,
        auditLogId: "audit-123",
        durationMs: 45,
        subSecondPerformanceAchieved: true,
        source: "telegram",
        timestamp: "2026-11-17T13:40:00.000Z",
      }),
    };

    const response = await handleTelegramCommand("/kill", {
      killService: mockKillService as any,
      userId: "user-abc-123",
    });

    expect(mockKillService.executeEmergencyStop).toHaveBeenCalledWith("user-abc-123", "telegram");
    expect(response).toContain("EMERGENCY KILL SWITCH ACTIVATED");
    expect(response).toContain("Processes Terminated: `3`");
    expect(response).toContain("Agent Runs Cancelled: `2`");
    expect(response).toContain("Tasks Cancelled: `4`");
    expect(response).toContain("Approvals Revoked: `1`");
    expect(response).toContain("⚡ _Halted in 45 ms \\(< 1000ms target\\)_");
  });

  it("indicates performance warning icon when sub-second execution is not met", async () => {
    const mockKillService = {
      executeEmergencyStop: vi.fn().mockResolvedValue({
        terminatedProcessesCount: 0,
        cancelledRunsCount: 0,
        cancelledTasksCount: 0,
        revokedApprovalsCount: 0,
        auditLogId: "audit-456",
        durationMs: 1250,
        subSecondPerformanceAchieved: false,
        source: "telegram",
        timestamp: "2026-11-17T13:40:00.000Z",
      }),
    };

    const response = await handleTelegramCommand("/kill", {
      killService: mockKillService as any,
      userId: "user-abc-123",
    });

    expect(response).toContain("⚠️ _Halted in 1250 ms \\(< 1000ms target\\)_");
  });

  it("defaults to fallback userId when not provided", async () => {
    const mockKillService = {
      executeEmergencyStop: vi.fn().mockResolvedValue({
        terminatedProcessesCount: 0,
        cancelledRunsCount: 0,
        cancelledTasksCount: 0,
        revokedApprovalsCount: 0,
        auditLogId: "audit-789",
        durationMs: 30,
        subSecondPerformanceAchieved: true,
        source: "telegram",
        timestamp: "2026-11-17T13:40:00.000Z",
      }),
    };

    await handleTelegramCommand("/kill", {
      killService: mockKillService as any,
    });

    expect(mockKillService.executeEmergencyStop).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000000", "telegram");
  });
});
