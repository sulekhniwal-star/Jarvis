"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

interface PendingApprovalsModalProps {
  pendingApprovals: any[];
  onDecision: (id: string, decision: "APPROVED" | "REJECTED") => void;
}

export function PendingApprovalsModal({
  pendingApprovals,
  onDecision,
}: PendingApprovalsModalProps) {
  if (!pendingApprovals || pendingApprovals.length === 0) return null;

  return (
    <div className="border border-amber-500/70 bg-amber-950/40 rounded-xl p-4 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-amber-300 font-mono tracking-wider uppercase">
          Human Authorization Checkpoints ({pendingApprovals.length} Pending)
        </h3>
      </div>

      <div className="space-y-2">
        {pendingApprovals.map((appr) => (
          <div
            key={appr.id}
            className="border border-amber-500/40 bg-black/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-amber-400 font-bold uppercase">
                  {appr.action_type || "HIGH_CONSEQUENCE_OPERATION"}
                </span>
                <span className="text-[10px] text-gray-500">ID: {appr.id.slice(0, 8)}</span>
              </div>
              <p className="text-xs text-gray-300">
                {appr.canonical_payload || "Execution requires explicit operator approval."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDecision(appr.id, "APPROVED")}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-400 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_8px_#10b981]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                APPROVE
              </button>

              <button
                type="button"
                onClick={() => onDecision(appr.id, "REJECTED")}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-semibold transition-all hover:border-rose-400"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                REJECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

