"use client";

import React, { useState } from "react";
import { CheckCircle2, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PlanDecisionControlsProps {
  onApprove: () => Promise<void>;
  onRequestRevision: (feedback: string) => Promise<void>;
  isProcessing: boolean;
  requiresHumanApproval: boolean;
}

export function PlanDecisionControls({
  onApprove,
  onRequestRevision,
  isProcessing,
  requiresHumanApproval,
}: PlanDecisionControlsProps) {
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [confirmApprove, setConfirmApprove] = useState(false);

  const handleApprove = async () => {
    if (requiresHumanApproval && !confirmApprove) {
      setConfirmApprove(true);
      return;
    }
    await onApprove();
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    await onRequestRevision(feedback.trim());
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Owner Decision Gate</h3>
          <p className="text-xs text-slate-400">
            {requiresHumanApproval
              ? "This plan includes safety-sensitive steps. Authorizing will transition the task to execution."
              : "Approve this plan to proceed with execution, or request revisions to adjust scope."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Request Revision Button */}
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            onClick={() => setShowRevisionForm(!showRevisionForm)}
            className="border-amber-500/30 text-amber-300 hover:bg-amber-950/30"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            <span>Request Revision</span>
          </Button>

          {/* Approve Button */}
          {confirmApprove ? (
            <Button
              type="button"
              variant="primary"
              disabled={isProcessing}
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  <span>Confirm & Authorize</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={isProcessing}
              onClick={handleApprove}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  <span>Approve Plan</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Notice */}
      {confirmApprove && !isProcessing && (
        <div className="p-3 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Confirmation required: This plan will execute safety-gated actions (migrations, security, or changes). Click &quot;Confirm &amp; Authorize&quot; to begin.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmApprove(false)}
            className="text-slate-400 hover:text-white underline text-xs ml-4"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Revision Feedback Form */}
      {showRevisionForm && (
        <form
          onSubmit={handleRevisionSubmit}
          className="mt-4 pt-4 border-t border-white/10 space-y-3"
        >
          <label
            htmlFor="revision-feedback"
            className="block text-xs font-medium text-slate-300"
          >
            Revision Feedback &amp; Adjustments:
          </label>
          <textarea
            id="revision-feedback"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isProcessing}
            placeholder="Explain what needs to be changed, added, or excluded before execution..."
            className="w-full rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => setShowRevisionForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isProcessing || !feedback.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Revision</span>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
