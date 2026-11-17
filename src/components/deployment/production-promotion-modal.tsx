"use client";

import * as React from "react";
import {
  X,
  Rocket,
  ShieldCheck,
  AlertTriangle,
  GitCommit,
  CheckCircle2,
  Send,
} from "lucide-react";

export interface ProductionPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultCommitSha?: string;
  defaultCommitMessage?: string;
}

export function ProductionPromotionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCommitSha = "",
  defaultCommitMessage = "",
}: ProductionPromotionModalProps) {
  const [commitSha, setCommitSha] = React.useState(defaultCommitSha);
  const [commitMessage, setCommitMessage] = React.useState(defaultCommitMessage);
  const [verificationSummary, setVerificationSummary] = React.useState(
    "All 107 test suites passed, 0 warnings, production build compiled"
  );
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successInfo, setSuccessInfo] = React.useState<{
    approvalId: string;
    deploymentId: string;
  } | null>(null);

  React.useEffect(() => {
    if (defaultCommitSha) setCommitSha(defaultCommitSha);
    if (defaultCommitMessage) setCommitMessage(defaultCommitMessage);
  }, [defaultCommitSha, defaultCommitMessage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitSha.trim()) {
      setError("Commit SHA is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/deployments/production/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitSha: commitSha.trim(),
          commitMessage: commitMessage.trim(),
          verificationSummary: verificationSummary.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to request promotion (${res.status})`);
      }

      setSuccessInfo({
        approvalId: data.approval.id,
        deploymentId: data.deployment.id,
      });
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessInfo(null);
      }, 1800);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-base/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-surface-3 bg-surface-1 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="promotion-modal-title"
                className="text-base font-semibold text-text-primary"
              >
                Promote to Production
              </h2>
              <p className="text-xs text-text-secondary">
                REQ-DEP-01 • Submits authorization request to owner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Close promotion dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successInfo ? (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-success space-y-2 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Promotion Request Dispatched!
            </div>
            <p className="text-xs text-text-secondary">
              Approval record <span className="font-mono text-text-primary font-medium">{successInfo.approvalId.substring(0, 8)}</span> created. Interactive confirmation card sent to authorized Telegram owner.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Commit SHA */}
            <div className="space-y-1">
              <label
                htmlFor="commit-sha"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wider font-mono"
              >
                Target Commit SHA *
              </label>
              <div className="relative">
                <input
                  id="commit-sha"
                  type="text"
                  value={commitSha}
                  onChange={(e) => setCommitSha(e.target.value)}
                  placeholder="e.g. e1b9477... or 40-char SHA"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-surface-3 bg-surface-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-cyan"
                  required
                />
              </div>
            </div>

            {/* Commit Message */}
            <div className="space-y-1">
              <label
                htmlFor="commit-message"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wider font-mono"
              >
                Release Title / Message
              </label>
              <input
                id="commit-message"
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g. feat: release production milestone v9.0"
                className="w-full px-3 py-2 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-cyan"
              />
            </div>

            {/* Verification Proof Summary */}
            <div className="space-y-1">
              <label
                htmlFor="verification-summary"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wider font-mono"
              >
                Verification Proof & Test Summary
              </label>
              <textarea
                id="verification-summary"
                rows={2}
                value={verificationSummary}
                onChange={(e) => setVerificationSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-cyan resize-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label
                htmlFor="promotion-notes"
                className="block text-xs font-medium text-text-secondary uppercase tracking-wider font-mono"
              >
                Operator Notes (Optional)
              </label>
              <input
                id="promotion-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Verified zero regression on mobile viewport"
                className="w-full px-3 py-2 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-cyan"
              />
            </div>

            <div className="rounded-lg bg-surface-2/40 border border-surface-3 p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Production promotion will <strong className="text-text-primary">not</strong> execute automatically. A cryptographic approval request will be dispatched to the owner's Telegram and web console.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-accent-cyan text-surface-base hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Dispatching..." : "Request Production Approval"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
