import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UsageLedgerService,
  BudgetService,
  DailyBudgetExceededError,
  MonthlyBudgetExceededError,
} from "@/lib/ai/ledger";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("Usage Ledger & Budget Control Service", () => {
  let mockSupabase: any;
  let mockInsert: any;
  let mockSelect: any;

  beforeEach(() => {
    mockInsert = vi.fn();
    mockSelect = vi.fn();

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "cost_records") {
          return {
            insert: mockInsert.mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "cr-123",
                    user_id: "user-1",
                    model: "anthropic/claude-3.5-sonnet",
                    cost_inr: 5.04,
                  },
                  error: null,
                }),
              }),
            }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn().mockResolvedValue({
                    data: [{ cost_inr: 10.0 }, { cost_inr: 8.5 }],
                    error: null,
                  }),
                  lt: vi.fn().mockResolvedValue({
                    data: [{ cost_inr: 100.0 }, { cost_inr: 250.0 }],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }

        if (table === "user_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    daily_budget_inr: 25.0,
                    monthly_budget_inr: 750.0,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        return {};
      }),
    };
  });

  describe("UsageLedgerService", () => {
    it("persists inference cost record with calculated INR cost", async () => {
      const ledger = new UsageLedgerService(
        mockSupabase as SupabaseClient<Database>,
        84.0
      );

      const record = await ledger.recordUsage({
        userId: "user-1",
        runId: "run-abc",
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        promptTokens: 10000,
        completionTokens: 2000,
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const inserted = mockInsert.mock.calls[0][0];

      expect(inserted.user_id).toBe("user-1");
      expect(inserted.run_id).toBe("run-abc");
      expect(inserted.model).toBe("anthropic/claude-3.5-sonnet");
      expect(inserted.prompt_tokens).toBe(10000);
      expect(inserted.completion_tokens).toBe(2000);
      expect(inserted.total_tokens).toBe(12000);
      expect(inserted.cost_inr).toBe(5.04);
      expect(record.id).toBe("cr-123");
    });
  });

  describe("BudgetService", () => {
    it("calculates aggregated daily and monthly spending", async () => {
      const budgetService = new BudgetService(
        mockSupabase as SupabaseClient<Database>
      );

      const dailySpend = await budgetService.getDailySpendInr("user-1");
      expect(dailySpend).toBe(18.5); // 10.0 + 8.5

      const monthlySpend = await budgetService.getMonthlySpendInr("user-1");
      expect(monthlySpend).toBe(350.0); // 100.0 + 250.0
    });

    it("triggers 80% daily budget warning when spend reaches threshold", async () => {
      const budgetService = new BudgetService(
        mockSupabase as SupabaseClient<Database>
      );

      // Daily spend is 18.50, adding 2.00 makes it 20.50 (>= 20.00 / 80% of 25.00)
      const check = await budgetService.checkBudgetLimits("user-1", 2.0);

      expect(check.allowed).toBe(true);
      expect(check.isDailyWarningTriggered).toBe(true);
      expect(check.warningMessage).toContain("reached 80% of daily limit");
    });

    it("throws DailyBudgetExceededError when daily spend exceeds 25 INR limit", async () => {
      const budgetService = new BudgetService(
        mockSupabase as SupabaseClient<Database>
      );

      // Daily spend is 18.50, adding 8.00 makes it 26.50 (> 25.00)
      await expect(
        budgetService.checkBudgetLimits("user-1", 8.0)
      ).rejects.toThrow(DailyBudgetExceededError);
    });

    it("throws MonthlyBudgetExceededError when monthly spend exceeds 750 INR ceiling", async () => {
      // Mock high monthly spend
      mockSupabase.from = vi.fn((table: string) => {
        if (table === "cost_records") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn().mockResolvedValue({
                    data: [{ cost_inr: 5.0 }],
                    error: null,
                  }),
                  lt: vi.fn().mockResolvedValue({
                    data: [{ cost_inr: 745.0 }],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === "user_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    daily_budget_inr: 50.0,
                    monthly_budget_inr: 750.0,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const budgetService = new BudgetService(
        mockSupabase as SupabaseClient<Database>
      );

      // Monthly spend is 745.0, adding 10.0 makes it 755.0 (> 750.0)
      await expect(
        budgetService.checkBudgetLimits("user-1", 10.0)
      ).rejects.toThrow(MonthlyBudgetExceededError);
    });
  });
});
