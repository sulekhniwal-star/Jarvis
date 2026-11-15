import { describe, it, expect, vi } from "vitest";
import {
  formatPlanApprovalCard,
  formatActionApprovalCard,
  formatDecisionReceipt,
  TelegramApprovalService,
} from "@/lib/telegram/approvals";
import { Plan, Task, Approval } from "@/types/database";
import { TelegramClient } from "@/lib/telegram/client";

describe("Telegram Approval Cards & Formatting", () => {
  const mockPlan: Plan = {
    id: "11111111-2222-3333-4444-555555555555",
    task_id: "66666666-7777-8888-9999-000000000000",
    version: 1,
    status: "pending_approval",
    risk_assessment: { overallRisk: "medium" },
    required_approvals: [],
    dependencies: [],
    steps: [
      { id: "step-1", title: "Create migration", description: "Add table" },
      { id: "step-2", title: "Run tests", description: "Verify schema" },
    ],
    created_at: new Date().toISOString(),
  };

  const mockTask: Task = {
    id: "66666666-7777-8888-9999-000000000000",
    project_id: "project-1",
    milestone_id: null,
    title: "Implement OAuth Login",
    description: "Support GitHub and Google",
    status: "awaiting_approval",
    priority: "high",
    risk_level: "medium",
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
    scope: { branch: "main", commit: "a1b2c3d" },
    status: "pending",
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    decision_reason: null,
    decided_at: null,
  };

  describe("formatPlanApprovalCard", () => {
    it("formats plan details and generates inline buttons within 64 bytes", () => {
      const { text, replyMarkup } = formatPlanApprovalCard({
        plan: mockPlan,
        task: mockTask,
        budgetImpact: { estimatedCostInr: 12.5 },
      });

      expect(text).toContain("APPROVAL REQUIRED: Execution Plan");
      expect(text).toContain("Implement OAuth Login");
      expect(text).toContain(mockPlan.id);
      expect(text).toContain("2 atomic steps");
      expect(text).toContain("MEDIUM");
      expect(text).toContain("₹12\\.50");

      expect(replyMarkup.inline_keyboard).toHaveLength(1);
      const [row] = replyMarkup.inline_keyboard;
      expect(row).toHaveLength(2);

      const [approveBtn, rejectBtn] = row!;
      expect(approveBtn!.text).toBe("✅ Approve Plan");
      expect(approveBtn!.callback_data).toBe(`appr:plan:${mockPlan.id}`);
      expect(Buffer.byteLength(approveBtn!.callback_data!, "utf-8")).toBeLessThanOrEqual(64);

      expect(rejectBtn!.text).toBe("❌ Reject Plan");
      expect(rejectBtn!.callback_data).toBe(`rejc:plan:${mockPlan.id}`);
      expect(Buffer.byteLength(rejectBtn!.callback_data!, "utf-8")).toBeLessThanOrEqual(64);
    });

    it("handles plan without task title gracefully", () => {
      const { text, replyMarkup } = formatPlanApprovalCard({
        plan: mockPlan,
      });

      expect(text).toContain("Task 66666666\\-7777\\-8888\\-9999\\-000000000000");
      expect(replyMarkup.inline_keyboard[0]![0]!.callback_data).toBe(`appr:plan:${mockPlan.id}`);
    });
  });

  describe("formatActionApprovalCard", () => {
    it("formats sensitive action and generates inline buttons within 64 bytes", () => {
      const { text, replyMarkup } = formatActionApprovalCard({
        approval: mockApproval,
        task: mockTask,
      });

      expect(text).toContain("APPROVAL REQUIRED: Sensitive Action");
      expect(text).toContain("GIT REMOTE PUSH");
      expect(text).toContain("origin/main");
      expect(text).toContain("Implement OAuth Login");

      const [row] = replyMarkup.inline_keyboard;
      const [approveBtn, rejectBtn] = row!;

      expect(approveBtn!.text).toBe("✅ Approve");
      expect(approveBtn!.callback_data).toBe(`appr:act:${mockApproval.id}`);
      expect(Buffer.byteLength(approveBtn!.callback_data!, "utf-8")).toBeLessThanOrEqual(64);

      expect(rejectBtn!.text).toBe("❌ Reject");
      expect(rejectBtn!.callback_data).toBe(`rejc:act:${mockApproval.id}`);
      expect(Buffer.byteLength(rejectBtn!.callback_data!, "utf-8")).toBeLessThanOrEqual(64);
    });
  });

  describe("formatDecisionReceipt", () => {
    it("formats approved plan decision receipt", () => {
      const now = new Date("2026-11-15T12:00:00Z");
      const receipt = formatDecisionReceipt(
        "plan",
        "Implement OAuth Login",
        "approved",
        now,
        "Ready to run"
      );

      expect(receipt).toContain("PLAN APPROVED");
      expect(receipt).toContain("Implement OAuth Login");
      expect(receipt).toContain("Ready to run");
      expect(receipt).toContain("Task transitioned to running for autonomous execution");
    });

    it("formats rejected action decision receipt", () => {
      const now = new Date("2026-11-15T12:00:00Z");
      const receipt = formatDecisionReceipt(
        "action",
        "git_remote_push",
        "rejected",
        now,
        "Risk too high"
      );

      expect(receipt).toContain("ACTION REJECTED");
      expect(receipt).toContain("git\\_remote\\_push");
      expect(receipt).toContain("Risk too high");
      expect(receipt).not.toContain("Task transitioned to running");
    });
  });

  describe("TelegramApprovalService", () => {
    it("dispatches plan card via client.sendMessage with inline markup", async () => {
      const mockClient = {
        sendMessage: vi.fn().mockResolvedValue({
          message_id: 101,
          date: Date.now(),
          chat: { id: 12345, type: "private" },
        }),
      } as unknown as TelegramClient;

      const service = new TelegramApprovalService(mockClient);
      await service.sendPlanCard(12345, { plan: mockPlan, task: mockTask });

      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining("APPROVAL REQUIRED: Execution Plan"),
        expect.objectContaining({
          parse_mode: "MarkdownV2",
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        })
      );
    });

    it("dispatches action card via client.sendMessage with inline markup", async () => {
      const mockClient = {
        sendMessage: vi.fn().mockResolvedValue({
          message_id: 102,
          date: Date.now(),
          chat: { id: 12345, type: "private" },
        }),
      } as unknown as TelegramClient;

      const service = new TelegramApprovalService(mockClient);
      await service.sendActionCard(12345, { approval: mockApproval, task: mockTask });

      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining("APPROVAL REQUIRED: Sensitive Action"),
        expect.objectContaining({
          parse_mode: "MarkdownV2",
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        })
      );
    });
  });
});
