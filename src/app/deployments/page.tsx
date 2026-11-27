import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DeploymentsView } from "@/components/deployment/deployments-view";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import { DeploymentRecord } from "@/lib/deployment/types";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Deployments">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
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
