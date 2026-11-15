import * as React from "react";
import { Cpu, DollarSign, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

export interface AICoreStatusProps {
  model?: string;
  provider?: string;
  dailySpendInr?: number;
  dailyLimitInr?: number;
  monthlySpendInr?: number;
  monthlyLimitInr?: number;
}

export function AICoreStatus({
  model = "meta-llama/llama-3.3-70b-instruct:free",
  provider = "OpenRouter",
  dailySpendInr = 0.0,
  dailyLimitInr = 25.0,
  monthlySpendInr = 0.0,
  monthlyLimitInr = 750.0,
}: AICoreStatusProps) {
  const isFree = model.endsWith(":free");
  const dailyPercent = Math.min(
    100,
    dailyLimitInr > 0 ? (dailySpendInr / dailyLimitInr) * 100 : 0
  );

  let progressBarColor = "bg-accent-cyan";
  let statusBadgeVariant: "cyan" | "warning" | "danger" = "cyan";

  if (dailyPercent >= 100) {
    progressBarColor = "bg-danger";
    statusBadgeVariant = "danger";
  } else if (dailyPercent >= 80) {
    progressBarColor = "bg-warning";
    statusBadgeVariant = "warning";
  }

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">AI Core Gateway</CardTitle>
          </div>
          <Badge variant={statusBadgeVariant} pulse>
            {dailyPercent >= 100
              ? "Circuit Tripped"
              : dailyPercent >= 80
              ? "Budget Alert"
              : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model & Tier Display */}
        <div className="p-3 rounded-lg bg-surface-2/60 border border-surface-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-text-secondary">
              {provider} • Primary Model
            </span>
            <span className="font-mono text-xs font-semibold text-text-primary truncate max-w-[200px] sm:max-w-none">
              {model}
            </span>
          </div>
          <Badge variant={isFree ? "cyan" : "ice"}>
            {isFree ? "Free Tier" : "Paid Tier"}
          </Badge>
        </div>

        {/* Daily Spending Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-accent-cyan" aria-hidden="true" />
              Daily Spend
            </span>
            <span className="font-mono font-medium text-text-primary">
              ₹{dailySpendInr.toFixed(2)} / ₹{dailyLimitInr.toFixed(2)}
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-surface-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={dailySpendInr}
            aria-valuemin={0}
            aria-valuemax={dailyLimitInr}
            aria-label="Daily spending progress"
          >
            <div
              className={`h-full transition-all duration-300 ${progressBarColor}`}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
        </div>

        {/* Monthly Budget Summary */}
        <div className="pt-2 border-t border-surface-3/60 flex items-center justify-between text-xs">
          <span className="text-text-secondary flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-accent-ice" aria-hidden="true" />
            Monthly Ceiling
          </span>
          <span className="font-mono text-text-primary">
            ₹{monthlySpendInr.toFixed(2)} / ₹{monthlyLimitInr.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
