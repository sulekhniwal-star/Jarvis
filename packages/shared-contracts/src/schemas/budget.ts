import { z } from 'zod';

export const BudgetLedgerEntrySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  agentRunId: z.string().uuid().nullable().optional(),
  billingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountInr: z.number().nonnegative(),
  amountUsd: z.number().nonnegative(),
  provider: z.string().default('OpenRouter'),
  modelId: z.string(),
  isActual: z.boolean().default(false),
});

export const BudgetSummarySchema = z.object({
  dailySpendInr: z.number(),
  dailyLimitInr: z.number(),
  monthlySpendInr: z.number(),
  monthlyLimitInr: z.number(),
  emergencyReserveInr: z.number(),
  emergencyReserveApproved: boolean(),
  isExceeded: z.boolean(),
});

function boolean() {
  return z.boolean();
}

export type BudgetLedgerEntry = z.infer<typeof BudgetLedgerEntrySchema>;
export type BudgetSummary = z.infer<typeof BudgetSummarySchema>;
