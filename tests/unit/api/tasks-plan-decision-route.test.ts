import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as decisionHandler } from "@/app/api/tasks/[id]/plan/decision/route";

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
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

const mockTask = {
  id: "task-100",
  project_id: "proj-200",
  title: "Build Authentication",
  status: "planned",
};

const mockPlan = {
  id: "plan-300",
  task_id: "task-100",
  status: "draft",
  required_approvals: ["database_migration"],
  version: 1,
};

const mockTaskGetById = vi.fn().mockResolvedValue(mockTask);
const mockTaskUpdateStatus = vi.fn().mockResolvedValue({ ...mockTask, status: "running" });

vi.mock("@/lib/repositories/task-repository", () => ({
  TaskRepository: vi.fn().mockImplementation(() => ({
    getById: mockTaskGetById,
    updateStatus: mockTaskUpdateStatus,
  })),
}));

const mockPlanFindByTaskId = vi.fn().mockResolvedValue(mockPlan);
const mockPlanUpdateStatus = vi.fn().mockResolvedValue({ ...mockPlan, status: "approved" });

vi.mock("@/lib/repositories/plan-repository", () => ({
  PlanRepository: vi.fn().mockImplementation(() => ({
    findByTaskId: mockPlanFindByTaskId,
    updateStatus: mockPlanUpdateStatus,
  })),
}));

const mockApprovalCreate = vi.fn().mockResolvedValue({ id: "appr-1" });
const mockApprovalApprove = vi.fn().mockResolvedValue({ id: "appr-1", status: "approved" });

vi.mock("@/lib/repositories/approval-repository", () => ({
  ApprovalRepository: vi.fn().mockImplementation(() => ({
    createApproval: mockApprovalCreate,
    approve: mockApprovalApprove,
  })),
}));

describe("POST /api/tasks/[id]/plan/decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskGetById.mockResolvedValue(mockTask);
    mockPlanFindByTaskId.mockResolvedValue(mockPlan);
  });

  it("returns 400 when decision field is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/tasks/task-100/plan/decision", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await decisionHandler(req, {
      params: Promise.resolve({ id: "task-100" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when task is not found", async () => {
    mockTaskGetById.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/tasks/task-missing/plan/decision", {
      method: "POST",
      body: JSON.stringify({ decision: "approve" }),
    });

    const res = await decisionHandler(req, {
      params: Promise.resolve({ id: "task-missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 409 when task is in an un-approvable state", async () => {
    mockTaskGetById.mockResolvedValue({ ...mockTask, status: "running" });

    const req = new NextRequest("http://localhost:3000/api/tasks/task-100/plan/decision", {
      method: "POST",
      body: JSON.stringify({ decision: "approve" }),
    });

    const res = await decisionHandler(req, {
      params: Promise.resolve({ id: "task-100" }),
    });

    expect(res.status).toBe(409);
  });

  it("approves plan: updates plan status, transitions task to running, and returns 200", async () => {
    const req = new NextRequest("http://localhost:3000/api/tasks/task-100/plan/decision", {
      method: "POST",
      body: JSON.stringify({ decision: "approve", userId: "user-123" }),
    });

    const res = await decisionHandler(req, {
      params: Promise.resolve({ id: "task-100" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("approved");
    expect(data.taskStatus).toBe("running");
    expect(mockPlanUpdateStatus).toHaveBeenCalledWith(mockPlan.id, "approved");
    expect(mockTaskUpdateStatus).toHaveBeenCalledWith("task-100", "running");
  });

  it("requests revision: marks plan superseded, transitions task to specifying, and returns 200", async () => {
    const req = new NextRequest("http://localhost:3000/api/tasks/task-100/plan/decision", {
      method: "POST",
      body: JSON.stringify({
        decision: "request_revision",
        feedback: "Please add integration tests to Wave 2",
      }),
    });

    const res = await decisionHandler(req, {
      params: Promise.resolve({ id: "task-100" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("superseded");
    expect(data.taskStatus).toBe("specifying");
    expect(data.feedback).toBe("Please add integration tests to Wave 2");
    expect(mockPlanUpdateStatus).toHaveBeenCalledWith(mockPlan.id, "superseded");
    expect(mockTaskUpdateStatus).toHaveBeenCalledWith("task-100", "specifying");
  });
});
