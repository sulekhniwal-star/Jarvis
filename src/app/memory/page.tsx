import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  MemoryBrowserView,
  MemoryMetrics,
} from "@/components/memory/memory-browser-view";
import { MemoryItem } from "@/components/memory/memory-card";
import { ProjectOption } from "@/components/memory/create-memory-modal";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { MemoryRepository } from "@/lib/repositories/memory-repository";
import { ProjectRepository } from "@/lib/repositories/project-repository";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Semantic Memory Store">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  let memories: MemoryItem[] = [];
  let projects: ProjectOption[] = [];
  let metrics: MemoryMetrics = {
    total: 0,
    userPreferences: 0,
    projectDecisions: 0,
    architecturePatterns: 0,
    historicalErrors: 0,
  };

  try {
    const memoryRepo = new MemoryRepository(supabase);
    const projectRepo = new ProjectRepository(supabase);

    const [memoriesResult, projectsResult] = await Promise.all([
      memoryRepo.listMemories({ userId: user.id, limit: 100 }),
      projectRepo.list(user.id, { limit: 100 }),
    ]);

    projects = projectsResult.data.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
    }));

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    memories = memoriesResult.data.map((m) => ({
      ...m,
      projectName: m.project_id ? projectMap.get(m.project_id) : undefined,
    }));

    metrics = {
      total: memories.length,
      userPreferences: memories.filter((m) => m.category === "user_preference").length,
      projectDecisions: memories.filter((m) => m.category === "project_decision").length,
      architecturePatterns: memories.filter((m) => m.category === "architecture_pattern").length,
      historicalErrors: memories.filter((m) => m.category === "historical_error").length,
    };
  } catch {
    // Graceful fallback
  }

  return (
    <AppShell title="Semantic Memory Store">
      <ErrorBoundary>
        <MemoryBrowserView
          initialMemories={memories}
          initialMetrics={metrics}
          projects={projects}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
