import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as planHandler } from "@/app/api/tasks/[id]/plan/route";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

// Mock repositories and agent
const mockTask = {
  id: "task-123",
  project_id: "proj-456",
  title: "Health Check",
  description: "Create health check",
  status: "specifying",
};

const mockSpecRecord = {
  id: "spec-789",
  task_id: "task-123",
  scope: "Implement health check",
  exclusions: "No database check",
  acceptance_criteria: [
    {
      id: "AC-1",
      title: "200 OK",
      given: "Server up",
      when: "GET /api/health",
      then: "200 OK",
    },
  ],
  version: 1,
};

const mockPlanRecord = {
  id: "plan-999",
  task_id: "task-123",
  steps: [{ id: "step-1", title: "Setup route", wave: 1 }],
  dependencies: [],
  risk_assessment: { overallRisk: "low", requiresHumanApproval: false },
  required_approvals: [],
  status: "draft",
  version: 1,
};

const mockTaskGetById = vi.fn().mockResolvedValue(mockTask);
const mockTaskUpdateStatus = vi.fn().mockResolvedValue({ ...mockTask, status: "planned" });

vi.mock("@/lib/repositories/task-repository", () => {
  return {
    TaskRepository: vi.fn().mockImplementation(() => ({
      getById: mockTaskGetById,
      updateStatus: mockTaskUpdateStatus,
    })),
  };
});

const mockSpecFindByTaskId = vi.fn().mockResolvedValue(mockSpecRecord);

vi.mock("@/lib/repositories/specification-repository", () => {
  return {
    SpecificationRepository: vi.fn().mockImplementation(() => ({
      findByTaskId: mockSpecFindByTaskId,
    })),
  };
});

const mockPlanCreate = vi.fn().mockResolvedValue(mockPlanRecord);
const mockPlanFindByTaskId = vi.fn().mockResolvedValue(null);
const mockPlanCreateRevision = vi.fn().mockResolvedValue({ ...mockPlanRecord, version: 2 });

vi.mock("@/lib/repositories/plan-repository", () => {
  return {
    PlanRepository: vi.fn().mockImplementation(() => ({
      create: mockPlanCreate,
      findByTaskId: mockPlanFindByTaskId,
      createRevision: mockPlanCreateRevision,
    })),
  };
});

let mockPlannerResult: any = {
  steps: [
    {
      id: "step-1",
      title: "Implement Health Route",
      description: "App router route handler.",
      filesTargeted: ["src/app/api/health/route.ts"],
      actionType: "create",
      wave: 1,
      dependencies: [],
      riskLevel: "low",
      requiresApproval: false,
      verificationCommand: "pnpm test tests/unit/health.test.ts",
      rollbackProcedure: "rm src/app/api/health/route.ts",
    },
  ],
  dependencies: [],
  riskAssessment: {
    overallRisk: "low",
    riskFactors: [],
    requiresHumanApproval: false,
    mitigations: [],
  },
  requiredApprovals: [],
};

vi.mock("@/lib/agents/planner", () => {
  return {
    PlannerAgent: vi.fn().mockImplementation(() => ({
      plan: vi.fn().mockImplementation(() => Promise.resolve(mockPlannerResult)),
    })),
    PlannerValidationError: class PlannerValidationError extends Error {},
    PlannerDAGError: class PlannerDAGError extends Error {},
  };
});

describe("POST /api/tasks/[id]/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskGetById.mockResolvedValue(mockTask);
    mockSpecFindByTaskId.mockResolvedValue(mockSpecRecord);
    mockPlanFindByTaskId.mockResolvedValue(null);
  });

  it("returns 404 when task does not exist", async () => {
    mockTaskGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/tasks/task-unknown/plan", {
      method: "POST",
    });

    const res = await planHandler(req, {
      params: Promise.resolve({ id: "task-unknown" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 409 when task is not in specifying status", async () => {
    mockTaskGetById.mockResolvedValue({ ...mockTask, status: "intake" });

    const req = new NextRequest("http://localhost:3000/api/tasks/task-123/plan", {
      method: "POST",
    });

    const res = await planHandler(req, {
      params: Promise.resolve({ id: "task-123" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns 404 when task has no specification", async () => {
    mockSpecFindByTaskId.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/tasks/task-123/plan", {
      method: "POST",
    });

    const res = await planHandler(req, {
      params: Promise.resolve({ id: "task-123" }),
    });

    expect(res.status).toBe(404);
  });

  it("generates plan, transitions task to planned, and returns 201", async () => {
    const req = new NextRequest("http://localhost:3000/api/tasks/task-123/plan", {
      method: "POST",
    });

    const res = await planHandler(req, {
      params: Promise.resolve({ id: "task-123" }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe("planned");
    expect(data.taskId).toBe("task-123");
    expect(data.planId).toBe(mockPlanRecord.id);
    expect(mockPlanCreate).toHaveBeenCalled();
    expect(mockTaskUpdateStatus).toHaveBeenCalledWith("task-123", "planned");
  });
});
