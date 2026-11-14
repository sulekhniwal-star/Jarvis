import React from 'react';
import type { BudgetSummary } from '@jarvis/shared-contracts';
import { IndianRupee, ShieldCheck, AlertTriangle } from 'lucide-react';

interface BudgetWidgetProps {
  summary: BudgetSummary;
}

export function BudgetWidget({ summary }: BudgetWidgetProps) {
  const dailyPercent = Math.min(100, (summary.dailySpendInr / summary.dailyLimitInr) * 100);
  const monthlyPercent = Math.min(100, (summary.monthlySpendInr / summary.monthlyLimitInr) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Daily Spend Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Today's Inference Spend</span>
          <IndianRupee className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-foreground">₹{summary.dailySpendInr.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">/ ₹{summary.dailyLimitInr.toFixed(2)} cap</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              dailyPercent > 80 ? 'bg-rose-500' : dailyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      </div>

      {/* Monthly Spend Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Monthly Cycle Spend</span>
          <IndianRupee className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-foreground">₹{summary.monthlySpendInr.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">/ ₹{summary.monthlyLimitInr.toFixed(2)} base</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              monthlyPercent > 80 ? 'bg-rose-500' : monthlyPercent > 50 ? 'bg-amber-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${monthlyPercent}%` }}
          />
        </div>
      </div>

      {/* Governance & Reserve Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Emergency Reserve</span>
            {summary.emergencyReserveApproved ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="text-lg font-bold text-foreground">
            ₹{summary.emergencyReserveInr.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {summary.emergencyReserveApproved ? '(Unlocked & Approved)' : '(Locked)'}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Paid models strictly disabled unless approved. Zero-cost `:free` open models preferred.
        </p>
      </div>
    </div>
  );
}
