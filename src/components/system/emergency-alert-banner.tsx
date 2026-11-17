"use client";

import * as React from "react";
import { OctagonAlert, X, Zap } from "lucide-react";
import { KillSwitchResult } from "@/lib/system/kill-switch";

export interface EmergencyAlertBannerProps {
  details: KillSwitchResult | null;
  onDismiss: () => void;
}

export function EmergencyAlertBanner({
  details,
  onDismiss,
}: EmergencyAlertBannerProps) {
  if (!details) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-rose-600/90 text-white px-4 py-2.5 shadow-lg border-b border-rose-700 animate-in slide-in-from-top duration-200"
      data-testid="emergency-alert-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-black/20 shrink-0">
            <OctagonAlert className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bold tracking-wide uppercase mr-2">
              Emergency Stop Executed:
            </span>
            <span>
              All agent processes terminated ({details.terminatedProcessesCount}), runs cancelled ({details.cancelledRunsCount}), and approvals revoked ({details.revokedApprovalsCount}).
            </span>
            <span className="ml-2 font-mono text-[11px] opacity-90">
              ⚡ {details.durationMs}ms ({details.source})
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/20 transition-colors shrink-0"
          aria-label="Dismiss emergency alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
