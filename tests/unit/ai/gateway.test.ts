import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AIGateway,
  PaidInferenceApprovalRequiredError,
  AllFreeModelsExhaustedError,
} from "@/lib/ai/gateway";
import { MockAIAdapter } from "@/lib/ai/adapters/mock";
import { OpenRouterError } from "@/lib/ai/adapters/openrouter";

describe("AIGateway Router & Safety Controls", () => {
  let mockAdapter: MockAIAdapter;
  let mockApprovalRepo: any;
  let mockLedgerService: any;
  let mockBudgetService: any;

  beforeEach(() => {
    mockAdapter = new MockAIAdapter({
      defaultResponse: "Hello from Jarvis test gateway",
    });

    mockApprovalRepo = {
      listPending: vi.fn().mockResolvedValue([]),
      hasActiveApproval: vi.fn().mockResolvedValue(false),
    };

    mockLedgerService = {
      recordUsage: vi.fn().mockResolvedValue({ id: "rec-1" }),
    };

    mockBudgetService = {
      checkBudgetLimits: vi.fn().mockResolvedValue({ allowed: true }),
    };
  });

  describe("Free Model Routing & Failover Hierarchy", () => {
    it("dispatches to primary free model and records 0 cost in ledger", async () => {
      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
        ledgerService: mockLedgerService,
        budgetService: mockBudgetService,
      });

      const response = await gateway.complete({
        userId: "user-123",
        messages: [{ role: "user", content: "Test prompt" }],
      });

      expect(response.content).toBe("Hello from Jarvis test gateway");
      expect(mockAdapter.requestHistory).toHaveLength(1);
      expect(mockAdapter.requestHistory[0]!.model).toBe(
        "meta-llama/llama-3.3-70b-instruct:free"
      );

      expect(mockLedgerService.recordUsage).toHaveBeenCalledTimes(1);
      expect(mockLedgerService.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          costInr: 0,
        })
      );
    });

    it("falls back to alternate free model when primary returns 429 rate limit", async () => {
      let callCount = 0;
      mockAdapter.complete = vi.fn().mockImplementation((req) => {
        callCount++;
        if (req.model === "meta-llama/llama-3.3-70b-instruct:free") {
          throw new OpenRouterError("Rate limit exceeded", 429);
        }
        return Promise.resolve({
          id: "gen-fallback",
          content: "Recovered via Gemini free model",
          model: req.model,
          provider: "mock",
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          costInr: 0,
          latencyMs: 10,
        });
      });

      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
        ledgerService: mockLedgerService,
      });

      const response = await gateway.complete({
        messages: [{ role: "user", content: "Test failover" }],
      });

      expect(callCount).toBe(2);
      expect(response.content).toBe("Recovered via Gemini free model");
      expect(response.model).toBe("google/gemini-2.0-flash-exp:free");
    });

    it("halts with AllFreeModelsExhaustedError and never calls paid models when all free models fail", async () => {
      mockAdapter.complete = vi.fn().mockImplementation((req) => {
        throw new OpenRouterError(`Model ${req.model} down`, 503);
      });

      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
        ledgerService: mockLedgerService,
      });

      await expect(
        gateway.complete({
          messages: [{ role: "user", content: "Test total outage" }],
        })
      ).rejects.toThrow(AllFreeModelsExhaustedError);

      // Verify no paid models were ever attempted
      const attemptedModels = (mockAdapter.complete as any).mock.calls.map(
        (c: any[]) => c[0].model
      );
      for (const model of attemptedModels) {
        expect(model).toContain(":free");
      }
    });
  });

  describe("Paid Model Approval Gate & Safety Controls", () => {
    it("strictly blocks paid model inference when no approval exists", async () => {
      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
        ledgerService: mockLedgerService,
        budgetService: mockBudgetService,
      });

      await expect(
        gateway.complete({
          userId: "user-123",
          model: "anthropic/claude-3.5-sonnet",
          messages: [{ role: "user", content: "Write complex architecture" }],
        })
      ).rejects.toThrow(PaidInferenceApprovalRequiredError);

      // Verify adapter was NEVER called
      expect(mockAdapter.requestHistory).toHaveLength(0);
    });

    it("permits paid model inference when active, unexpired approval exists", async () => {
      mockApprovalRepo.hasActiveApproval = vi.fn().mockResolvedValue(true);

      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
        ledgerService: mockLedgerService,
        budgetService: mockBudgetService,
      });

      const response = await gateway.complete({
        userId: "user-123",
        model: "anthropic/claude-3.5-sonnet",
        messages: [{ role: "user", content: "Approved paid task" }],
      });

      expect(response.content).toBe("Hello from Jarvis test gateway");
      expect(mockAdapter.requestHistory).toHaveLength(1);
      expect(mockAdapter.requestHistory[0]!.model).toBe(
        "anthropic/claude-3.5-sonnet"
      );
      expect(mockBudgetService.checkBudgetLimits).toHaveBeenCalledTimes(1);
      expect(mockLedgerService.recordUsage).toHaveBeenCalledTimes(1);
    });

    it("enforces approval gate for streaming paid requests", async () => {
      const gateway = new AIGateway({
        adapter: mockAdapter,
        approvalRepo: mockApprovalRepo,
      });

      const streamGen = gateway.stream({
        userId: "user-123",
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Stream paid" }],
      });

      await expect(streamGen.next()).rejects.toThrow(
        PaidInferenceApprovalRequiredError
      );
    });
  });
});
