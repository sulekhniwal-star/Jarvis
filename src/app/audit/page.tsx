import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuditLedgerView } from "@/components/audit/audit-ledger-view";
import {
  AuditLedgerService,
  AuditEventRecord,
  AuditChainVerificationResult,
  GENESIS_PREV_HASH,
} from "@/lib/audit/audit-ledger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  let supabase;
  let userId: string | null = null;

  try {
    supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  } catch {
    supabase = createAdminClient();
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
    const result = await auditService.listEvents(userId, { limit: 100 });
    events = result.events;
    totalCount = result.total;

    initialVerification = await auditService.verifyChainIntegrity({ userId });
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
