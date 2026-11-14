import { FINANCIAL_LIMITS, BudgetExceededError } from '@jarvis/core';
import type { BudgetRepository, UserRepository, AuditRepository } from '@jarvis/database';
import type { BudgetSummary } from '@jarvis/shared-contracts';

export interface PreFlightCheckResult {
  allowed: boolean;
  isFree: boolean;
  estimatedCostInr: number;
  estimatedCostUsd: number;
  dailyRemainingInr: number;
  monthlyRemainingInr: number;
  requiresApproval: boolean;
  rejectionReason?: string;
}

export class BudgetManager {
  constructor(
    private readonly budgetRepo: BudgetRepository,
    private readonly userRepo: UserRepository,
    private readonly auditRepo: AuditRepository
  ) {}

  /**
   * Evaluates if a model invocation is financially permitted before calling external API.
   */
  async checkPreFlight(params: {
    userId: string;
    modelId: string;
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    pricingPerMillionPromptUsd?: number;
    pricingPerMillionCompletionUsd?: number;
  }): Promise<PreFlightCheckResult> {
    const isFree =
      params.modelId.endsWith(':free') ||
      params.modelId === 'openrouter/free' ||
      params.modelId.includes('/free');

    const todayIso = new Date().toISOString().slice(0, 10);
    const currentMonthPrefix = todayIso.slice(0, 7);

    const [userPrefs, currentDailySpend, currentMonthlySpend] = await Promise.all([
      this.userRepo.getPreferences(params.userId),
      this.budgetRepo.getDailySpendInr(params.userId, todayIso),
      this.budgetRepo.getMonthlySpendInr(params.userId, currentMonthPrefix),
    ]);

    const dailyLimit = userPrefs?.daily_budget_cap_inr ?? FINANCIAL_LIMITS.DAILY_SPEND_CAP_INR;
    const monthlyLimit = userPrefs?.monthly_budget_cap_inr ?? FINANCIAL_LIMITS.MONTHLY_SPEND_CAP_INR;
    const emergencyReserve = userPrefs?.emergency_reserve_inr ?? FINANCIAL_LIMITS.EMERGENCY_RESERVE_CAP_INR;
    const isReserveApproved = userPrefs?.emergency_reserve_approved ?? false;

    const dailyRemaining = Math.max(0, dailyLimit - currentDailySpend);
    const effectiveMonthlyCap = isReserveApproved
      ? Math.min(monthlyLimit + emergencyReserve, FINANCIAL_LIMITS.MAX_MONTHLY_LIMIT_INR)
      : monthlyLimit;
    const monthlyRemaining = Math.max(0, effectiveMonthlyCap - currentMonthlySpend);

    if (isFree) {
      return {
        allowed: true,
        isFree: true,
        estimatedCostInr: 0,
        estimatedCostUsd: 0,
        dailyRemainingInr: dailyRemaining,
        monthlyRemainingInr: monthlyRemaining,
        requiresApproval: false,
      };
    }

    // Compute estimated cost for paid model
    const promptPricePerM = params.pricingPerMillionPromptUsd ?? 3.0; // default estimated $3/M
    const completionPricePerM = params.pricingPerMillionCompletionUsd ?? 15.0; // default $15/M

    const estimatedUsd =
      (params.estimatedPromptTokens / 1_000_000) * promptPricePerM +
      (params.estimatedCompletionTokens / 1_000_000) * completionPricePerM;

    const estimatedInr = Number((estimatedUsd * FINANCIAL_LIMITS.DEFAULT_USD_TO_INR_RATE).toFixed(4));

    // Policy Check: Paid models require explicit human approval when prefer_free_models is set
    if (userPrefs?.prefer_free_models) {
      const reason = 'Paid AI models require explicit human approval. Free models preferred by policy.';
      return {
        allowed: false,
        isFree: false,
        estimatedCostInr: estimatedInr,
        estimatedCostUsd: estimatedUsd,
        dailyRemainingInr: dailyRemaining,
        monthlyRemainingInr: monthlyRemaining,
        requiresApproval: true,
        rejectionReason: reason,
      };
    }

    // Daily Limit Check
    if (currentDailySpend + estimatedInr > dailyLimit) {
      const reason = `Daily limit exceeded: Current spend INR ${currentDailySpend.toFixed(2)} + projected INR ${estimatedInr.toFixed(2)} exceeds daily cap INR ${dailyLimit.toFixed(2)}.`;
      await this.auditRepo.append({
        userId: params.userId,
        eventType: 'BUDGET_LIMIT_BLOCKED',
        severity: 'WARNING',
        details: { reason, currentDailySpend, projectedInr: estimatedInr, dailyLimit },
      });

      return {
        allowed: false,
        isFree: false,
        estimatedCostInr: estimatedInr,
        estimatedCostUsd: estimatedUsd,
        dailyRemainingInr: dailyRemaining,
        monthlyRemainingInr: monthlyRemaining,
        requiresApproval: true,
        rejectionReason: reason,
      };
    }

    // Monthly Limit Check
    if (currentMonthlySpend + estimatedInr > effectiveMonthlyCap) {
      const reason = `Monthly limit exceeded: Current spend INR ${currentMonthlySpend.toFixed(2)} + projected INR ${estimatedInr.toFixed(2)} exceeds monthly cap INR ${effectiveMonthlyCap.toFixed(2)}.`;
      await this.auditRepo.append({
        userId: params.userId,
        eventType: 'BUDGET_LIMIT_BLOCKED',
        severity: 'WARNING',
        details: { reason, currentMonthlySpend, projectedInr: estimatedInr, effectiveMonthlyCap },
      });

      return {
        allowed: false,
        isFree: false,
        estimatedCostInr: estimatedInr,
        estimatedCostUsd: estimatedUsd,
        dailyRemainingInr: dailyRemaining,
        monthlyRemainingInr: monthlyRemaining,
        requiresApproval: true,
        rejectionReason: reason,
      };
    }

    // Paid model is within budget but strictly requires human approval
    return {
      allowed: true,
      isFree: false,
      estimatedCostInr: estimatedInr,
      estimatedCostUsd: estimatedUsd,
      dailyRemainingInr: dailyRemaining,
      monthlyRemainingInr: monthlyRemaining,
      requiresApproval: true,
    };
  }

