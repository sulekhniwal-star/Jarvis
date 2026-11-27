"use client";

import * as React from "react";
import {
  Coins,
  Calendar,
  ShieldAlert,
  Lock,
  Unlock,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CostMetricsBannerProps {
  todaySpendInr: number;
  monthSpendInr: number;
  dailyLimitInr?: number;
  monthlyLimitInr?: number;
  emergencyReserveInr?: number;
  absoluteCeilingInr?: number;
  isEmergencyReserveActive?: boolean;
}

export function CostMetricsBanner({
  todaySpendInr,
  monthSpendInr,
  dailyLimitInr = 25.0,
  monthlyLimitInr = 750.0,
  emergencyReserveInr = 250.0,
  absoluteCeilingInr = 1000.0,
  isEmergencyReserveActive = false,
}: CostMetricsBannerProps) {
  const dailyPct = Math.min(100, Math.round((todaySpendInr / dailyLimitInr) * 100));
  const monthlyPct = Math.min(
    100,
    Math.round((monthSpendInr / monthlyLimitInr) * 100)
  );

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "bg-rose-500";
    if (pct >= 80) return "bg-amber-400";
    return "bg-accent-cyan";
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="cost-metrics-banner"
    >
      {/* 1. Today's Spend */}
      <Card className="p-4 bg-surface-1 border-surface-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent-cyan" aria-hidden="true" />
              Today&apos;s Spend
            </span>
            <span className="font-semibold text-text-primary">{dailyPct}%</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-text-primary">
              ₹{todaySpendInr.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              / ₹{dailyLimitInr.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
              dailyPct
            )}`}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
      </Card>

      {/* 2. Monthly Budget */}
      <Card className="p-4 bg-surface-1 border-surface-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-accent-ice" aria-hidden="true" />
              Monthly Spend
            </span>
            <span className="font-semibold text-text-primary">{monthlyPct}%</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-text-primary">
              ₹{monthSpendInr.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              / ₹{monthlyLimitInr.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
              monthlyPct
            )}`}
            style={{ width: `${monthlyPct}%` }}
          />
        </div>
      </Card>

      {/* 3. Emergency Reserve */}
      <Card className="p-4 bg-surface-1 border-surface-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
              Emergency Reserve
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                isEmergencyReserveActive
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                  : "bg-surface-2 text-text-secondary border-surface-3"
              }`}
            >
              {isEmergencyReserveActive ? (
                <>
                  <Unlock className="w-3 h-3 mr-1" aria-hidden="true" />
                  Active
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" aria-hidden="true" />
                  Locked
                </>
              )}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            ₹{emergencyReserveInr.toFixed(2)}
          </div>
        </div>
        <div className="text-[11px] text-text-secondary mt-2">
          {isEmergencyReserveActive
            ? "Unlocked for current calendar month"
            : "Requires explicit owner authorization"}
        </div>
      </Card>

      {/* 4. Absolute Monthly Ceiling */}
      <Card className="p-4 bg-surface-1 border-surface-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              Hard Ceiling
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Inviolable
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            ₹{absoluteCeilingInr.toFixed(2)}
          </div>
        </div>
        <div className="text-[11px] text-text-secondary mt-2">
          Absolute monthly cap under all conditions
        </div>
      </Card>
    </div>
  );
}
