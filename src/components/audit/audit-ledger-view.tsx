"use client";

import * as React from "react";
import { Shield, ShieldAlert, History, Activity, Database, CheckCircle2 } from "lucide-react";
import { AuditEventRecord, AuditChainVerificationResult } from "@/lib/audit/audit-ledger";
import { AuditChainBadge } from "./audit-chain-badge";
import { AuditLedgerTable } from "./audit-ledger-table";

export interface AuditLedgerViewProps {
  initialEvents: AuditEventRecord[];
  initialVerification: AuditChainVerificationResult | null;
  totalCount?: number;
}

export function AuditLedgerView({
  initialEvents,
  initialVerification,
  totalCount = 0,
}: AuditLedgerViewProps) {
  const [events, setEvents] = React.useState<AuditEventRecord[]>(initialEvents);
  const [verification, setVerification] = React.useState<AuditChainVerificationResult | null>(
    initialVerification
  );
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/audit/verify");
      if (!res.ok) {
        throw new Error(`Verification API returned status ${res.status}`);
      }
      const data: AuditChainVerificationResult = await res.json();
      setVerification(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to execute chain verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const latestEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="audit-view">
      {/* Header & Verification Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              Tamper-Evident Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            REQ-AUD-01 • Cryptographic SHA-256 Hash Chained Security Trail
          </p>
        </div>

        <AuditChainBadge
          status={verification}
          isVerifying={isVerifying}
          onVerify={handleVerifyChain}
        />
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-surface-3 bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Total Audit Events</span>
            <Activity className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="mt-2 text-2xl font-bold text-text-primary font-mono">
            {totalCount || events.length}
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            Immutable append-only entries recorded
          </p>
        </div>

        <div className="p-4 rounded-xl border border-surface-3 bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Cryptographic Chain Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-text-primary font-mono flex items-center gap-1.5">
            {verification?.isValid ? (
              <span className="text-emerald-400">100% Intact</span>
            ) : verification ? (
              <span className="text-rose-400">Compromised</span>
            ) : (
              <span className="text-text-secondary">Unverified</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-text-secondary font-mono">
            {verification?.verifiedCount ?? 0} blocks cryptographically linked
          </p>
        </div>

        <div className="p-4 rounded-xl border border-surface-3 bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Latest Recorded Block</span>
            <Database className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="mt-2 text-sm font-semibold text-text-primary truncate font-mono">
            {latestEvent ? `#${latestEvent.sequence} • ${latestEvent.event_type}` : "None"}
          </div>
          <p className="mt-1 text-[11px] text-text-secondary font-mono truncate">
            {latestEvent ? `Head: ${latestEvent.hash.slice(0, 12)}...` : "Genesis awaiting events"}
          </p>
        </div>
      </div>

      {/* Main Ledger Table */}
      <AuditLedgerTable events={events} />
    </div>
  );
}
