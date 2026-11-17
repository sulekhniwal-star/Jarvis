"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderGit2,
  Check,
  X,
  Shield,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalActionBadge } from "./approval-action-badge";
import { ApprovalActionType, ApprovalStatus } from "@/types/database";

export interface EnrichedApprovalItem {
  id: string;
  user_id: string;
  task_id?: string | null;
  action_type: ApprovalActionType;
  target_resource: string;
  scope: Record<string, unknown> | any;
  status: ApprovalStatus;
  decision_reason?: string | null;
  requested_at: string;
  decided_at?: string | null;
  expires_at: string;
  token?: string;
  taskTitle?: string;
  projectName?: string;
}

export interface ApprovalRequestCardProps {
  approval: EnrichedApprovalItem;
  onApprove?: (approval: EnrichedApprovalItem) => void;
  onReject?: (approval: EnrichedApprovalItem) => void;
  isDeciding?: boolean;
}

export function formatTimeRemaining(ms: number): {
  text: string;
  isUrgent: boolean;
  isExpired: boolean;
} {
  if (ms <= 0) {
    return { text: "Expired", isUrgent: true, isExpired: true };
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isUrgent = ms < 5 * 60 * 1000; // < 5 minutes

  if (days > 0) {
    return { text: `${days}d ${hours % 24}h`, isUrgent, isExpired: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes % 60}m`, isUrgent, isExpired: false };
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${seconds % 60}s`, isUrgent, isExpired: false };
  }
  return { text: `${seconds}s`, isUrgent, isExpired: false };
}

export function getRiskTier(approval: EnrichedApprovalItem): {
  tier: "critical" | "high" | "medium" | "low";
  label: string;
  badgeClass: string;
} {
  if (
    approval.scope &&
    typeof approval.scope === "object" &&
    "risk_level" in approval.scope
  ) {
    const r = String(approval.scope.risk_level).toLowerCase();
    if (r === "critical") {
      return {
        tier: "critical",
        label: "Critical Risk",
        badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      };
    }
    if (r === "high") {
      return {
        tier: "high",
        label: "High Risk",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    }
    if (r === "low") {
      return {
        tier: "low",
        label: "Low Risk",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }
  }

  if (
    approval.action_type === "destructive_db_mutation" ||
    approval.action_type === "production_deploy"
  ) {
    return {
      tier: "critical",
      label: "Critical Risk",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
  }

  if (
    approval.action_type === "git_remote_push" ||
    approval.action_type === "paid_ai_inference"
  ) {
    return {
      tier: "high",
      label: "High Risk",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }

  return {
    tier: "medium",
    label: "Medium Risk",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
}

export function ApprovalRequestCard({
  approval,
  onApprove,
  onReject,
  isDeciding = false,
}: ApprovalRequestCardProps) {
  const [timeRemainingMs, setTimeRemainingMs] = React.useState<number>(() => {
    return Math.max(
      0,
      new Date(approval.expires_at).getTime() - Date.now()
    );
  });

  React.useEffect(() => {
    // If not pending, no need for active countdown interval
    if (approval.status !== "pending") return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        new Date(approval.expires_at).getTime() - Date.now()
      );
      setTimeRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [approval.expires_at, approval.status]);

  const { text: countdownText, isUrgent, isExpired } = formatTimeRemaining(
    timeRemainingMs
  );
  const isEffectiveExpired =
    approval.status === "expired" || (approval.status === "pending" && isExpired);
  const risk = getRiskTier(approval);

  const scopeEntries = React.useMemo(() => {
    if (!approval.scope || typeof approval.scope !== "object") return [];
    return Object.entries(approval.scope)
      .filter(([key]) => key !== "risk_level")
      .slice(0, 3);
  }, [approval.scope]);

  return (
    <Card
      className="p-5 flex flex-col justify-between border-surface-3 bg-surface-1 hover:border-surface-3/80 transition-all shadow-sm"
      data-testid={`approval-card-${approval.id}`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ApprovalActionBadge actionType={approval.action_type} />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border ${risk.badgeClass}`}
            >
              <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
              {risk.label}
            </span>
          </div>

          {/* Live Expiration Countdown */}
          <div
            className={`flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded ${
              isEffectiveExpired
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : isUrgent
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse font-semibold"
                : "text-text-secondary bg-surface-2 border border-surface-3"
            }`}
            data-testid="countdown-badge"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isEffectiveExpired ? "Expired" : countdownText}</span>
          </div>
        </div>

        {/* Target Resource */}
        <div className="mb-3">
          <div className="text-[11px] font-mono uppercase text-text-secondary tracking-wider mb-1">
            Target Resource
          </div>
          <div
            className="font-mono text-sm bg-surface-2/70 border border-surface-3 rounded-lg px-3 py-2 text-text-primary break-all select-all"
            data-testid="target-resource"
          >
            {approval.target_resource}
          </div>
        </div>

        {/* Scope Context Pills */}
        {scopeEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
            {scopeEntries.map(([key, value]) => (
              <span
                key={key}
                className="bg-surface-2 text-text-secondary border border-surface-3 rounded px-2 py-0.5 font-mono text-[11px]"
              >
                <span className="text-text-secondary/70">{key}: </span>
                <span className="text-accent-ice font-semibold">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Linked Task & Project Details */}
        {(approval.taskTitle || approval.projectName) && (
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-4 bg-surface-2/40 border border-surface-3/50 rounded-lg p-2">
            {approval.projectName && (
              <div className="flex items-center gap-1 text-accent-cyan font-medium">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{approval.projectName}</span>
              </div>
            )}
            {approval.taskTitle && (
              <div className="flex items-center gap-1 text-text-primary truncate">
                <FolderGit2 className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
                <span className="truncate">{approval.taskTitle}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Footer / State */}
      <div className="pt-3 border-t border-surface-3/60">
        {approval.status === "pending" && !isEffectiveExpired ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50"
              onClick={() => onReject?.(approval)}
              disabled={isDeciding}
              data-testid="reject-button"
            >
              <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm shadow-emerald-600/30"
              onClick={() => onApprove?.(approval)}
              disabled={isDeciding}
              data-testid="approve-button"
            >
              <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Approve
            </Button>
          </div>
        ) : approval.status === "approved" ? (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Approved
              </span>
              {approval.decided_at && (
                <span className="text-text-secondary font-mono text-[11px]">
                  {new Date(approval.decided_at).toLocaleString()}
                </span>
              )}
            </div>
            {approval.decision_reason && (
              <p className="text-text-secondary italic text-[11px] truncate">
                "{approval.decision_reason}"
              </p>
            )}
          </div>
        ) : approval.status === "rejected" ? (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center text-rose-400 font-medium">
                <XCircle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Rejected
              </span>
              {approval.decided_at && (
                <span className="text-text-secondary font-mono text-[11px]">
                  {new Date(approval.decided_at).toLocaleString()}
                </span>
              )}
            </div>
            {approval.decision_reason && (
              <p className="text-text-secondary italic text-[11px] truncate">
                "{approval.decision_reason}"
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="inline-flex items-center text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Expired
            </span>
            <span className="font-mono text-[11px]">
              {new Date(approval.expires_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
