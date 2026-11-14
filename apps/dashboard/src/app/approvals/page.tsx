import React from 'react';
import { approvalRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import { ApprovalCard } from '@/components/approval-card';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const revalidate = 0;

export default async function ApprovalsPage() {
  const pending = await approvalRepo.listPendingByUser(DEFAULT_ADMIN_USER_ID);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
          <span>Action Governance & Approvals</span>
          {pending.length > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-semibold">
              {pending.length} ACTION REQUIRED
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-risk operations (deployments, funds, paid models, schema modifications) gated by the Jarvis Central Permission Engine.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">All Clear</h3>
          <p className="text-sm text-muted-foreground">
            No actions currently require human operator approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((ticket) => (
            <ApprovalCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
