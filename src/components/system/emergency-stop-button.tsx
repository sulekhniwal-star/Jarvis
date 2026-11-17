"use client";

import * as React from "react";
import { OctagonAlert, AlertTriangle, Loader2, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KillSwitchResult } from "@/lib/system/kill-switch";

export interface EmergencyStopButtonProps {
  onStopExecuted?: (result: KillSwitchResult) => void;
  className?: string;
}

export function EmergencyStopButton({
  onStopExecuted,
  className = "",
}: EmergencyStopButtonProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen && !isExecuting) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isExecuting]);

  const handleExecuteKill = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const response = await fetch("/api/system/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to execute emergency stop");
      }

      setIsModalOpen(false);
      onStopExecuted?.(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred during emergency stop.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shadow-sm ${className}`}
        aria-label="Emergency stop active agents and processes"
        data-testid="emergency-stop-trigger"
      >
        <OctagonAlert className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Emergency Stop</span>
        <span className="sm:hidden">KILL</span>
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kill-modal-title"
        >
          <div className="w-full max-w-md bg-surface-1 border-2 border-rose-600/60 rounded-xl p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-600/40 text-rose-500 flex items-center justify-center">
                  <OctagonAlert className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="kill-modal-title"
                    className="text-base font-bold text-text-primary tracking-wide"
                  >
                    Confirm Emergency Stop
                  </h3>
                  <p className="text-xs text-rose-400 font-mono">
                    REQ-SEC-01 • Instant Global Halting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isExecuting}
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

            {/* Warning Message */}
            <div className="p-3.5 bg-rose-600/10 border border-rose-600/30 rounded-lg text-xs space-y-2 text-rose-200">
              <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                Immediate Actions on Execution:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-200/90 font-mono">
                <li>Kill all local coding agent and sandbox process trees (`SIGKILL`).</li>
                <li>Mark active `agent_runs` as failed immediately.</li>
                <li>Cancel all in-flight and pending `tasks`.</li>
                <li>Revoke all outstanding authorization requests.</li>
                <li>Record permanent audit trace in `audit_events`.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteKill}
                disabled={isExecuting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                data-testid="confirm-kill-button"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Halting System...
                  </>
                ) : (
                  "CONFIRM EMERGENCY STOP"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
