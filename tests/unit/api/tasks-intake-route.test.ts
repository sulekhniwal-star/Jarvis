import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as intakeHandler } from "@/app/api/tasks/intake/route";
import { POST as clarifyHandler } from "@/app/api/tasks/[id]/clarify/route";

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
  id: "11111111-1111-1111-1111-111111111111",
  project_id: "22222222-2222-2222-2222-222222222222",
  title: "Health Check Endpoint",
  description: "Create a GET /api/health endpoint",
  status: "intake",
};

const mockSpecRecord = {
  id: "33333333-3333-3333-3333-333333333333",
  task_id: "11111111-1111-1111-1111-111111111111",
  scope: "Implement health route",
  exclusions: "No database check",
  acceptance_criteria: [],
  raw_user_prompt: "Create a GET /api/health endpoint",
  version: 1,
};

const mockTaskCreate = vi.fn().mockResolvedValue(mockTask);
const mockTaskUpdateStatus = vi.fn().mockResolvedValue({ ...mockTask, status: "specifying" });
const mockTaskGetById = vi.fn().mockResolvedValue({ ...mockTask, status: "specifying" });

vi.mock("@/lib/repositories/task-repository", () => {
  return {
    TaskRepository: vi.fn().mockImplementation(() => ({
      create: mockTaskCreate,
      updateStatus: mockTaskUpdateStatus,
      getById: mockTaskGetById,
    })),
  };
});

const mockSpecCreate = vi.fn().mockResolvedValue(mockSpecRecord);
const mockSpecFindByTaskId = vi.fn().mockResolvedValue(mockSpecRecord);
const mockSpecCreateRevision = vi.fn().mockResolvedValue({ ...mockSpecRecord, version: 2 });

vi.mock("@/lib/repositories/specification-repository", () => {
  return {
    SpecificationRepository: vi.fn().mockImplementation(() => ({
      create: mockSpecCreate,
      findByTaskId: mockSpecFindByTaskId,
      createRevision: mockSpecCreateRevision,
    })),
  };
});

let mockSpecifierResponse: any = {
  status: "specified",
  ambiguity: { score: 0.1, dimensions: {}, reasoning: "Clear" },
  specification: {
    scope: "Implement health check endpoint",
    exclusions: "No external DB check",
    acceptanceCriteria: [
      {
        id: "AC-1",
        title: "200 OK",
        given: "Server running",
        when: "GET /api/health",
        then: "Returns 200",
      },
    ],
    assumptions: [],
  },
};

vi.mock("@/lib/agents/specifier", () => {
  return {
    SpecifierAgent: vi.fn().mockImplementation(() => ({
      specify: vi.fn().mockImplementation(() => Promise.resolve(mockSpecifierResponse)),
      specifyWithClarifications: vi.fn().mockImplementation(() => Promise.resolve(mockSpecifierResponse)),
    })),
    SpecifierValidationError: class SpecifierValidationError extends Error {},
  };
});

describe("Task Intake & Clarification Route Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpecifierResponse = {
      status: "specified",
      ambiguity: { score: 0.1, dimensions: {}, reasoning: "Clear" },
      specification: {
        scope: "Implement health check endpoint",
        exclusions: "No external DB check",
        acceptanceCriteria: [
          {
            id: "AC-1",
            title: "200 OK",
            given: "Server running",
            when: "GET /api/health",
            then: "Returns 200",
          },
        ],
        assumptions: [],
      },
    };
  });

  describe("POST /api/tasks/intake", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/tasks/intake", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await intakeHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });

    it("creates task, specifies it, and returns 201 for clear prompt", async () => {
      const req = new NextRequest("http://localhost:3000/api/tasks/intake", {
        method: "POST",
        body: JSON.stringify({
          projectId: "22222222-2222-2222-2222-222222222222",
          title: "Health Check",
          rawPrompt: "Create a GET /api/health route",
        }),
      });

      const res = await intakeHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.status).toBe("specified");
      expect(data.taskId).toBe(mockTask.id);
      expect(data.specificationId).toBe(mockSpecRecord.id);
      expect(mockTaskCreate).toHaveBeenCalled();
      expect(mockTaskUpdateStatus).toHaveBeenCalledWith(mockTask.id, "specifying");
      expect(mockSpecCreate).toHaveBeenCalled();
    });

    it("returns 200 with needs_clarification when prompt is ambiguous", async () => {
      mockSpecifierResponse = {
        status: "needs_clarification",
        ambiguity: { score: 0.6, dimensions: {}, reasoning: "Vague" },
        questions: [
          {
            id: "Q-1",
            question: "What auth provider?",
            rationale: "Required",
            recommendedOption: "Supabase",
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/tasks/intake", {
        method: "POST",
        body: JSON.stringify({
          projectId: "22222222-2222-2222-2222-222222222222",
          title: "Add auth",
          rawPrompt: "Add authentication",
        }),
      });

      const res = await intakeHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("needs_clarification");
      expect(data.questions).toHaveLength(1);
      expect(mockSpecCreate).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/tasks/[id]/clarify", () => {
    it("returns 400 when answers array is empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/tasks/11111111-1111-1111-1111-111111111111/clarify", {
        method: "POST",
        body: JSON.stringify({ answers: [] }),
      });

      const res = await clarifyHandler(req, {
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      });

      expect(res.status).toBe(400);
    });

    it("resolves clarification and returns 200 with specified result", async () => {
      const req = new NextRequest("http://localhost:3000/api/tasks/11111111-1111-1111-1111-111111111111/clarify", {
        method: "POST",
        body: JSON.stringify({
          answers: [
            {
              questionId: "Q-1",
              question: "What auth provider?",
              answer: "Supabase Auth",
            },
          ],
        }),
      });

      const res = await clarifyHandler(req, {
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("specified");
      expect(mockSpecCreateRevision).toHaveBeenCalled();
    });
  });
});
