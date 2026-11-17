import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DeploymentsView } from "@/components/deployment/deployments-view";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import { DeploymentRecord } from "@/lib/deployment/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    try {
      supabase = createAdminClient();
    } catch {
      // Fallback
    }
  }

  let deployments: DeploymentRecord[] = [];
  let totalCount = 0;
  let activeProduction: DeploymentRecord | null = null;
  let latestPreview: DeploymentRecord | null = null;

  try {
    const manager = new DeploymentManager({ supabaseClient: supabase });
    const repo = manager.getRepository();

    const [listResult, activeProd, latestPrev] = await Promise.all([
      repo.listDeployments({ limit: 100 }),
      repo.getActiveProductionDeployment(),
      repo.getLatestPreviewDeployment(),
    ]);

    deployments = listResult.data;
    totalCount = listResult.count;
    activeProduction = activeProd;
    latestPreview = latestPrev;
  } catch (err) {
    console.error("[DeploymentsPage] Failed to prefetch deployment records:", err);
  }

  return (
    <AppShell title="Deployments">
      <ErrorBoundary>
        <DeploymentsView
          initialDeployments={deployments}
          initialActiveProduction={activeProduction}
          initialLatestPreview={latestPreview}
          totalCount={totalCount}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
