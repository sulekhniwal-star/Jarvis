"use client";

import * as React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Zap,
  KeyRound,
  Unlock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircuitBreakerStatus } from "@/lib/repositories/cost-repository";

export interface CircuitBreakerCardProps {
  status: CircuitBreakerStatus;
  todaySpendInr: number;
  monthSpendInr: number;
  isEmergencyReserveActive: boolean;
  onOpenReserveModal?: () => void;
}

export function CircuitBreakerCard({
  status,
  todaySpendInr,
  monthSpendInr,
  isEmergencyReserveActive,
  onOpenReserveModal,
}: CircuitBreakerCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "nominal":
        return {
          title: "Circuit Breaker: Nominal",
          description:
            "Automated cost guardrails are active. Daily and monthly spending are within safe limits.",
          badgeText: "Nominal",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: ShieldCheck,
          iconClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };
      case "tripped_daily":
        return {
          title: "Circuit Breaker: Tripped (Daily Cap)",
          description:
            "Daily spending has reached ₹25.00. Paid AI inference calls are blocked until UTC midnight to prevent cost overruns.",
          badgeText: "Tripped (Daily)",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: AlertTriangle,
          iconClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      case "tripped_monthly":
        return {
          title: "Circuit Breaker: Tripped (Monthly Budget)",
          description:
            "Monthly budget of ₹750.00 reached. Non-essential paid inference is halted. Unlock the Emergency Reserve to resume.",
          badgeText: "Tripped (Monthly)",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          icon: ShieldAlert,
          iconClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        };
      case "emergency_unlocked":
        return {
          title: "Circuit Breaker: Emergency Reserve Active",
          description:
            "Emergency reserve of ₹250.00 authorized. Paid inference permitted up to the ₹1,000.00 hard monthly stop.",
          badgeText: "Emergency Active",
          badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/20",
          icon: Zap,
          iconClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        };
      case "hard_locked":
        return {
          title: "Circuit Breaker: Hard Locked (₹1,000 Ceiling)",
          description:
            "Inviolable monthly ceiling reached. All paid model inference is strictly locked until the next monthly billing cycle.",
          badgeText: "Hard Locked",
          badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/40",
          icon: ShieldAlert,
          iconClass: "text-rose-400 bg-rose-500/20 border-rose-500/40",
        };
      default:
        return {
          title: "Circuit Breaker: Active",
          description: "Cost monitoring service operating normally.",
          badgeText: "Active",
          badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          icon: ShieldCheck,
          iconClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card
      className="p-5 bg-surface-1 border-surface-3 flex flex-col md:flex-row md:items-center justify-between gap-4"
      data-testid="circuit-breaker-card"
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${config.iconClass}`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-text-primary">
              {config.title}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${config.badgeClass}`}
            >
              {config.badgeText}
            </span>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {!isEmergencyReserveActive && status !== "hard_locked" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReserveModal}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50"
            data-testid="unlock-reserve-button"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Unlock Emergency Reserve
          </Button>
        )}
      </div>
    </Card>
  );
}
