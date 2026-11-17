import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram Bot /prune Command (REQ-OPS-03, NFR-SEC-04)", () => {
  let mockPrunerService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrunerService = {
      runFullMaintenance: vi.fn().mockResolvedValue({
        success: true,
        timestamp: "2026-11-17T12:00:00.000Z",
        durationMs: 38,
        isDryRun: false,
        artifactsPruned: 6,
        bytesReclaimed: 12 * 1024 * 1024,
        approvalsExpired: 2,
        tempFilesCleaned: 1,
        errors: [],
      }),
    };
  });

  it("lists /prune in /start command output", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("/prune");
  });

  it("formats maintenance summary into MarkdownV2 on /prune execution", async () => {
    const response = await handleTelegramCommand("/prune", {
      storagePrunerService: mockPrunerService,
    });

    expect(response).toContain("STORAGE RETENTION & PRUNING COMPLETE");
    expect(response).toContain("38ms");
    expect(response).toContain("12\\.00 MB");
    expect(response).toContain("6");
    expect(response).toContain("2");
    expect(response).toContain("main");
    expect(response).toContain("0 extraneous branches");
  });

  it("formats warnings and partial status when maintenance encounters errors", async () => {
    mockPrunerService.runFullMaintenance.mockResolvedValue({
      success: false,
      timestamp: "2026-11-17T12:00:00.000Z",
      durationMs: 50,
      isDryRun: false,
      artifactsPruned: 2,
      bytesReclaimed: 1024,
      approvalsExpired: 0,
      tempFilesCleaned: 0,
      errors: ["File access denied for old-log.tmp"],
    });

    const response = await handleTelegramCommand("/prune", {
      storagePrunerService: mockPrunerService,
    });

    expect(response).toContain("MAINTENANCE RUN WITH WARNINGS");
    expect(response).toContain("Errors Encountered");
    expect(response).toContain("File access denied");
  });

  it("handles unexpected service rejection gracefully", async () => {
    mockPrunerService.runFullMaintenance.mockRejectedValue(
      new Error("Database connection dropped")
    );

    const response = await handleTelegramCommand("/prune", {
      storagePrunerService: mockPrunerService,
    });

    expect(response).toContain("Maintenance Execution Failed");
    expect(response).toContain("Database connection dropped");
  });
});
