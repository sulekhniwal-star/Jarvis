import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramIntakeService } from "@/lib/telegram/intake";

describe("TelegramIntakeService", () => {
  const userId = "00000000-0000-0000-0000-000000000001";

  let mockSpecifierAgent: any;
  let mockTaskRepo: any;
  let mockSpecRepo: any;
  let mockConvRepo: any;
  let mockProjectRepo: any;

  beforeEach(() => {
    mockSpecifierAgent = {
      specify: vi.fn(),
      specifyWithClarifications: vi.fn(),
    };

    mockTaskRepo = {
      create: vi.fn().mockResolvedValue({
        id: "task-123",
        title: "Test Task",
        status: "specifying",
      }),
    };

    mockSpecRepo = {
      create: vi.fn().mockResolvedValue({
        id: "spec-123",
        task_id: "task-123",
      }),
    };

    mockConvRepo = {
      createConversation: vi.fn().mockResolvedValue({
        id: "conv-123",
        user_id: userId,
      }),
      listConversations: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
      }),
      updateMetadata: vi.fn().mockResolvedValue({
        id: "conv-123",
      }),
    };

    mockProjectRepo = {
      list: vi.fn().mockResolvedValue({
        data: [{ id: "proj-1", name: "Main Project" }],
        total: 1,
      }),
      create: vi.fn().mockResolvedValue({
        id: "proj-default",
        name: "Personal Workspace",
      }),
    };
  });

  function createService() {
    return new TelegramIntakeService({
      specifierAgent: mockSpecifierAgent,
      taskRepo: mockTaskRepo,
      specRepo: mockSpecRepo,
      convRepo: mockConvRepo,
      projectRepo: mockProjectRepo,
    });
  }

  it("handles low ambiguity prompt by creating task and specification draft", async () => {
    mockSpecifierAgent.specify.mockResolvedValue({
      status: "specified",
      ambiguity: {
        score: 0.15,
        dimensions: {
          goalClarity: 0.1,
          technicalBoundaries: 0.1,
          acceptanceMeasurability: 0.2,
          preconditions: 0.2,
        },
        reasoning: "Clear prompt",
      },
      specification: {
        scope: "Implement export CSV route handler",
        exclusions: "No XLSX support",
        acceptanceCriteria: [
          {
            id: "ac-1",
            title: "Export CSV",
            given: "Admin user",
            when: "Calling /export",
            then: "Returns 200 with CSV payload",
          },
        ],
        assumptions: [],
      },
    });

    const service = createService();
    const result = await service.handleNewTaskPrompt(
      userId,
      "Implement export CSV route handler for reports"
    );

    expect(mockProjectRepo.list).toHaveBeenCalledWith(userId, { limit: 1 });
    expect(mockTaskRepo.create).toHaveBeenCalledWith("proj-1", expect.objectContaining({
      title: "Implement export CSV route handler for reports",
      description: "Implement export CSV route handler for reports",
    }));

    expect(mockSpecRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      taskId: "task-123",
      scope: "Implement export CSV route handler",
      exclusions: "No XLSX support",
      rawUserPrompt: "Implement export CSV route handler for reports",
    }));

    expect(result).toContain("Specification Formulated");
    expect(result).toContain("Implement export CSV route handler");
    expect(result).toContain("1 testable criteria");
  });

  it("handles high ambiguity prompt by asking clarification questions and saving conversation", async () => {
    mockSpecifierAgent.specify.mockResolvedValue({
      status: "needs_clarification",
      ambiguity: {
        score: 0.55,
        dimensions: {
          goalClarity: 0.6,
          technicalBoundaries: 0.6,
          acceptanceMeasurability: 0.5,
          preconditions: 0.5,
        },
        reasoning: "Ambiguous requirements",
      },
      questions: [
        { id: "q1", question: "Which database table should be queried?", rationale: "Unclear data source" },
        { id: "q2", question: "What date range should be included?", rationale: "Unclear filtering" },
      ],
    });

    const service = createService();
    const result = await service.handleNewTaskPrompt(
      userId,
      "Fix the reporting feature"
    );

    expect(mockConvRepo.createConversation).toHaveBeenCalledWith(userId, expect.objectContaining({
      channel: "telegram",
      title: "Telegram Clarification: Test Task",
      metadata: expect.objectContaining({
        taskId: "task-123",
        awaitingClarification: true,
        round: 1,
      }),
    }));

    expect(result).toContain("Clarification Needed");
    expect(result).toContain("Which database table should be queried?");
    expect(result).toContain("What date range should be included?");
    expect(result).toContain("/cancel");
  });

  it("creates default project when user has no existing projects", async () => {
    mockProjectRepo.list.mockResolvedValue({ data: [], total: 0 });
    mockSpecifierAgent.specify.mockResolvedValue({
      status: "specified",
      ambiguity: {
        score: 0.1,
        dimensions: {
          goalClarity: 0.1,
          technicalBoundaries: 0.1,
          acceptanceMeasurability: 0.1,
          preconditions: 0.1,
        },
        reasoning: "Simple",
      },
      specification: {
        scope: "Simple task scope definition",
        exclusions: "None at this time",
        acceptanceCriteria: [
          {
            id: "ac-1",
            title: "Basic criterion",
            given: "App is running",
            when: "Invoked",
            then: "Succeeds",
          },
        ],
        assumptions: [],
      },
    });

    const service = createService();
    await service.handleNewTaskPrompt(userId, "Simple task prompt");

    expect(mockProjectRepo.create).toHaveBeenCalledWith(userId, expect.objectContaining({
      name: "Personal Workspace",
    }));
    expect(mockTaskRepo.create).toHaveBeenCalledWith("proj-default", expect.any(Object));
  });

  it("handles empty prompt with warning message", async () => {
    const service = createService();
    const result = await service.handleNewTaskPrompt(userId, "   ");
    expect(result).toContain("Prompt cannot be empty");
    expect(mockTaskRepo.create).not.toHaveBeenCalled();
  });

  it("handles agent failure gracefully", async () => {
    mockSpecifierAgent.specify.mockRejectedValue(new Error("AI Gateway offline"));

    const service = createService();
    const result = await service.handleNewTaskPrompt(userId, "Build a feature");

    expect(result).toContain("Specification Error");
    expect(result).toContain("AI Gateway offline");
  });
});
