import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramIntakeService } from "@/lib/telegram/intake";

describe("Telegram Clarification Loop", () => {
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
      create: vi.fn(),
    };

    mockSpecRepo = {
      create: vi.fn().mockResolvedValue({
        id: "spec-999",
        task_id: "task-123",
      }),
    };

    mockConvRepo = {
      listConversations: vi.fn().mockResolvedValue({
        data: [
          {
            id: "conv-100",
            channel: "telegram",
            status: "active",
            metadata: {
              taskId: "task-123",
              awaitingClarification: true,
              originalPrompt: "Build an auth route",
              questions: [
                { id: "q1", question: "Which auth provider?", rationale: "Unclear provider" },
              ],
              round: 1,
            },
          },
        ],
        total: 1,
      }),
      updateMetadata: vi.fn().mockResolvedValue({ id: "conv-100" }),
    };

    mockProjectRepo = {
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      create: vi.fn(),
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

  it("resolves specification when owner answers clarification questions", async () => {
    mockSpecifierAgent.specifyWithClarifications.mockResolvedValue({
      status: "specified",
      ambiguity: {
        score: 0.1,
        dimensions: {
          goalClarity: 0.1,
          technicalBoundaries: 0.1,
          acceptanceMeasurability: 0.1,
          preconditions: 0.1,
        },
        reasoning: "Clarification provided",
      },
      specification: {
        scope: "Implement GitHub OAuth authentication route handler",
        exclusions: "No email/password auth",
        acceptanceCriteria: [
          {
            id: "ac-1",
            title: "OAuth Callback",
            given: "GitHub auth token",
            when: "Callback hit",
            then: "Creates session",
          },
        ],
        assumptions: [],
      },
    });

    const service = createService();
    const result = await service.handleClarificationAnswer(userId, "Use GitHub OAuth only");

    expect(mockSpecifierAgent.specifyWithClarifications).toHaveBeenCalledWith(
      expect.objectContaining({
        rawPrompt: "Build an auth route",
        userId,
      }),
      [
        {
          questionId: "q1",
          question: "Which auth provider?",
          answer: "Use GitHub OAuth only",
        },
      ]
    );

    expect(mockSpecRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      taskId: "task-123",
      scope: "Implement GitHub OAuth authentication route handler",
    }));

    expect(mockConvRepo.updateMetadata).toHaveBeenCalledWith(
      "conv-100",
      userId,
      expect.objectContaining({
        awaitingClarification: false,
        completed: true,
      })
    );

    expect(result).toContain("Specification Formulated");
    expect(result).toContain("GitHub OAuth");
  });

  it("handles multi-round clarification when ambiguity remains high in round 1", async () => {
    mockSpecifierAgent.specifyWithClarifications.mockResolvedValue({
      status: "needs_clarification",
      ambiguity: {
        score: 0.45,
        dimensions: {
          goalClarity: 0.5,
          technicalBoundaries: 0.5,
          acceptanceMeasurability: 0.4,
          preconditions: 0.4,
        },
        reasoning: "Still ambiguous",
      },
      questions: [
        { id: "q2", question: "What redirect URI should be configured?", rationale: "Needed for OAuth" },
      ],
    });

    const service = createService();
    const result = await service.handleClarificationAnswer(userId, "Just use OAuth");

    expect(mockConvRepo.updateMetadata).toHaveBeenCalledWith(
      "conv-100",
      userId,
      expect.objectContaining({
        awaitingClarification: true,
        round: 2,
        questions: expect.any(Array),
      })
    );

    expect(result).toContain("Clarification Needed \\(Round 2\\)");
    expect(result).toContain("What redirect URI should be configured?");
  });

  it("cancels active clarification session via cancelClarification", async () => {
    const service = createService();
    const result = await service.cancelClarification(userId);

    expect(mockConvRepo.updateMetadata).toHaveBeenCalledWith(
      "conv-100",
      userId,
      expect.objectContaining({
        awaitingClarification: false,
        cancelled: true,
      })
    );

    expect(result).toContain("Clarification Cancelled");
  });

  it("reports when there is no active clarification session to cancel", async () => {
    mockConvRepo.listConversations.mockResolvedValue({ data: [], total: 0 });

    const service = createService();
    const result = await service.cancelClarification(userId);

    expect(result).toContain("No active clarification session to cancel");
  });
});
