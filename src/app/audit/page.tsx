import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuditLedgerView } from "@/components/audit/audit-ledger-view";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import {
  AuditLedgerService,
  AuditEventRecord,
  AuditChainVerificationResult,
  GENESIS_PREV_HASH,
} from "@/lib/audit/audit-ledger";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Audit Ledger">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let events: AuditEventRecord[] = [];
  let totalCount = 0;
  let initialVerification: AuditChainVerificationResult | null = {
    isValid: true,
    verifiedCount: 0,
    chainHeadHash: GENESIS_PREV_HASH,
    timestamp: new Date().toISOString(),
  };

  try {
    const auditService = new AuditLedgerService(supabase);
    const result = await auditService.listEvents(user.id, { limit: 100 });
    events = result.events;
    totalCount = result.total;

    initialVerification = await auditService.verifyChainIntegrity({ userId: user.id });
  } catch (err) {
    console.error("[AuditPage] Failed to prefetch audit ledger data:", err);
  }

  return (
    <AppShell title="Audit Ledger">
      <ErrorBoundary>
        <AuditLedgerView
          initialEvents={events}
          initialVerification={initialVerification}
          totalCount={totalCount}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
