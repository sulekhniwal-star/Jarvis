import { SupabaseClient } from "@supabase/supabase-js";
import { Database, CostRecord } from "@/types/database";
import { calculateCostInr, DEFAULT_USD_INR_EXCHANGE_RATE } from "./models";

export interface RecordUsageDTO {
  userId: string;
  runId?: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costInr?: number;
  isEstimated?: boolean;
}

export interface BudgetCheckResult {
  allowed: boolean;
  dailySpendInr: number;
  monthlySpendInr: number;
  dailyLimitInr: number;
  monthlyLimitInr: number;
  isDailyWarningTriggered: boolean;
  warningMessage?: string;
}

export class DailyBudgetExceededError extends Error {
  constructor(
    public readonly dailySpendInr: number,
    public readonly dailyLimitInr: number,
    public readonly requestedCostInr: number
  ) {
    super(
      `[Budget Error] Daily spending limit of ₹${dailyLimitInr.toFixed(2)} exceeded. Current daily spend: ₹${dailySpendInr.toFixed(2)}, attempted inference: ₹${requestedCostInr.toFixed(2)}.`
    );
    this.name = "DailyBudgetExceededError";
    Object.setPrototypeOf(this, DailyBudgetExceededError.prototype);
  }
}

export class MonthlyBudgetExceededError extends Error {
  constructor(
    public readonly monthlySpendInr: number,
    public readonly monthlyLimitInr: number,
    public readonly requestedCostInr: number
  ) {
    super(
      `[Budget Error] Monthly budget ceiling of ₹${monthlyLimitInr.toFixed(2)} exceeded. Current monthly spend: ₹${monthlySpendInr.toFixed(2)}, attempted inference: ₹${requestedCostInr.toFixed(2)}.`
    );
    this.name = "MonthlyBudgetExceededError";
    Object.setPrototypeOf(this, MonthlyBudgetExceededError.prototype);
  }
}

export class UsageLedgerService {
  private readonly client: SupabaseClient<Database>;
  private readonly exchangeRate: number;

  constructor(
    client: SupabaseClient<Database>,
    exchangeRate: number = Number(process.env.USD_INR_EXCHANGE_RATE) || DEFAULT_USD_INR_EXCHANGE_RATE
  ) {
    this.client = client;
    this.exchangeRate = exchangeRate;
  }

  public async recordUsage(params: RecordUsageDTO): Promise<CostRecord> {
    const totalTokens = params.promptTokens + params.completionTokens;
    const costInr =
      params.costInr !== undefined
        ? params.costInr
        : calculateCostInr(
            params.model,
            params.promptTokens,
            params.completionTokens,
            this.exchangeRate
          );

    const { data: record, error } = await this.client
      .from("cost_records")
      .insert({
        user_id: params.userId,
        run_id: params.runId ?? null,
        provider: params.provider,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: totalTokens,
        cost_inr: costInr,
        is_estimated: params.isEstimated ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record cost usage: ${error.message}`);
    }

    return record;
  }
}

export class BudgetService {
  public static readonly DEFAULT_DAILY_LIMIT_INR = 25.0;
  public static readonly DEFAULT_DAILY_WARNING_THRESHOLD_INR = 20.0;
  public static readonly DEFAULT_MONTHLY_LIMIT_INR = 750.0;
  public static readonly EMERGENCY_RESERVE_CEILING_INR = 1000.0;

  private readonly client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  public async getDailySpendInr(userId: string, date: Date = new Date()): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const { data, error } = await this.client
      .from("cost_records")
      .select("cost_inr")
      .eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (error) {
      throw new Error(`Failed to calculate daily spend: ${error.message}`);
    }

    const total = (data || []).reduce(
      (sum, row) => sum + Number(row.cost_inr || 0),
      0
    );

    return Number(total.toFixed(4));
  }

  public async getMonthlySpendInr(userId: string, date: Date = new Date()): Promise<number> {
    const startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

    const { data, error } = await this.client
      .from("cost_records")
      .select("cost_inr")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString())
      .lt("created_at", nextMonth.toISOString());

    if (error) {
      throw new Error(`Failed to calculate monthly spend: ${error.message}`);
    }

    const total = (data || []).reduce(
      (sum, row) => sum + Number(row.cost_inr || 0),
      0
    );

    return Number(total.toFixed(4));
  }

  public async checkBudgetLimits(
    userId: string,
    estimatedCostInr: number = 0
  ): Promise<BudgetCheckResult> {
    // Check if user has customized budget limits in user_profiles
    const { data: profile } = await this.client
      .from("user_profiles")
      .select("daily_budget_inr, monthly_budget_inr")
      .eq("id", userId)
      .single();

    const dailyLimit = profile?.daily_budget_inr ?? BudgetService.DEFAULT_DAILY_LIMIT_INR;
    const monthlyLimit = profile?.monthly_budget_inr ?? BudgetService.DEFAULT_MONTHLY_LIMIT_INR;
    const warningThreshold = dailyLimit * 0.8; // 80% threshold

    const [dailySpend, monthlySpend] = await Promise.all([
      this.getDailySpendInr(userId),
      this.getMonthlySpendInr(userId),
    ]);

    const projectedDaily = dailySpend + estimatedCostInr;
    const projectedMonthly = monthlySpend + estimatedCostInr;

    if (projectedDaily > dailyLimit) {
      throw new DailyBudgetExceededError(dailySpend, dailyLimit, estimatedCostInr);
    }

    if (projectedMonthly > monthlyLimit) {
      throw new MonthlyBudgetExceededError(monthlySpend, monthlyLimit, estimatedCostInr);
    }

    const isDailyWarningTriggered = projectedDaily >= warningThreshold;
    const warningMessage = isDailyWarningTriggered
      ? `Daily spend ₹${projectedDaily.toFixed(2)} has reached 80% of daily limit ₹${dailyLimit.toFixed(2)}.`
      : undefined;

    return {
      allowed: true,
      dailySpendInr: dailySpend,
      monthlySpendInr: monthlySpend,
      dailyLimitInr: dailyLimit,
      monthlyLimitInr: monthlyLimit,
      isDailyWarningTriggered,
      warningMessage,
    };
  }
}
