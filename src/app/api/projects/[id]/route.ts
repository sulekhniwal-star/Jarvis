import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { MilestoneRepository } from "@/lib/repositories/milestone-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Project ID or slug is required" },
        { status: 400 }
      );
    }

    let supabase;
    let userId: string | undefined;

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

    if (!userId) {
      userId = "00000000-0000-0000-0000-000000000001";
    }

    const projectRepo = new ProjectRepository(supabase);
    const milestoneRepo = new MilestoneRepository(supabase);
    const taskRepo = new TaskRepository(supabase);

    let project;
    if (UUID_REGEX.test(id)) {
      try {
        project = await projectRepo.getById(id, userId);
      } catch {
        project = await projectRepo.getBySlug(id, userId);
      }
    } else {
      project = await projectRepo.getBySlug(id, userId);
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch milestones and tasks for this project
    const [milestones, tasksResult] = await Promise.all([
      milestoneRepo.listByProject(project.id),
      taskRepo.listByProject(project.id, { limit: 200 }),
    ]);

    const tasks = tasksResult.data;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter((t) => t.status === "running" || t.status === "verifying").length;
    const blockedTasks = tasks.filter(
      (t) => t.status === "awaiting_approval" || t.status === "failed" || t.status === "cancelled"
    ).length;
    const backlogTasks = tasks.filter(
      (t) => t.status === "intake" || t.status === "specifying" || t.status === "planned"
    ).length;
    const completionVelocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      project,
      milestones,
      tasks,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        backlogTasks,
        completionVelocity,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch project hierarchy";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
