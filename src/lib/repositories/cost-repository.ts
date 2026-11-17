import { BaseRepository } from "./base";
import { CostRecord } from "@/types/database";
import { PaginatedResult, RepositoryError } from "./types";
import { calculateCostInr, DEFAULT_USD_INR_EXCHANGE_RATE } from "../ai/models";

export interface CreateCostRecordDTO {
  runId?: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costInr?: number;
  isEstimated?: boolean;
}

export interface CostFilterOptions {
  model?: string;
  provider?: string;
  runId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export type CircuitBreakerStatus =
  | "nominal"
  | "tripped_daily"
  | "tripped_monthly"
  | "emergency_unlocked"
  | "hard_locked";

export interface CostSpendSummary {
  todaySpendInr: number;
  monthSpendInr: number;
  dailyLimitInr: number;
  monthlyLimitInr: number;
  emergencyReserveInr: number;
  absoluteCeilingInr: number;
  isEmergencyReserveActive: boolean;
  circuitBreakerStatus: CircuitBreakerStatus;
  recentRecords: CostRecord[];
  spendByModel: Record<
    string,
    { totalInr: number; totalTokens: number; callCount: number }
  >;
}

export class CostRepository extends BaseRepository {
  public static readonly DEFAULT_DAILY_LIMIT_INR = 25.0;
  public static readonly DEFAULT_DAILY_WARNING_THRESHOLD_INR = 20.0;
  public static readonly DEFAULT_MONTHLY_LIMIT_INR = 750.0;
  public static readonly EMERGENCY_RESERVE_INR = 250.0;
  public static readonly ABSOLUTE_MONTHLY_CEILING_INR = 1000.0;

  public async recordUsage(
    userId: string,
    data: CreateCostRecordDTO
  ): Promise<CostRecord> {
    const totalTokens = data.promptTokens + data.completionTokens;
    const costInr =
      data.costInr !== undefined
        ? data.costInr
        : calculateCostInr(
            data.model,
            data.promptTokens,
            data.completionTokens,
            Number(process.env.USD_INR_EXCHANGE_RATE) || DEFAULT_USD_INR_EXCHANGE_RATE
          );

    try {
      const { data: record, error } = await this.client
        .from("cost_records")
        .insert({
          user_id: userId,
          run_id: data.runId ?? null,
          provider: data.provider,
          model: data.model,
          prompt_tokens: data.promptTokens,
          completion_tokens: data.completionTokens,
          total_tokens: totalTokens,
          cost_inr: costInr,
          is_estimated: data.isEstimated ?? false,
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, "Failed to record inference usage");
      }

      return record;
    } catch (err) {
      this.handleError(err, "Failed to record inference usage");
    }
  }

  public async listCostRecords(
    userId: string,
    filters: CostFilterOptions = {}
  ): Promise<PaginatedResult<CostRecord>> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    try {
      let query = this.client
        .from("cost_records")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      if (filters.model) {
        query = query.eq("model", filters.model);
      }
      if (filters.provider) {
        query = query.eq("provider", filters.provider);
      }
      if (filters.runId) {
        query = query.eq("run_id", filters.runId);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        this.handleError(error, "Failed to list cost records");
      }

      return {
        data: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      };
    } catch (err) {
      this.handleError(err, "Failed to list cost records");
    }
  }

  public async getDailySpendInr(
    userId: string,
    date: Date = new Date()
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    try {
      const { data, error } = await this.client
        .from("cost_records")
        .select("cost_inr")
        .eq("user_id", userId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (error) {
        this.handleError(error, "Failed to compute daily spend");
      }

      const total = (data || []).reduce(
        (acc, row) => acc + Number(row.cost_inr || 0),
        0
      );

      return Number(total.toFixed(4));
    } catch (err) {
      this.handleError(err, "Failed to compute daily spend");
    }
  }

  public async getMonthlySpendInr(
    userId: string,
    date: Date = new Date()
  ): Promise<number> {
    const startOfMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
    );
    const nextMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
    );

