"use client";

import * as React from "react";
import { Coins, RefreshCw, BarChart2, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CostMetricsBanner } from "./cost-metrics-banner";
import { CircuitBreakerCard } from "./circuit-breaker-card";
import { CostLedgerTable } from "./cost-ledger-table";
import { EmergencyReserveModal } from "./emergency-reserve-modal";
import { CostSpendSummary } from "@/lib/repositories/cost-repository";

export interface CostManagementViewProps {
  initialSummary?: CostSpendSummary;
}

export function CostManagementView({
  initialSummary = {
    todaySpendInr: 0,
    monthSpendInr: 0,
    dailyLimitInr: 25.0,
    monthlyLimitInr: 750.0,
    emergencyReserveInr: 250.0,
    absoluteCeilingInr: 1000.0,
    isEmergencyReserveActive: false,
    circuitBreakerStatus: "nominal",
    recentRecords: [],
    spendByModel: {},
  },
}: CostManagementViewProps) {
  const [summary, setSummary] = React.useState<CostSpendSummary>(initialSummary);
  const [isReserveModalOpen, setIsReserveModalOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const refreshSummary = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/costs/summary");
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.warn("[CostManagementView] Failed to refresh cost summary:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const modelEntries = React.useMemo(() => {
    return Object.entries(summary.spendByModel || {}).sort(
      (a, b) => b[1].totalInr - a[1].totalInr
    );
  }, [summary.spendByModel]);

  return (
    <div className="space-y-6 select-none" data-testid="cost-management-view">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
            Budget & Financial Controls
          </h2>
          <p className="text-xs text-text-secondary">
            Enforces ₹25.00 daily and ₹750.00 monthly spending ceilings with automated circuit breaking.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshSummary}
          disabled={isRefreshing}
          className="self-start sm:self-auto"
          title="Refresh cost figures"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {/* Metrics Banner */}
      <CostMetricsBanner
        todaySpendInr={summary.todaySpendInr}
        monthSpendInr={summary.monthSpendInr}
        dailyLimitInr={summary.dailyLimitInr}
        monthlyLimitInr={summary.monthlyLimitInr}
        emergencyReserveInr={summary.emergencyReserveInr}
        absoluteCeilingInr={summary.absoluteCeilingInr}
        isEmergencyReserveActive={summary.isEmergencyReserveActive}
      />

      {/* Circuit Breaker Status */}
      <CircuitBreakerCard
        status={summary.circuitBreakerStatus}
        todaySpendInr={summary.todaySpendInr}
        monthSpendInr={summary.monthSpendInr}
        isEmergencyReserveActive={summary.isEmergencyReserveActive}
        onOpenReserveModal={() => setIsReserveModalOpen(true)}
      />

      {/* Model Distribution (if available) */}
      {modelEntries.length > 0 && (
        <Card className="p-4 bg-surface-1 border-surface-3">
          <h4 className="text-xs font-mono uppercase text-text-secondary mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-accent-ice" aria-hidden="true" />
            Monthly Model Distribution
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {modelEntries.map(([model, data]) => (
              <div
                key={model}
                className="p-3 bg-surface-2 border border-surface-3 rounded-lg text-xs"
              >
                <div className="font-medium text-text-primary truncate" title={model}>
                  {model}
                </div>
                <div className="flex items-center justify-between text-text-secondary font-mono mt-1 text-[11px]">
                  <span>{data.callCount} calls</span>
                  <span className="font-bold text-accent-cyan">
                    ₹{data.totalInr.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Granular Cost Ledger */}
      <CostLedgerTable records={summary.recentRecords} />

      {/* Emergency Reserve Unlock Modal */}
      <EmergencyReserveModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onUnlocked={refreshSummary}
      />
    </div>
  );
}
