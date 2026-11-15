import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramDecisionService } from "@/lib/telegram/decision";
import { TelegramClient } from "@/lib/telegram/client";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { TelegramCallbackQuery } from "@/lib/telegram/types";
import { Plan, Task, Approval } from "@/types/database";

describe("TelegramDecisionService", () => {
  let mockClient: TelegramClient;
  let mockPlanRepo: PlanRepository;
  let mockApprovalRepo: ApprovalRepository;
  let mockTaskRepo: TaskRepository;
  let service: TelegramDecisionService;

  const mockPlan: Plan = {
    id: "11111111-2222-3333-4444-555555555555",
    task_id: "66666666-7777-8888-9999-000000000000",
    version: 1,
    status: "pending_approval",
    risk_assessment: { overallRisk: "medium" },
    required_approvals: [],
    dependencies: [],
    steps: [{ id: "step-1", title: "Build feature" }],
    created_at: new Date().toISOString(),
  };

  const mockTask: Task = {
    id: "66666666-7777-8888-9999-000000000000",
    project_id: "project-1",
    milestone_id: null,
    title: "Implement Authentication",
    description: null,
    priority: "high",
    risk_level: "medium",
    status: "planned",
    estimated_cost_inr: 0,
    actual_cost_inr: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockApproval: Approval = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    user_id: "user-1",
    task_id: mockTask.id,
    action_type: "git_remote_push",
    target_resource: "origin/main",
    scope: { branch: "main" },
    status: "pending",
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    decision_reason: null,
    decided_at: null,
  };

  beforeEach(() => {
    mockClient = {
      answerCallbackQuery: vi.fn().mockResolvedValue(true),
      editMessageText: vi.fn().mockResolvedValue({
        message_id: 42,
        chat: { id: 12345, type: "private" },
        date: Date.now(),
      }),
      sendMessage: vi.fn().mockResolvedValue({
        message_id: 43,
        chat: { id: 12345, type: "private" },
        date: Date.now(),
      }),
    } as unknown as TelegramClient;

    mockPlanRepo = {
      getById: vi.fn().mockResolvedValue({ ...mockPlan }),
      updateStatus: vi.fn().mockResolvedValue({ ...mockPlan, status: "approved" }),
    } as unknown as PlanRepository;

    mockApprovalRepo = {
      getById: vi.fn().mockResolvedValue({ ...mockApproval }),
      recordDecision: vi.fn().mockResolvedValue({ ...mockApproval, status: "approved" }),
    } as unknown as ApprovalRepository;

    mockTaskRepo = {
      getById: vi.fn().mockResolvedValue({ ...mockTask }),
      update: vi.fn().mockResolvedValue({ ...mockTask, status: "running" }),
    } as unknown as TaskRepository;

    service = new TelegramDecisionService({
      client: mockClient,
      planRepo: mockPlanRepo,
      approvalRepo: mockApprovalRepo,
      taskRepo: mockTaskRepo,
    });
  });

  describe("handleCallbackQuery", () => {
    it("instantly acknowledges callback query and approves plan", async () => {
      const query: TelegramCallbackQuery = {
        id: "cb-123",
        from: { id: 999999, is_bot: false, first_name: "Owner" },
        message: {
          message_id: 42,
          chat: { id: 12345, type: "private" },
          date: Date.now(),
        },
        data: `appr:plan:${mockPlan.id}`,
      };

      const result = await service.handleCallbackQuery(query, "user-1");

      expect(result.success).toBe(true);
      expect(mockClient.answerCallbackQuery).toHaveBeenCalledWith(
        "cb-123",
        "Processing decision..."
      );
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(
        mockPlan.id,
        "approved"
      );
      expect(mockTaskRepo.update).toHaveBeenCalledWith(mockPlan.task_id, {
        status: "running",
      });
      expect(mockClient.editMessageText).toHaveBeenCalledWith(
        12345,
        42,
        expect.stringContaining("PLAN APPROVED"),
        expect.objectContaining({
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [] },
        })
      );
    });

    it("handles plan rejection via callback query", async () => {
      const query: TelegramCallbackQuery = {
        id: "cb-456",
        from: { id: 999999, is_bot: false, first_name: "Owner" },
        message: {
          message_id: 42,
          chat: { id: 12345, type: "private" },
          date: Date.now(),
        },
        data: `rejc:plan:${mockPlan.id}`,
      };

      const result = await service.handleCallbackQuery(query, "user-1");

      expect(result.success).toBe(true);
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(
        mockPlan.id,
        "rejected"
      );
      expect(mockClient.editMessageText).toHaveBeenCalledWith(
        12345,
        42,
        expect.stringContaining("PLAN REJECTED"),
        expect.objectContaining({
          reply_markup: { inline_keyboard: [] },
        })
      );
    });

    it("approves sensitive action via callback query", async () => {
      const query: TelegramCallbackQuery = {
        id: "cb-789",
        from: { id: 999999, is_bot: false, first_name: "Owner" },
        message: {
          message_id: 42,
          chat: { id: 12345, type: "private" },
          date: Date.now(),
        },
        data: `appr:act:${mockApproval.id}`,
      };

      const result = await service.handleCallbackQuery(query, "user-1");

      expect(result.success).toBe(true);
      expect(mockApprovalRepo.recordDecision).toHaveBeenCalledWith(
        mockApproval.id,
        "user-1",
        "approved",
        expect.any(String)
      );
      expect(mockClient.editMessageText).toHaveBeenCalledWith(
        12345,
        42,
        expect.stringContaining("ACTION APPROVED"),
        expect.objectContaining({
          reply_markup: { inline_keyboard: [] },
        })
      );
    });

    it("prevents double-decision on already approved plan", async () => {
      vi.mocked(mockPlanRepo.getById).mockResolvedValueOnce({
        ...mockPlan,
        status: "approved",
      });

      const query: TelegramCallbackQuery = {
        id: "cb-dup",
        from: { id: 999999, is_bot: false, first_name: "Owner" },
        message: {
          message_id: 42,
          chat: { id: 12345, type: "private" },
          date: Date.now(),
        },
        data: `appr:plan:${mockPlan.id}`,
      };

      const result = await service.handleCallbackQuery(query, "user-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("already been approved");
      expect(mockPlanRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockClient.editMessageText).toHaveBeenCalledWith(
        12345,
        42,
        expect.stringContaining("ALREADY DECIDED"),
        expect.objectContaining({
          reply_markup: { inline_keyboard: [] },
        })
      );
    });

    it("rejects unrecognized callback data format gracefully", async () => {
      const query: TelegramCallbackQuery = {
        id: "cb-bad",
        from: { id: 999999, is_bot: false, first_name: "Owner" },
        data: "invalid:command:xyz",
      };

      const result = await service.handleCallbackQuery(query, "user-1");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unrecognized callback data format");
    });
  });

  describe("handleCliDecision", () => {
    it("approves sensitive action via CLI command", async () => {
      const reply = await service.handleCliDecision(
        "approve",
        mockApproval.id,
        "user-1"
      );

      expect(reply).toContain("ACTION APPROVED");
      expect(mockApprovalRepo.recordDecision).toHaveBeenCalledWith(
        mockApproval.id,
        "user-1",
        "approved",
        "Decided via Telegram CLI"
      );
    });

    it("approves plan via CLI command", async () => {
      vi.mocked(mockApprovalRepo.getById).mockRejectedValueOnce(
        new Error("Not found")
      );

      const reply = await service.handleCliDecision(
        "approve",
        mockPlan.id,
        "user-1"
      );

      expect(reply).toContain("PLAN APPROVED");
      expect(mockPlanRepo.updateStatus).toHaveBeenCalledWith(
        mockPlan.id,
        "approved"
      );
      expect(mockTaskRepo.update).toHaveBeenCalledWith(mockPlan.task_id, {
        status: "running",
      });
    });

    it("rejects action with custom reason via CLI command", async () => {
      const reply = await service.handleCliDecision(
        "reject",
        mockApproval.id,
        "user-1",
        "Deployment window closed"
      );

      expect(reply).toContain("ACTION REJECTED");
      expect(reply).toContain("Deployment window closed");
      expect(mockApprovalRepo.recordDecision).toHaveBeenCalledWith(
        mockApproval.id,
        "user-1",
        "rejected",
        "Deployment window closed"
      );
    });

    it("returns not found when ID does not match any approval or plan", async () => {
      vi.mocked(mockApprovalRepo.getById).mockRejectedValueOnce(
        new Error("Not found")
      );
      vi.mocked(mockPlanRepo.getById).mockRejectedValueOnce(
        new Error("Not found")
      );

      const reply = await service.handleCliDecision(
        "approve",
        "non-existent-id",
        "user-1"
      );

      expect(reply).toContain("Target Not Found");
    });
  });
});
