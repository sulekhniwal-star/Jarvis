import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CostManagementView } from "@/components/cost/cost-management-view";
import { MaintenanceControlCard } from "@/components/ops/maintenance-control-card";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { CostRepository, CostSpendSummary } from "@/lib/repositories/cost-repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="System Settings">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let summary: CostSpendSummary = {
    todaySpendInr: 0,
    monthSpendInr: 0,
    dailyLimitInr: CostRepository.DEFAULT_DAILY_LIMIT_INR,
    monthlyLimitInr: CostRepository.DEFAULT_MONTHLY_LIMIT_INR,
    emergencyReserveInr: CostRepository.EMERGENCY_RESERVE_INR,
    absoluteCeilingInr: CostRepository.ABSOLUTE_MONTHLY_CEILING_INR,
    isEmergencyReserveActive: false,
    circuitBreakerStatus: "nominal",
    recentRecords: [],
    spendByModel: {},
  };

  try {
    const costRepo = new CostRepository(supabase);
    summary = await costRepo.getSpendSummary(user.id);
  } catch (err) {
    console.error("[SettingsPage] Failed to prefetch cost summary:", err);
  }

  return (
    <AppShell title="System Settings">
      <ErrorBoundary>
        <div className="space-y-6">
          <CostManagementView initialSummary={summary} />
          <MaintenanceControlCard />
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
