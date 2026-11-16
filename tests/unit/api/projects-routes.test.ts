import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProjectsHandler, POST as createProjectHandler } from "@/app/api/projects/route";
import { GET as getProjectDetailHandler } from "@/app/api/projects/[id]/route";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

const mockProject = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-123",
  name: "Jarvis Core",
  slug: "jarvis-core",
  description: "AI Autonomous Command Centre",
  repository_url: "https://github.com/owner/jarvis",
  default_branch: "main",
  status: "active",
  settings: {},
  created_at: new Date().toISOString(),
};

const mockMilestone = {
  id: "22222222-2222-2222-2222-222222222222",
  project_id: "11111111-1111-1111-1111-111111111111",
  title: "Milestone 1: Foundation",
  description: "Scaffolding and database setup",
  sequence_order: 1,
  status: "completed",
};

const mockTasks = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    project_id: "11111111-1111-1111-1111-111111111111",
    milestone_id: "22222222-2222-2222-2222-222222222222",
    title: "Setup Next.js",
    status: "completed",
    priority: "high",
    risk_level: "low",
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    project_id: "11111111-1111-1111-1111-111111111111",
    milestone_id: "22222222-2222-2222-2222-222222222222",
    title: "Implement Supabase Auth",
    status: "running",
    priority: "urgent",
    risk_level: "high",
  },
];

const mockProjectCreate = vi.fn();
const mockProjectList = vi.fn();
const mockProjectGetById = vi.fn();
const mockProjectGetBySlug = vi.fn();

vi.mock("@/lib/repositories/project-repository", () => {
  return {
    ProjectRepository: vi.fn().mockImplementation(() => ({
      create: mockProjectCreate,
      list: mockProjectList,
      getById: mockProjectGetById,
      getBySlug: mockProjectGetBySlug,
    })),
  };
});

const mockMilestoneListByProject = vi.fn();
vi.mock("@/lib/repositories/milestone-repository", () => {
  return {
    MilestoneRepository: vi.fn().mockImplementation(() => ({
      listByProject: mockMilestoneListByProject,
    })),
  };
});

const mockTaskListByProject = vi.fn();
vi.mock("@/lib/repositories/task-repository", () => {
  return {
    TaskRepository: vi.fn().mockImplementation(() => ({
      listByProject: mockTaskListByProject,
    })),
  };
});

describe("Project API Routes (REQ-UI-PROJ-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectList.mockResolvedValue({
      data: [mockProject],
      total: 1,
      limit: 50,
      offset: 0,
    });
    mockProjectCreate.mockResolvedValue(mockProject);
    mockProjectGetById.mockResolvedValue(mockProject);
    mockProjectGetBySlug.mockResolvedValue(mockProject);
    mockMilestoneListByProject.mockResolvedValue([mockMilestone]);
    mockTaskListByProject.mockResolvedValue({
      data: mockTasks,
      total: 2,
    });
  });

  describe("GET /api/projects", () => {
    it("returns 200 with enriched projects list and velocity metrics", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await getProjectsHandler(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("Jarvis Core");
      expect(json.data[0].milestoneCount).toBe(1);
      expect(json.data[0].taskCount).toBe(2);
      expect(json.data[0].completedTaskCount).toBe(1);
      expect(json.data[0].completionVelocity).toBe(50); // 1 out of 2 = 50%
      expect(json.total).toBe(1);
    });
  });

  describe("POST /api/projects", () => {
    it("creates a new project and returns 201", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Jarvis Core",
          description: "AI Autonomous Command Centre",
          repositoryUrl: "https://github.com/owner/jarvis",
          defaultBranch: "main",
        }),
      });

      const response = await createProjectHandler(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.project.name).toBe("Jarvis Core");
      expect(mockProjectCreate).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          name: "Jarvis Core",
          description: "AI Autonomous Command Centre",
        })
      );
    });

    it("returns 400 when project name is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "",
        }),
      });

      const response = await createProjectHandler(request);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/projects/[id]", () => {
    it("returns 200 with complete project hierarchy and stats for UUID id", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/11111111-1111-1111-1111-111111111111"
      );
      const response = await getProjectDetailHandler(request, {
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.project.slug).toBe("jarvis-core");
      expect(json.milestones).toHaveLength(1);
      expect(json.tasks).toHaveLength(2);
      expect(json.stats.totalTasks).toBe(2);
      expect(json.stats.completedTasks).toBe(1);
      expect(json.stats.inProgressTasks).toBe(1);
      expect(json.stats.completionVelocity).toBe(50);
    });

    it("retrieves project by slug when non-UUID string is passed", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/jarvis-core"
      );
      const response = await getProjectDetailHandler(request, {
        params: Promise.resolve({ id: "jarvis-core" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(mockProjectGetBySlug).toHaveBeenCalledWith("jarvis-core", "user-123");
      expect(json.project.name).toBe("Jarvis Core");
    });
  });
});
