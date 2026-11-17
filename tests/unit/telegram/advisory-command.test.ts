import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram Bot /advisory Command (REQ-OPS-04)", () => {
  let mockAdvisoryEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdvisoryEngine = {
      generateAdvisoryReport: vi.fn().mockResolvedValue({
        timestamp: "2026-11-17T12:00:00.000Z",
        totalRecommendations: 2,
        criticalCount: 1,
        warningCount: 1,
        infoCount: 0,
        recommendations: [
          {
            id: "rec-1",
            severity: "critical",
            title: "Git Branch Safety Invariant Violation",
            description: "Non-main local branch detected.",
            remediation: {
              type: "clean_extraneous_branches",
              label: "Prune Extraneous Branches",
            },
          },
          {
            id: "rec-2",
            severity: "warning",
            title: "Daily Spending Burn (85%)",
            description: "Today's spend is approaching limit.",
          },
        ],
      }),
    };
  });

  it("lists /advisory in /start command output", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("/advisory");
  });

  it("formats recommendations into MarkdownV2 on /advisory execution", async () => {
    const response = await handleTelegramCommand("/advisory", {
      advisoryEngine: mockAdvisoryEngine,
    });

    expect(response).toContain("PROACTIVE MAINTENANCE ADVISORY");
    expect(response).toContain("2");
    expect(response).toContain("Git Branch Safety Invariant Violation");
    expect(response).toContain("Prune Extraneous Branches");
    expect(response).toContain("Daily Spending Burn");
  });

  it("returns nominal state when zero recommendations exist", async () => {
    mockAdvisoryEngine.generateAdvisoryReport.mockResolvedValue({
      timestamp: "2026-11-17T12:00:00.000Z",
      totalRecommendations: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      recommendations: [],
    });

    const response = await handleTelegramCommand("/advisory", {
      advisoryEngine: mockAdvisoryEngine,
    });

    expect(response).toContain("All Systems Nominal");
    expect(response).toContain("Zero maintenance warnings or anomalies detected");
  });

  it("handles advisory engine failures gracefully", async () => {
    mockAdvisoryEngine.generateAdvisoryReport.mockRejectedValue(
      new Error("Diagnostic analyzer timeout")
    );

    const response = await handleTelegramCommand("/advisory", {
      advisoryEngine: mockAdvisoryEngine,
    });

    expect(response).toContain("Advisory Engine Failed");
    expect(response).toContain("Diagnostic analyzer timeout");
  });
});