    try {
      const { data, error } = await this.client
        .from("cost_records")
        .select("cost_inr")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", nextMonth.toISOString());

      if (error) {
        this.handleError(error, "Failed to compute monthly spend");
      }

      const total = (data || []).reduce(
        (acc, row) => acc + Number(row.cost_inr || 0),
        0
      );

      return Number(total.toFixed(4));
    } catch (err) {
      this.handleError(err, "Failed to compute monthly spend");
    }
  }

  public async isEmergencyReserveUnlocked(
    userId: string,
    date: Date = new Date()
  ): Promise<boolean> {
    const currentMonthKey = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    try {
      const { data, error } = await this.client
        .from("user_profiles")
        .select("preferences")
        .eq("id", userId)
        .single();

      if (error) {
        return false;
      }

      const preferences = data?.preferences as Record<string, any> | null;
      const reserve = preferences?.emergency_reserve;

      return reserve?.unlocked_month === currentMonthKey;
    } catch {
      return false;
    }
  }

  public async unlockEmergencyReserve(
    userId: string,
    reason: string = "Owner authorized emergency reserve"
  ): Promise<void> {
    const now = new Date();
    const currentMonthKey = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    try {
      const { data: profile, error: fetchErr } = await this.client
        .from("user_profiles")
        .select("preferences")
        .eq("id", userId)
        .single();

      if (fetchErr) {
        this.handleError(fetchErr, "Failed to retrieve user profile");
      }

      const existingPreferences =
        (profile?.preferences as Record<string, any>) || {};

      const updatedPreferences = {
        ...existingPreferences,
        emergency_reserve: {
          unlocked_month: currentMonthKey,
          unlocked_at: now.toISOString(),
          authorized_by: userId,
          reason,
        },
      };

      const { error: updateErr } = await this.client
        .from("user_profiles")
        .update({
          preferences: updatedPreferences,
          updated_at: now.toISOString(),
        })
        .eq("id", userId);

      if (updateErr) {
        this.handleError(updateErr, "Failed to unlock emergency reserve");
      }
    } catch (err) {
      this.handleError(err, "Failed to unlock emergency reserve");
    }
  }

  public async getSpendSummary(userId: string): Promise<CostSpendSummary> {
    try {
      const now = new Date();
      const startOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );

      const [
        todaySpendInr,
        monthSpendInr,
        isEmergencyReserveActive,
        profileResult,
        recentResult,
        monthRecordsResult,
      ] = await Promise.all([
        this.getDailySpendInr(userId, now),
        this.getMonthlySpendInr(userId, now),
        this.isEmergencyReserveUnlocked(userId, now),
        this.client
          .from("user_profiles")
          .select("daily_budget_inr, monthly_budget_inr")
          .eq("id", userId)
          .single(),
        this.client
          .from("cost_records")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        this.client
          .from("cost_records")
          .select("model, cost_inr, total_tokens")
          .eq("user_id", userId)
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      const dailyLimitInr =
        profileResult.data?.daily_budget_inr ?? CostRepository.DEFAULT_DAILY_LIMIT_INR;
      const monthlyLimitInr =
        profileResult.data?.monthly_budget_inr ??
        CostRepository.DEFAULT_MONTHLY_LIMIT_INR;
      const emergencyReserveInr = CostRepository.EMERGENCY_RESERVE_INR;
      const absoluteCeilingInr = CostRepository.ABSOLUTE_MONTHLY_CEILING_INR;

      // Determine circuit breaker status
      let circuitBreakerStatus: CircuitBreakerStatus = "nominal";
      if (monthSpendInr >= absoluteCeilingInr) {
        circuitBreakerStatus = "hard_locked";
      } else if (todaySpendInr >= dailyLimitInr) {
        circuitBreakerStatus = "tripped_daily";
      } else if (monthSpendInr >= monthlyLimitInr) {
        circuitBreakerStatus = isEmergencyReserveActive
          ? "emergency_unlocked"
          : "tripped_monthly";
      }

      // Compute spend breakdown by model for the current month
      const spendByModel: Record<
        string,
        { totalInr: number; totalTokens: number; callCount: number }
      > = {};

      const monthRecords = monthRecordsResult.data || [];
      for (const row of monthRecords) {
        const modelName = row.model || "unknown";
        if (!spendByModel[modelName]) {
          spendByModel[modelName] = {
            totalInr: 0,
            totalTokens: 0,
            callCount: 0,
          };
        }
        spendByModel[modelName].totalInr = Number(
          (spendByModel[modelName].totalInr + Number(row.cost_inr || 0)).toFixed(4)
        );
        spendByModel[modelName].totalTokens += Number(row.total_tokens || 0);
        spendByModel[modelName].callCount += 1;
      }

      return {
        todaySpendInr,
        monthSpendInr,
        dailyLimitInr,
        monthlyLimitInr,
        emergencyReserveInr,
        absoluteCeilingInr,
        isEmergencyReserveActive,
        circuitBreakerStatus,
        recentRecords: (recentResult.data as CostRecord[]) || [],
        spendByModel,
      };
    } catch (err) {
      this.handleError(err, "Failed to generate spend summary");
    }
  }
}