  /**
   * Confirms and records an actual or estimated transaction in the immutable ledger.
   */
  async recordUsage(params: {
    userId: string;
    agentRunId?: string | null;
    amountInr: number;
    amountUsd: number;
    modelId: string;
    isActual: boolean;
    provider?: string;
  }): Promise<void> {
    const todayIso = new Date().toISOString().slice(0, 10);

    await this.budgetRepo.appendLedger({
      userId: params.userId,
      agentRunId: params.agentRunId ?? null,
      billingDate: todayIso,
      amountInr: params.amountInr,
      amountUsd: params.amountUsd,
      modelId: params.modelId,
      provider: params.provider ?? 'OpenRouter',
      isActual: params.isActual,
    });

    await this.auditRepo.append({
      userId: params.userId,
      eventType: 'BUDGET_USAGE_RECORDED',
      severity: 'INFO',
      details: {
        amountInr: params.amountInr,
        amountUsd: params.amountUsd,
        modelId: params.modelId,
        isActual: params.isActual,
      },
    });
  }

  /**
   * Returns current budget ledger summary for dashboard / mobile views.
   */
  async getSummary(userId: string): Promise<BudgetSummary> {
    const todayIso = new Date().toISOString().slice(0, 10);
    const currentMonthPrefix = todayIso.slice(0, 7);

    const [userPrefs, currentDailySpend, currentMonthlySpend] = await Promise.all([
      this.userRepo.getPreferences(userId),
      this.budgetRepo.getDailySpendInr(userId, todayIso),
      this.budgetRepo.getMonthlySpendInr(userId, currentMonthPrefix),
    ]);

    const dailyLimit = userPrefs?.daily_budget_cap_inr ?? FINANCIAL_LIMITS.DAILY_SPEND_CAP_INR;
    const monthlyLimit = userPrefs?.monthly_budget_cap_inr ?? FINANCIAL_LIMITS.MONTHLY_SPEND_CAP_INR;
    const emergencyReserve = userPrefs?.emergency_reserve_inr ?? FINANCIAL_LIMITS.EMERGENCY_RESERVE_CAP_INR;
    const isReserveApproved = userPrefs?.emergency_reserve_approved ?? false;

    const effectiveMonthlyCap = isReserveApproved
      ? Math.min(monthlyLimit + emergencyReserve, FINANCIAL_LIMITS.MAX_MONTHLY_LIMIT_INR)
      : monthlyLimit;

    return {
      dailySpendInr: currentDailySpend,
      dailyLimitInr: dailyLimit,
      monthlySpendInr: currentMonthlySpend,
      monthlyLimitInr: effectiveMonthlyCap,
      emergencyReserveInr: emergencyReserve,
      emergencyReserveApproved: isReserveApproved,
      isExceeded: currentDailySpend >= dailyLimit || currentMonthlySpend >= effectiveMonthlyCap,
    };
  }
}
