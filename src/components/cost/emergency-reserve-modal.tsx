"use client";

import * as React from "react";
import {
  X,
  Zap,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmergencyReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export function EmergencyReserveModal({
  isOpen,
  onClose,
  onUnlocked,
}: EmergencyReserveModalProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/costs/emergency-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || "Owner authorized emergency reserve",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to authorize emergency reserve");
      }

      onUnlocked();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reserve-modal-title"
    >
      <div className="w-full max-w-lg bg-surface-1 border border-surface-3 rounded-xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="reserve-modal-title" className="text-base font-bold text-text-primary">
                Unlock Emergency Reserve
              </h3>
              <p className="text-xs text-text-secondary">
                Authorize ₹250.00 emergency inference capacity for the current month.
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

        {/* Advisory notice */}
        <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-2 text-xs text-purple-200">
          <div className="font-semibold flex items-center gap-1.5 text-purple-300">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            Financial Guardrails Terms
          </div>
          <p className="text-[11px] leading-relaxed text-purple-200/90">
            Authorizing this reserve expands your monthly inference limit from <strong>₹750.00</strong> to the absolute hard stop of <strong>₹1,000.00</strong>. This permission remains active exclusively for the current calendar billing cycle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="reserve-reason" className="block font-medium text-text-primary">
              Authorization Reason <span className="text-text-secondary font-normal">(Optional)</span>
            </label>
            <textarea
              id="reserve-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Critical production incident troubleshooting and bugfix deployment."
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan resize-none text-xs"
            />
          </div>

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
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              data-testid="confirm-reserve-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Authorizing...
                </>
              ) : (
                "Authorize ₹250 Reserve"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
