import * as React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProjectWorkspaceView } from "@/components/projects/project-workspace-view";
import { AuthRequiredBanner } from "@/components/auth/auth-required-banner";
import { getServerAuth } from "@/lib/auth/require-auth";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { MilestoneRepository } from "@/lib/repositories/milestone-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";

export const dynamic = "force-dynamic";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const { user, supabase, isConfigured } = await getServerAuth();

  if (!user || !supabase) {
    return (
      <AppShell title="Project Workspace">
        <AuthRequiredBanner isConfigured={isConfigured} />
      </AppShell>
    );
  }

  const projectRepo = new ProjectRepository(supabase);
  const milestoneRepo = new MilestoneRepository(supabase);
  const taskRepo = new TaskRepository(supabase);

  let project;
  try {
    if (UUID_REGEX.test(id)) {
      try {
        project = await projectRepo.getById(id, user.id);
      } catch {
        project = await projectRepo.getBySlug(id, user.id);
      }
    } else {
      project = await projectRepo.getBySlug(id, user.id);
    }
  } catch {
    project = null;
  }

  if (!project) {
    notFound();
  }

  const [milestones, tasksResult] = await Promise.all([
    milestoneRepo.listByProject(project.id).catch(() => []),
    taskRepo.listByProject(project.id, { limit: 200 }).catch(() => ({ data: [], total: 0 })),
  ]);

  const tasks = tasksResult.data ?? [];

  return (
    <AppShell title={`${project.name} Workspace`}>
      <ErrorBoundary>
        <ProjectWorkspaceView
          project={project}
          initialMilestones={milestones}
          initialTasks={tasks}
        />
      </ErrorBoundary>
    </AppShell>
  );
}
