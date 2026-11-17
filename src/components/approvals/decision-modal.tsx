"use client";

import * as React from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovalActionBadge } from "./approval-action-badge";
import { EnrichedApprovalItem, getRiskTier } from "./approval-request-card";

export interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: EnrichedApprovalItem | null;
  decision: "approved" | "rejected";
  onDecisionComplete: (updatedApproval: any) => void;
}

export function DecisionModal({
  isOpen,
  onClose,
  approval,
  decision,
  onDecisionComplete,
}: DecisionModalProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, approval?.id, decision]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !approval) return null;

  const isApproved = decision === "approved";
  const risk = getRiskTier(approval);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/${approval.id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(approval.token ? { "x-approval-token": approval.token } : {}),
        },
        body: JSON.stringify({
          decision,
          reason: reason.trim() || undefined,
          token: approval.token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Failed to record ${decision} decision.`);
      }

      onDecisionComplete(data.approval);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred while executing decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
    >
      <div className="w-full max-w-lg bg-surface-1 border border-surface-3 rounded-xl p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                isApproved
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <XCircle className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3
                id="decision-modal-title"
                className="text-base font-bold text-text-primary"
              >
                {isApproved ? "Authorize Operation" : "Reject Operation Request"}
              </h3>
              <p className="text-xs text-text-secondary">
                {isApproved
                  ? "Grant execution permission with cryptographic token verification."
                  : "Deny execution and halt downstream automation pipeline."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Operation Summary */}
        <div className="space-y-2 p-3 bg-surface-2/60 border border-surface-3 rounded-lg text-xs">
          <div className="flex items-center justify-between">
            <ApprovalActionBadge actionType={approval.action_type} />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${risk.badgeClass}`}
            >
              {risk.label}
            </span>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-text-secondary mb-0.5">
              Target Resource
            </div>
            <div className="font-mono text-xs bg-surface-1/80 border border-surface-3 rounded px-2.5 py-1.5 text-text-primary break-all">
              {approval.target_resource}
            </div>
          </div>
          {approval.taskTitle && (
            <div className="text-[11px] text-text-secondary">
              Linked Task: <span className="text-text-primary font-medium">{approval.taskTitle}</span>
            </div>
          )}
        </div>

        {/* High Risk Advisory Notice */}
        {risk.tier === "critical" && isApproved && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Critical Operation: This action directly modifies production environments or persistent data stores. Ensure verification before proceeding.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label
              htmlFor="decision-reason-input"
              className="block font-medium text-text-primary"
            >
              Reason or Audit Notes <span className="text-text-secondary font-normal">(Optional)</span>
            </label>
            <textarea
              id="decision-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isApproved
                  ? "e.g., Verified migration plan and signed off for deployment."
                  : "e.g., Remote branch contains failing integration tests."
              }
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan resize-none text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={
                isApproved
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  : "bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              }
              data-testid="confirm-decision-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Processing...
                </>
              ) : isApproved ? (
                "Authorize & Confirm"
              ) : (
                "Reject Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
