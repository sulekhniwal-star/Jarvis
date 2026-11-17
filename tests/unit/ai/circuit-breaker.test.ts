import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  InferenceCircuitBreaker,
  FailsafeCircuitBreakerError,
  DailyBudgetExceededError,
  MonthlyBudgetExceededError,
  HardCeilingExceededError,
} from "@/lib/ai/circuit-breaker";
import { CostRepository } from "@/lib/repositories/cost-repository";

describe("InferenceCircuitBreaker", () => {
  let mockCostRepo: any;

  beforeEach(() => {
    mockCostRepo = {
      getSpendSummary: vi.fn().mockResolvedValue({
        todaySpendInr: 10.0,
        monthSpendInr: 150.0,
        dailyLimitInr: 25.0,
        monthlyLimitInr: 750.0,
        emergencyReserveInr: 250.0,
        absoluteCeilingInr: 1000.0,
        isEmergencyReserveActive: false,
        circuitBreakerStatus: "nominal",
        recentRecords: [],
        spendByModel: {},
      }),
    };
  });

  it("unconditionally allows free models without financial checks", async () => {
    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });
    const result = await breaker.evaluateInference(
      "user-1",
      "meta-llama/llama-3.3-70b-instruct:free"
    );

    expect(result.allowed).toBe(true);
    expect(result.isFree).toBe(true);
    expect(result.estimatedCostInr).toBe(0);
    expect(mockCostRepo.getSpendSummary).not.toHaveBeenCalled();
  });

  it("enforces NFR-REL-02: failsafe blocks paid inference if repository is missing", async () => {
    const breaker = new InferenceCircuitBreaker({}); // No costRepository

    await expect(
      breaker.evaluateInference("user-1", "anthropic/claude-3.5-sonnet")
    ).rejects.toThrow(FailsafeCircuitBreakerError);
  });

  it("enforces NFR-REL-02: failsafe blocks paid inference if database errors out", async () => {
    mockCostRepo.getSpendSummary.mockRejectedValue(
      new Error("Database connection refused")
    );
    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });

    await expect(
      breaker.evaluateInference("user-1", "anthropic/claude-3.5-sonnet")
    ).rejects.toThrow(FailsafeCircuitBreakerError);
  });

  it("permits paid inference when well within daily and monthly limits", async () => {
    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });
    const result = await breaker.evaluateInference(
      "user-1",
      "anthropic/claude-3.5-sonnet",
      2000,
      1000
    );

    expect(result.allowed).toBe(true);
    expect(result.isFree).toBe(false);
    expect(result.currentDailyInr).toBe(10.0);
    expect(result.currentMonthlyInr).toBe(150.0);
    expect(result.warning).toBeUndefined();
  });

  it("emits 80% daily warning when approaching the daily threshold", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 21.0, // >= 20 (80% of 25)
      monthSpendInr: 150.0,
      dailyLimitInr: 25.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: false,
      circuitBreakerStatus: "nominal",
      recentRecords: [],
      spendByModel: {},
    });

    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });
    const result = await breaker.evaluateInference(
      "user-1",
      "anthropic/claude-3.5-sonnet",
      500,
      200
    );

    expect(result.allowed).toBe(true);
    expect(result.warning).toContain("80%+ threshold");
  });

  it("trips circuit breaker when daily spending limit is exceeded", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 24.5,
      monthSpendInr: 150.0,
      dailyLimitInr: 25.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: false,
      circuitBreakerStatus: "nominal",
      recentRecords: [],
      spendByModel: {},
    });

    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });

    // Requesting expensive model that pushes spend past ₹25.00
    await expect(
      breaker.evaluateInference(
        "user-1",
        "anthropic/claude-3.5-sonnet",
        10000,
        5000
      )
    ).rejects.toThrow(DailyBudgetExceededError);
  });

  it("trips circuit breaker when monthly budget is exceeded without emergency reserve", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 5.0,
      monthSpendInr: 749.5,
      dailyLimitInr: 25.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: false,
      circuitBreakerStatus: "tripped_monthly",
      recentRecords: [],
      spendByModel: {},
    });

    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });

    await expect(
      breaker.evaluateInference(
        "user-1",
        "anthropic/claude-3.5-sonnet",
        2000,
        1000
      )
    ).rejects.toThrow(MonthlyBudgetExceededError);
  });

  it("permits inference past ₹750 when emergency reserve is unlocked", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 5.0,
      monthSpendInr: 800.0,
      dailyLimitInr: 25.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: true, // Emergency reserve unlocked!
      circuitBreakerStatus: "emergency_unlocked",
      recentRecords: [],
      spendByModel: {},
    });

    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });
    const result = await breaker.evaluateInference(
      "user-1",
      "anthropic/claude-3.5-sonnet",
      2000,
      1000
    );

    expect(result.allowed).toBe(true);
    expect(result.isEmergencyReserveActive).toBe(true);
  });

  it("enforces inviolable hard ceiling at ₹1,000 even with emergency reserve", async () => {
    mockCostRepo.getSpendSummary.mockResolvedValue({
      todaySpendInr: 5.0,
      monthSpendInr: 999.5,
      dailyLimitInr: 25.0,
      monthlyLimitInr: 750.0,
      emergencyReserveInr: 250.0,
      absoluteCeilingInr: 1000.0,
      isEmergencyReserveActive: true,
      circuitBreakerStatus: "emergency_unlocked",
      recentRecords: [],
      spendByModel: {},
    });

    const breaker = new InferenceCircuitBreaker({ costRepository: mockCostRepo });

    await expect(
      breaker.evaluateInference(
        "user-1",
        "anthropic/claude-3.5-sonnet",
        10000,
        5000
      )
    ).rejects.toThrow(HardCeilingExceededError);
  });
});
