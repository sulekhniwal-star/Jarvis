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

  it("handles unknown commands with fallback guidance", async () => {
    const response = await handleTelegramCommand("/foo_bar");
    expect(response).toContain("Unknown Command: /foo\\_bar");
    expect(response).toContain("Use /start to view available commands");
  });
});
