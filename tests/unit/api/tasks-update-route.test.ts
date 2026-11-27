import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createTaskInProjectHandler } from "@/app/api/projects/[id]/tasks/route";
import { GET as getTaskDetailHandler, PATCH as updateTaskHandler } from "@/app/api/tasks/[id]/route";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

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
  name: "Jarvis Core",
  slug: "jarvis-core",
};

const mockTask = {
  id: "33333333-3333-3333-3333-333333333333",
  project_id: "11111111-1111-1111-1111-111111111111",
  title: "Setup Auth Gate",
  description: "Configure Next.js authentication",
  status: "intake",
  priority: "high",
  risk_level: "low",
  estimated_cost_inr: 10,
  actual_cost_inr: 0,
};

const mockSpec = {
  id: "spec-1",
  task_id: "33333333-3333-3333-3333-333333333333",
  scope: "Authentication gate",
  acceptance_criteria: ["Verify session", "Enforce login"],
};

const mockPlan = {
  id: "plan-1",
  task_id: "33333333-3333-3333-3333-333333333333",
  steps: [{ title: "Step 1" }],
  risk_level: "low",
};

const mockProjectGetById = vi.fn().mockResolvedValue(mockProject);
const mockProjectGetBySlug = vi.fn().mockResolvedValue(mockProject);
vi.mock("@/lib/repositories/project-repository", () => {
  return {
    ProjectRepository: vi.fn().mockImplementation(() => ({
      getById: mockProjectGetById,
      getBySlug: mockProjectGetBySlug,
    })),
  };
});

const mockTaskCreate = vi.fn();
const mockTaskGetById = vi.fn();
const mockTaskUpdate = vi.fn();
vi.mock("@/lib/repositories/task-repository", () => {
  return {
    TaskRepository: vi.fn().mockImplementation(() => ({
      create: mockTaskCreate,
      getById: mockTaskGetById,
      update: mockTaskUpdate,
    })),
  };
});

const mockSpecFindByTaskId = vi.fn();
vi.mock("@/lib/repositories/specification-repository", () => {
  return {
    SpecificationRepository: vi.fn().mockImplementation(() => ({
      findByTaskId: mockSpecFindByTaskId,
    })),
  };
});

const mockPlanFindByTaskId = vi.fn();
vi.mock("@/lib/repositories/plan-repository", () => {
  return {
    PlanRepository: vi.fn().mockImplementation(() => ({
      findByTaskId: mockPlanFindByTaskId,
    })),
  };
});

const mockRunListRunsByTask = vi.fn();
vi.mock("@/lib/repositories/agent-run-repository", () => {
  return {
    AgentRunRepository: vi.fn().mockImplementation(() => ({
      listRunsByTask: mockRunListRunsByTask,
    })),
  };
});

describe("Task Mutation & Detail API Routes (REQ-UI-PROJ-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskGetById.mockResolvedValue(mockTask);
    mockTaskCreate.mockResolvedValue(mockTask);
    mockTaskUpdate.mockImplementation((_id, data) =>
      Promise.resolve({ ...mockTask, ...data })
    );
    mockSpecFindByTaskId.mockResolvedValue(mockSpec);
    mockPlanFindByTaskId.mockResolvedValue(mockPlan);
    mockRunListRunsByTask.mockResolvedValue([]);
  });

  describe("POST /api/projects/[id]/tasks", () => {
    it("creates a task in the project and returns 201", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/11111111-1111-1111-1111-111111111111/tasks",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Setup Auth Gate",
            description: "Configure Next.js authentication",
            priority: "high",
            estimatedCostInr: 10,
          }),
        }
      );

      const response = await createTaskInProjectHandler(request, {
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.task.title).toBe("Setup Auth Gate");
      expect(mockTaskCreate).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        expect.objectContaining({
          title: "Setup Auth Gate",
          priority: "high",
        })
      );
    });

    it("returns 400 when task title is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/11111111-1111-1111-1111-111111111111/tasks",
        {
          method: "POST",
          body: JSON.stringify({
            title: "",
          }),
        }
      );

      const response = await createTaskInProjectHandler(request, {
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/tasks/[id]", () => {
    it("returns 200 with task, linked specification, plan, and runs", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/tasks/33333333-3333-3333-3333-333333333333"
      );
      const response = await getTaskDetailHandler(request, {
        params: Promise.resolve({ id: "33333333-3333-3333-3333-333333333333" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.task.id).toBe("33333333-3333-3333-3333-333333333333");
      expect(json.specification.id).toBe("spec-1");
      expect(json.plan.id).toBe("plan-1");
    });
  });

  describe("PATCH /api/tasks/[id]", () => {
    it("updates task status when transition is legal according to TaskStateMachine", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/tasks/33333333-3333-3333-3333-333333333333",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "specifying", // intake -> specifying is legal
          }),
        }
      );

      const response = await updateTaskHandler(request, {
        params: Promise.resolve({ id: "33333333-3333-3333-3333-333333333333" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.task.status).toBe("specifying");
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        "33333333-3333-3333-3333-333333333333",
        expect.objectContaining({ status: "specifying" })
      );
    });

    it("rejects illegal status transition with 400 and INVALID_STATE_TRANSITION", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/tasks/33333333-3333-3333-3333-333333333333",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed", // intake -> completed is illegal!
          }),
        }
      );

      const response = await updateTaskHandler(request, {
        params: Promise.resolve({ id: "33333333-3333-3333-3333-333333333333" }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("INVALID_STATE_TRANSITION");
      expect(json.message).toContain("Cannot transition task from 'intake' to 'completed'");
    });

    it("updates priority and description without status change", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/tasks/33333333-3333-3333-3333-333333333333",
        {
          method: "PATCH",
          body: JSON.stringify({
            priority: "critical",
            description: "Updated description",
          }),
        }
      );

      const response = await updateTaskHandler(request, {
        params: Promise.resolve({ id: "33333333-3333-3333-3333-333333333333" }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.task.priority).toBe("critical");
    });
  });
});
