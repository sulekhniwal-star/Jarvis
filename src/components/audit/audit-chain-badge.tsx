"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditChainVerificationResult } from "@/lib/audit/audit-ledger";

export interface AuditChainBadgeProps {
  status: AuditChainVerificationResult | null;
  isVerifying?: boolean;
  onVerify?: () => void;
  className?: string;
}

export function AuditChainBadge({
  status,
  isVerifying = false,
  onVerify,
  className = "",
}: AuditChainBadgeProps) {
  if (isVerifying) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-3 bg-surface-2 text-xs font-mono text-text-secondary ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
        <span>Verifying Cryptographic Chain...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {onVerify && (
          <Button
            variant="outline"
            size="sm"
            onClick={onVerify}
            className="text-xs font-mono gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Verify Chain
          </Button>
        )}
      </div>
    );
  }

  const isValid = status.isValid;

  return (
    <div className={`flex items-center gap-2.5 flex-wrap ${className}`}>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono shadow-sm transition-all ${
          isValid
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-rose-500/40 bg-rose-500/10 text-rose-400"
        }`}
        data-testid="audit-chain-status"
        role="status"
      >
        {isValid ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        )}
        <div className="flex flex-col">
          <span className="font-semibold">
            {isValid ? "Chain Integrity Verified" : "Chain Compromised / Corrupted"}
          </span>
          <span className="text-[10px] opacity-80">
            {isValid
              ? `${status.verifiedCount} blocks valid • Head: ${status.chainHeadHash.slice(0, 8)}...`
              : status.error || "Hash mismatch detected"}
          </span>
        </div>
      </div>

      {onVerify && (
        <Button
          variant="outline"
          size="sm"
          onClick={onVerify}
          disabled={isVerifying}
          className="text-xs font-mono gap-1.5"
          data-testid="reverify-chain-button"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-Verify
        </Button>
      )}
    </div>
  );
}
