import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types.js';

export type BudgetLedgerRow = Database['public']['Tables']['budget_ledgers']['Row'];
export type BudgetLedgerInsert = Database['public']['Tables']['budget_ledgers']['Insert'];

export class BudgetRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async appendLedger(entry: {
    userId: string;
    agentRunId?: string | null;
    billingDate: string;
    amountInr: number;
    amountUsd: number;
    provider?: string;
    modelId: string;
    isActual: boolean;
  }): Promise<BudgetLedgerRow> {
    const { data, error } = await this.client
      .from('budget_ledgers')
      .insert({
        user_id: entry.userId,
        agent_run_id: entry.agentRunId ?? null,
        billing_date: entry.billingDate,
        amount_inr: entry.amountInr,
        amount_usd: entry.amountUsd,
        provider: entry.provider ?? 'OpenRouter',
        model_id: entry.modelId,
        is_actual: entry.isActual,
        recorded_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getDailySpendInr(userId: string, dateIso: string): Promise<number> {
    const { data, error } = await this.client
      .from('budget_ledgers')
      .select('amount_inr')
      .eq('user_id', userId)
      .eq('billing_date', dateIso);

    if (error) throw error;
    const total = (data ?? []).reduce((acc, row) => acc + Number(row.amount_inr), 0);
    return Number(total.toFixed(4));
  }

  async getMonthlySpendInr(userId: string, yearMonthPrefix: string): Promise<number> {
    // yearMonthPrefix: '2026-11'
    const startDate = `${yearMonthPrefix}-01`;
    const endDate = `${yearMonthPrefix}-31`;

    const { data, error } = await this.client
      .from('budget_ledgers')
      .select('amount_inr')
      .eq('user_id', userId)
      .gte('billing_date', startDate)
      .lte('billing_date', endDate);

    if (error) throw error;
    const total = (data ?? []).reduce((acc, row) => acc + Number(row.amount_inr), 0);
    return Number(total.toFixed(4));
  }
}
