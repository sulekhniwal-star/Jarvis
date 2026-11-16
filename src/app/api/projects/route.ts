import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { MilestoneRepository } from "@/lib/repositories/milestone-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";

const CreateProjectSchema = z.object({
  name: z.string({ message: "Project name is required" }).min(1, "Project name is required"),
  description: z.string().optional().nullable(),
  repositoryUrl: z.string().url().optional().nullable().or(z.literal("")),
  defaultBranch: z.string().optional().default("main"),
  settings: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const projectRepo = new ProjectRepository(supabase);
    const milestoneRepo = new MilestoneRepository(supabase);
    const taskRepo = new TaskRepository(supabase);

    const paginated = await projectRepo.list(userId, { limit, offset });

    // Enrich each project with milestone and task counts
    const enrichedProjects = await Promise.all(
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

    return NextResponse.json({
      data: enrichedProjects,
      total: paginated.total,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    let supabase;
    let userId = parsed.data.userId;

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
    const project = await projectRepo.create(userId, {
      name: parsed.data.name,
      description: parsed.data.description,
      repositoryUrl: parsed.data.repositoryUrl || undefined,
      defaultBranch: parsed.data.defaultBranch,
      settings: parsed.data.settings,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
