import { describe, it, expect, vi, beforeEach } from "vitest";
import { CostRepository } from "@/lib/repositories/cost-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("CostRepository", () => {
  let mockSupabase: any;
  let mockCostRecordsInsert: any;
  let mockUserProfileUpdate: any;

  beforeEach(() => {
    mockCostRecordsInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "cr-1",
            user_id: "user-1",
            provider: "openrouter",
            model: "anthropic/claude-3.5-sonnet",
            prompt_tokens: 1000,
            completion_tokens: 500,
            total_tokens: 1500,
            cost_inr: 0.756,
            is_estimated: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    mockUserProfileUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "cost_records") {
          return {
            insert: mockCostRecordsInsert,
            select: vi.fn((cols?: string, options?: any) => ({
              eq: vi.fn((field: string, val: string) => ({
                gte: vi.fn(() => {
                  const promise = Promise.resolve({
                    data: [
                      {
                        model: "anthropic/claude-3.5-sonnet",
                        cost_inr: 150.0,
                        total_tokens: 25000,
                      },
                      {
                        model: "openai/gpt-4o",
                        cost_inr: 50.0,
                        total_tokens: 12000,
                      },
                    ],
                    error: null,
                  });
                  return Object.assign(promise, {
                    lte: vi.fn().mockResolvedValue({
                      data: [{ cost_inr: 5.0 }, { cost_inr: 3.5 }],
                      error: null,
                    }),
                    lt: vi.fn().mockResolvedValue({
                      data: [
                        {
                          model: "anthropic/claude-3.5-sonnet",
                          cost_inr: 150.0,
                          total_tokens: 25000,
                        },
                        {
                          model: "openai/gpt-4o",
                          cost_inr: 50.0,
                          total_tokens: 12000,
                        },
                      ],
                      error: null,
                    }),
                  });
                }),
                order: vi.fn(() => ({
                  range: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "cr-1",
                        user_id: "user-1",
                        model: "anthropic/claude-3.5-sonnet",
                        cost_inr: 5.0,
                      },
                    ],
                    count: 1,
                    error: null,
                  }),
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "cr-1",
                        user_id: "user-1",
                        model: "anthropic/claude-3.5-sonnet",
                        cost_inr: 5.0,
                      },
                    ],
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
                    id: "user-1",
                    daily_budget_inr: 25.0,
                    monthly_budget_inr: 750.0,
                    preferences: {
                      emergency_reserve: {
                        unlocked_month: "2026-11",
                        unlocked_at: "2026-11-17T00:00:00Z",
                      },
                    },
                  },
                  error: null,
                }),
              })),
            })),
            update: mockUserProfileUpdate,
          };
        }

        return {};
      }),
    };
  });

  it("records inference usage with token counts and computed INR cost", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    const record = await repo.recordUsage("user-1", {
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      promptTokens: 1000,
      completionTokens: 500,
    });

    expect(record.id).toBe("cr-1");
    expect(mockCostRecordsInsert).toHaveBeenCalledTimes(1);
    expect(mockCostRecordsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      })
    );
  });

  it("calculates daily spend accurately from cost_records", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    const dailySpend = await repo.getDailySpendInr("user-1");

    expect(dailySpend).toBe(8.5); // 5.0 + 3.5
  });

  it("calculates monthly spend accurately from cost_records", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    const monthlySpend = await repo.getMonthlySpendInr("user-1");

    expect(monthlySpend).toBe(200.0); // 150.0 + 50.0
  });

  it("checks emergency reserve status correctly from user_profiles preferences", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    const isUnlocked = await repo.isEmergencyReserveUnlocked(
      "user-1",
      new Date("2026-11-17T12:00:00Z")
    );

    expect(isUnlocked).toBe(true);

    const isUnlockedNextYear = await repo.isEmergencyReserveUnlocked(
      "user-1",
      new Date("2027-01-01T12:00:00Z")
    );
    expect(isUnlockedNextYear).toBe(false);
  });

  it("unlocks emergency reserve and updates user preferences", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    await repo.unlockEmergencyReserve("user-1", "Testing production surge");

    expect(mockUserProfileUpdate).toHaveBeenCalledTimes(1);
    expect(mockUserProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: expect.objectContaining({
          emergency_reserve: expect.objectContaining({
            authorized_by: "user-1",
            reason: "Testing production surge",
          }),
        }),
      })
    );
  });

  it("generates comprehensive spend summary with model breakdown", async () => {
    const repo = new CostRepository(mockSupabase as SupabaseClient<Database>);
    const summary = await repo.getSpendSummary("user-1");

    expect(summary.dailyLimitInr).toBe(25.0);
    expect(summary.monthlyLimitInr).toBe(750.0);
    expect(summary.emergencyReserveInr).toBe(250.0);
    expect(summary.absoluteCeilingInr).toBe(1000.0);
    expect(summary.isEmergencyReserveActive).toBe(true);
    expect(summary.circuitBreakerStatus).toBe("nominal");
    expect(summary.spendByModel["anthropic/claude-3.5-sonnet"]).toBeDefined();
  });
});
