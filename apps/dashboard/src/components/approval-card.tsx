'use client';

import React, { useState } from 'react';
import type { ApprovalRequestRow } from '@jarvis/database';
import { AlertCircle, Check, X, ShieldAlert } from 'lucide-react';

interface ApprovalCardProps {
  ticket: ApprovalRequestRow;
  onResolved?: () => void;
}

export function ApprovalCard({ ticket, onResolved }: ApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = (typeof ticket.payload_preview === 'object' && ticket.payload_preview !== null
    ? ticket.payload_preview
    : {}) as Record<string, unknown>;

  const riskLevel = (payload.riskLevel as string) || 'HIGH';

  const getRiskBadge = (r: string) => {
    switch (r) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: ticket.id,
          decision,
          comment: `Resolved via Web Dashboard as ${decision}`,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to resolve approval');
      }

      if (onResolved) onResolved();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-base text-foreground">{ticket.action_type}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-mono font-medium ${getRiskBadge(
                riskLevel
              )}`}
            >
              {riskLevel} RISK
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Ticket ID: {ticket.id} • Requested at: {new Date(ticket.requested_at).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDecision('APPROVED')}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Approve</span>
          </button>
          <button
            onClick={() => handleDecision('REJECTED')}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto border border-border/50">
        <pre>{JSON.stringify(payload, null, 2)}</pre>
      </div>

      {error && (
        <div className="text-xs text-rose-400 flex items-center space-x-1">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
