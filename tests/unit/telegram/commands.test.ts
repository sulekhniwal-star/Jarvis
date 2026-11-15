import { describe, it, expect, vi } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram Command Router", () => {
  it("handles /start command", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("Jarvis AI Command Centre");
    expect(response).toContain("/status");
    expect(response).toContain("/budget");
    expect(response).toContain("/projects");
  });

  describe("/status command", () => {
    it("returns active tasks when present", async () => {
      const mockFetchTasks = vi.fn().mockResolvedValue([
        { id: "1", title: "Refactor API", status: "running" },
        { id: "2", title: "Build UI", status: "planned" },
      ]);

      const response = await handleTelegramCommand("/status", {
        fetchTasks: mockFetchTasks,
      });

      expect(response).toContain("Jarvis System Status");
      expect(response).toContain("Refactor API");
      expect(response).toContain("Build UI");
      expect(response).toContain("Total listed: 2");
    });

    it("returns idle message when no tasks exist", async () => {
      const mockFetchTasks = vi.fn().mockResolvedValue([]);

      const response = await handleTelegramCommand("/status", {
        fetchTasks: mockFetchTasks,
      });

      expect(response).toContain("No active tasks in progress");
    });

    it("handles task repository errors gracefully", async () => {
      const mockFetchTasks = vi.fn().mockRejectedValue(new Error("Database offline"));

      const response = await handleTelegramCommand("/status", {
        fetchTasks: mockFetchTasks,
      });

      expect(response).toContain("System Status Warning");
      expect(response).toContain("Database offline");
    });

    it("surfaces git synchronization status and branch lock in /status output", async () => {
      const mockFetchTasks = vi.fn().mockResolvedValue([]);
      const mockSyncMonitor = {
        getSyncStatus: vi.fn().mockResolvedValue({
          branch: "main",
          isMainLocked: true,
          status: "ahead",
          aheadCount: 2,
          behindCount: 0,
          localShortSha: "260ffd2",
        }),
      };

      const response = await handleTelegramCommand("/status", {
        fetchTasks: mockFetchTasks,
        syncMonitor: mockSyncMonitor as any,
      });

      expect(response).toContain("Git Sync:");
      expect(response).toContain("main");
      expect(response).toContain("Locked");
      expect(response).toContain("2 ahead");
      expect(response).toContain("260ffd2");
    });
  });

  describe("/budget command", () => {
    it("returns daily and monthly spending against ceilings", async () => {
      const mockBudgetService = {
        getDailySpendInr: vi.fn().mockResolvedValue(1.5),
        getMonthlySpendInr: vi.fn().mockResolvedValue(45.25),
      };

      const response = await handleTelegramCommand("/budget", {
        budgetService: mockBudgetService,
      });

      expect(response).toContain("AI Inference Budget");
      expect(response).toContain("1\\.50");
      expect(response).toContain("45\\.25");
      expect(response).toContain("25\\.00");
      expect(response).toContain("750\\.00");
    });

    it("handles budget calculation errors gracefully", async () => {
      const mockBudgetService = {
        getDailySpendInr: vi.fn().mockRejectedValue(new Error("Ledger unavailable")),
        getMonthlySpendInr: vi.fn().mockResolvedValue(0),
      };

      const response = await handleTelegramCommand("/budget", {
        budgetService: mockBudgetService,
      });

      expect(response).toContain("Budget Retrieval Warning");
      expect(response).toContain("Ledger unavailable");
    });
  });

  describe("/projects command", () => {
    it("returns active projects when present", async () => {
      const mockFetchProjects = vi.fn().mockResolvedValue([
        {
          id: "p1",
          name: "Jarvis Core",
          repository_url: "https://github.com/user/jarvis",
        },
      ]);

      const response = await handleTelegramCommand("/projects", {
        fetchProjects: mockFetchProjects,
      });

      expect(response).toContain("Active Projects");
      expect(response).toContain("Jarvis Core");
    });

    it("returns empty notice when no projects exist", async () => {
      const mockFetchProjects = vi.fn().mockResolvedValue([]);

      const response = await handleTelegramCommand("/projects", {
        fetchProjects: mockFetchProjects,
      });

      expect(response).toContain("No projects registered yet");
    });

    it("surfaces git synchronization status for active projects", async () => {
      const mockFetchProjects = vi.fn().mockResolvedValue([
        {
          id: "p1",
          name: "Jarvis",
          repository_url: "https://github.com/user/jarvis",
        },
      ]);
      const mockSyncMonitor = {
        getSyncStatus: vi.fn().mockResolvedValue({
          branch: "main",
          isMainLocked: true,
          status: "synced",
        }),
      };

      const response = await handleTelegramCommand("/projects", {
        fetchProjects: mockFetchProjects,
        syncMonitor: mockSyncMonitor as any,
      });

      expect(response).toContain("Active Projects");
      expect(response).toContain("Jarvis");
      expect(response).toContain("Branch:");
      expect(response).toContain("main");
      expect(response).toContain("Synced");
    });
  });

  it("handles /cancel command", async () => {
    const mockIntakeService = {
      cancelClarification: vi.fn().mockResolvedValue("Clarification Cancelled"),
    };

    const response = await handleTelegramCommand("/cancel", {
      intakeService: mockIntakeService,
      userId: "test-user-id",
    });

    expect(response).toBe("Clarification Cancelled");
    expect(mockIntakeService.cancelClarification).toHaveBeenCalledWith("test-user-id");
  });

  describe("/approve and /reject commands", () => {
    it("handles /approve command with target ID", async () => {
      const mockDecisionService = {
        handleCliDecision: vi.fn().mockResolvedValue("PLAN APPROVED"),
      };

      const response = await handleTelegramCommand("/approve 11111111-2222-3333-4444-555555555555", {
        decisionService: mockDecisionService,
        userId: "test-user-id",
      });

      expect(response).toBe("PLAN APPROVED");
      expect(mockDecisionService.handleCliDecision).toHaveBeenCalledWith(
        "approve",
        "11111111-2222-3333-4444-555555555555",
        "test-user-id"
      );
    });

    it("handles /approve command without target ID", async () => {
      const response = await handleTelegramCommand("/approve");
      expect(response).toContain("Usage:");
      expect(response).toContain("/approve <id>");
    });

    it("handles /reject command with target ID and optional reason", async () => {
      const mockDecisionService = {
        handleCliDecision: vi.fn().mockResolvedValue("ACTION REJECTED"),
      };

      const response = await handleTelegramCommand(
        "/reject aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee Too dangerous to run",
        {
          decisionService: mockDecisionService,
          userId: "test-user-id",
        }
      );

      expect(response).toBe("ACTION REJECTED");
      expect(mockDecisionService.handleCliDecision).toHaveBeenCalledWith(
        "reject",
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "test-user-id",
        "Too dangerous to run"
      );
    });

    it("handles /reject command without target ID", async () => {
      const response = await handleTelegramCommand("/reject");
      expect(response).toContain("Usage:");
      expect(response).toContain("/reject <id> [reason]");
    });
  });

  it("handles unknown commands with fallback guidance", async () => {
    const response = await handleTelegramCommand("/foo_bar");
    expect(response).toContain("Unknown Command: /foo\\_bar");
    expect(response).toContain("Use /start to view available commands");
  });
});
