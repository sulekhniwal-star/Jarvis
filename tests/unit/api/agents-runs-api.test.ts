import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/agents/runs/route";

const mockListRuns = vi.fn();
const mockTaskGetById = vi.fn();
const mockProjectGetById = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/repositories/agent-run-repository", () => ({
  AgentRunRepository: vi.fn().mockImplementation(() => ({
    listRuns: mockListRuns,
  })),
}));

vi.mock("@/lib/repositories/task-repository", () => ({
  TaskRepository: vi.fn().mockImplementation(() => ({
    getById: mockTaskGetById,
  })),
}));

vi.mock("@/lib/repositories/project-repository", () => ({
  ProjectRepository: vi.fn().mockImplementation(() => ({
    getById: mockProjectGetById,
  })),
}));

describe("GET /api/agents/runs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRuns = [
    {
      id: "run-001",
      task_id: "task-001",
      agent_engine: "aider",
      status: "completed",
      git_commit_hash: "a1b2c3d",
      started_at: "2026-11-16T10:00:00Z",
      completed_at: "2026-11-16T10:01:00Z", // 60s = 60000ms
      created_at: "2026-11-16T10:00:00Z",
    },
    {
      id: "run-002",
      task_id: "task-002",
      agent_engine: "mock",
      status: "failed",
      git_commit_hash: null,
      started_at: "2026-11-16T10:05:00Z",
      completed_at: "2026-11-16T10:05:30Z", // 30s = 30000ms
      created_at: "2026-11-16T10:05:00Z",
      error_summary: "Execution timed out",
    },
    {
      id: "run-003",
      task_id: "task-001",
      agent_engine: "aider",
      status: "running",
      git_commit_hash: null,
      started_at: "2026-11-16T10:10:00Z",
      completed_at: null,
      created_at: "2026-11-16T10:10:00Z",
    },
  ];

  it("returns enriched runs and aggregate metrics", async () => {
    mockListRuns.mockResolvedValueOnce({
      data: mockRuns,
      total: 3,
      limit: 50,
      offset: 0,
    });

    mockTaskGetById.mockImplementation(async (id: string) => {
      if (id === "task-001") {
        return {
          id: "task-001",
          title: "Setup Auth API",
          priority: "high",
          project_id: "proj-001",
        };
      }
      return {
        id: "task-002",
        title: "Database Migration",
        priority: "critical",
        project_id: "proj-001",
      };
    });

    mockProjectGetById.mockResolvedValue({
      id: "proj-001",
      name: "Autonomous Core",
      slug: "autonomous-core",
    });

    const request = new NextRequest("http://localhost:3000/api/agents/runs");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.total).toBe(3);
    expect(data.runs).toHaveLength(3);

    // Verify task & project metadata enrichment
    expect(data.runs[0].taskTitle).toBe("Setup Auth API");
    expect(data.runs[0].projectName).toBe("Autonomous Core");
    expect(data.runs[0].durationMs).toBe(60000);

    // Verify aggregate metrics
    expect(data.metrics).toEqual({
      totalRuns: 3,
      activeRuns: 1, // run-003 is running
      completedRuns: 1, // run-001
      failedRuns: 1, // run-002
      successRate: 50, // 1 / (1 + 1) * 100
      avgDurationMs: 45000, // (60000 + 30000) / 2
    });
  });

  it("filters runs in-memory by search parameter", async () => {
    mockListRuns.mockResolvedValueOnce({
      data: mockRuns,
      total: 3,
      limit: 50,
      offset: 0,
    });

    mockTaskGetById.mockImplementation(async (id: string) => {
      if (id === "task-001") {
        return { id: "task-001", title: "Setup Auth API", project_id: "proj-001" };
      }
      return { id: "task-002", title: "Database Migration", project_id: "proj-001" };
    });

    mockProjectGetById.mockResolvedValue({
      id: "proj-001",
      name: "Autonomous Core",
      slug: "autonomous-core",
    });

    const request = new NextRequest("http://localhost:3000/api/agents/runs?search=auth");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    // Only run-001 and run-003 are associated with "Setup Auth API"
    expect(data.runs).toHaveLength(2);
    expect(data.runs.every((r: { taskTitle: string }) => r.taskTitle.includes("Auth"))).toBe(true);
  });

  it("passes status and engine query parameters to repository", async () => {
    mockListRuns.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 10,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/agents/runs?status=completed&agentEngine=aider&limit=20&offset=10"
    );
    await GET(request);

    expect(mockListRuns).toHaveBeenCalledWith({
      status: "completed",
      agentEngine: "aider",
      taskId: undefined,
      limit: 20,
      offset: 10,
    });
  });
});
