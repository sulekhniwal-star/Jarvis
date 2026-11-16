import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProjectsIndexView, ProjectSummary } from "@/components/projects/projects-index-view";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { MilestoneRepository } from "@/lib/repositories/milestone-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
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

  let projects: ProjectSummary[] = [];

  try {
    const projectRepo = new ProjectRepository(supabase);
    const milestoneRepo = new MilestoneRepository(supabase);
    const taskRepo = new TaskRepository(supabase);

    const paginated = await projectRepo.list(userId, { limit: 50 });

    projects = await Promise.all(
      paginated.data.map(async (project) => {
        try {
          const [milestones, tasks] = await Promise.all([
            milestoneRepo.listByProject(project.id),
            taskRepo.listByProject(project.id, { limit: 100 }),
          ]);

          const totalTasks = tasks.total;
          const completedTasks = tasks.data.filter((t) => t.status === "completed").length;
          const velocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            ...project,
            milestoneCount: milestones.length,
            taskCount: totalTasks,
            completedTaskCount: completedTasks,
            completionVelocity: velocity,
          };
        } catch {
          return {
            ...project,
            milestoneCount: 0,
            taskCount: 0,
            completedTaskCount: 0,
            completionVelocity: 0,
          };
        }
      })
    );
  } catch {
    projects = [];
  }

  return (
    <AppShell title="Projects Workspace">
      <ErrorBoundary>
        <ProjectsIndexView initialProjects={projects} />
      </ErrorBoundary>
    </AppShell>
  );
}
