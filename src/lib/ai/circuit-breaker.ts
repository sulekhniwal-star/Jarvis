import { CostRepository, CircuitBreakerStatus } from "../repositories/cost-repository";
import { isFreeModel, calculateCostInr } from "./models";

export class FailsafeCircuitBreakerError extends Error {
  constructor(
    public readonly originalError?: unknown,
    message?: string
  ) {
    super(
      message ??
        "[Failsafe Circuit Breaker] Cost tracking or database service is unavailable. Paid inference blocked to prevent unmetered usage."
    );
    this.name = "FailsafeCircuitBreakerError";
    Object.setPrototypeOf(this, FailsafeCircuitBreakerError.prototype);
  }
}

export class DailyBudgetExceededError extends Error {
  constructor(
    public readonly currentDailyInr: number,
    public readonly dailyLimitInr: number,
    public readonly attemptedCostInr: number
  ) {
    super(
      `[Budget Circuit Breaker] Daily spending limit of ₹${dailyLimitInr.toFixed(
        2
      )} exceeded. Current daily spend: ₹${currentDailyInr.toFixed(
        2
      )}, attempted inference: ₹${attemptedCostInr.toFixed(2)}.`
    );
    this.name = "DailyBudgetExceededError";
    Object.setPrototypeOf(this, DailyBudgetExceededError.prototype);
  }
}

export class MonthlyBudgetExceededError extends Error {
  constructor(
    public readonly currentMonthlyInr: number,
    public readonly monthlyLimitInr: number,
    public readonly attemptedCostInr: number
  ) {
    super(
      `[Budget Circuit Breaker] Monthly budget ceiling of ₹${monthlyLimitInr.toFixed(
        2
      )} exceeded. Current monthly spend: ₹${currentMonthlyInr.toFixed(
        2
      )}. Unlock emergency reserve (₹250) to continue.`
    );
    this.name = "MonthlyBudgetExceededError";
    Object.setPrototypeOf(this, MonthlyBudgetExceededError.prototype);
  }
}

export class HardCeilingExceededError extends Error {
  constructor(
    public readonly currentMonthlyInr: number,
    public readonly hardCeilingInr: number,
    public readonly attemptedCostInr: number
  ) {
    super(
      `[Budget Circuit Breaker] Inviolable monthly ceiling of ₹${hardCeilingInr.toFixed(
        2
      )} reached. Current monthly spend: ₹${currentMonthlyInr.toFixed(
        2
      )}. All further paid inference is locked until the next billing cycle.`
    );
    this.name = "HardCeilingExceededError";
    Object.setPrototypeOf(this, HardCeilingExceededError.prototype);
  }
}

export interface CircuitBreakerEvaluation {
  allowed: boolean;
  isFree: boolean;
  estimatedCostInr: number;
  currentDailyInr: number;
  currentMonthlyInr: number;
  dailyLimitInr: number;
  monthlyLimitInr: number;
  isEmergencyReserveActive: boolean;
  status: CircuitBreakerStatus;
  warning?: string;
}

export interface CircuitBreakerOptions {
  costRepository?: CostRepository;
}

export class InferenceCircuitBreaker {
  private readonly costRepo?: CostRepository;

  constructor(options: CircuitBreakerOptions = {}) {
    this.costRepo = options.costRepository;
  }

  /**
   * Evaluates an inference call against daily, monthly, and failsafe thresholds.
   * Free models bypass financial budget limits unconditionally.
   */
  public async evaluateInference(
    userId: string,
    model: string,
    estimatedPromptTokens: number = 2000,
    estimatedCompletionTokens: number = 1000
  ): Promise<CircuitBreakerEvaluation> {
    const isFree = isFreeModel(model);
    if (isFree) {
      return {
        allowed: true,
        isFree: true,
        estimatedCostInr: 0,
        currentDailyInr: 0,
        currentMonthlyInr: 0,
        dailyLimitInr: CostRepository.DEFAULT_DAILY_LIMIT_INR,
        monthlyLimitInr: CostRepository.DEFAULT_MONTHLY_LIMIT_INR,
        isEmergencyReserveActive: false,
        status: "nominal",
      };
    }

    const estimatedCostInr = calculateCostInr(
      model,
      estimatedPromptTokens,
      estimatedCompletionTokens
    );

    // NFR-REL-02: Failsafe Circuit Breaking
    // If the cost tracking repository is missing or encounters a database error,
    // paid AI model calls default to BLOCKED rather than proceeding unmetered.
    if (!this.costRepo) {
      throw new FailsafeCircuitBreakerError(
        undefined,
        "[Failsafe Circuit Breaker] CostRepository not configured. Paid inference blocked to prevent unmetered usage."
      );
    }

    let summary;
    try {
      summary = await this.costRepo.getSpendSummary(userId);
    } catch (err) {
      throw new FailsafeCircuitBreakerError(
        err,
        `[Failsafe Circuit Breaker] Database connection to Cost Ledger failed: ${
          (err as Error).message
        }. Paid inference blocked.`
      );
    }

    const projectedDaily = summary.todaySpendInr + estimatedCostInr;
    const projectedMonthly = summary.monthSpendInr + estimatedCostInr;

    // 1. Inviolable hard ceiling check (₹1,000.00)
    if (projectedMonthly > summary.absoluteCeilingInr) {
      throw new HardCeilingExceededError(
        summary.monthSpendInr,
        summary.absoluteCeilingInr,
        estimatedCostInr
      );
    }

    // 2. Daily limit check (₹25.00)
    if (projectedDaily > summary.dailyLimitInr) {
      throw new DailyBudgetExceededError(
        summary.todaySpendInr,
        summary.dailyLimitInr,
        estimatedCostInr
      );
    }

    // 3. Monthly limit check (₹750.00)
    if (projectedMonthly > summary.monthlyLimitInr) {
      if (!summary.isEmergencyReserveActive) {
        throw new MonthlyBudgetExceededError(
          summary.monthSpendInr,
          summary.monthlyLimitInr,
          estimatedCostInr
        );
      }
      // If emergency reserve is active and <= absolute ceiling, allowed
    }

    // 4. Daily warning advisory at 80% (₹20.00)
    let warning: string | undefined;
    const warningThreshold =
      summary.dailyLimitInr * 0.8; // e.g. ₹20.00
    if (projectedDaily >= warningThreshold) {
      warning = `Approaching daily limit: projected spend is ₹${projectedDaily.toFixed(
        2
      )} / ₹${summary.dailyLimitInr.toFixed(2)} (80%+ threshold).`;
    }

    return {
      allowed: true,
      isFree: false,
      estimatedCostInr,
      currentDailyInr: summary.todaySpendInr,
      currentMonthlyInr: summary.monthSpendInr,
      dailyLimitInr: summary.dailyLimitInr,
      monthlyLimitInr: summary.monthlyLimitInr,
      isEmergencyReserveActive: summary.isEmergencyReserveActive,
      status: summary.circuitBreakerStatus,
      warning,
    };
  }
}
