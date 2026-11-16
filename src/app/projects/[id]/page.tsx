import * as React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProjectWorkspaceView } from "@/components/projects/project-workspace-view";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  let supabase;
  let userId = "00000000-0000-0000-0000-000000000001";

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

  const projectRepo = new ProjectRepository(supabase);
  const milestoneRepo = new MilestoneRepository(supabase);
  const taskRepo = new TaskRepository(supabase);

  let project;
  try {
    if (UUID_REGEX.test(id)) {
      try {
        project = await projectRepo.getById(id, userId);
      } catch {
        project = await projectRepo.getBySlug(id, userId);
      }
    } else {
      project = await projectRepo.getBySlug(id, userId);
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
