import { describe, it, expect, vi, beforeEach } from "vitest";
import { PushGateService } from "@/lib/git/push-gate";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { TelegramApprovalService } from "@/lib/telegram/approvals";
import { Approval } from "@/types/database";

describe("PushGateService (REQ-GH-03, NFR-SEC-01)", () => {
  let mockApprovalRepo: Partial<ApprovalRepository>;
  let mockTelegramService: Partial<TelegramApprovalService>;
  let mockGitExec: ReturnType<typeof vi.fn>;
  let mockSupabase: any;

  const mockApprovedPush: Approval = {
    id: "appr-123",
    user_id: "user-456",
    task_id: null,
    action_type: "git_remote_push",
    target_resource: "origin/main",
    scope: {
      headCommitSha: "abc123456789",
      aheadCount: 2,
    },
    status: "approved",
    decision_reason: "Approved by owner",
    requested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApprovalRepo = {
      createApproval: vi.fn().mockResolvedValue({
        ...mockApprovedPush,
        status: "pending",
      }),
      getById: vi.fn().mockResolvedValue(mockApprovedPush),
    };

    mockTelegramService = {
      sendActionCard: vi.fn().mockResolvedValue({ message_id: 999 } as any),
    };

    mockGitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("log -1 --format=%H%x09%s"))
        return "abc1234567890\tfeat: implement remote push gate\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "2\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      if (argStr.includes("log origin/main..HEAD --format"))
        return "abc1234567890\tabc1234\tfeat: implement remote push gate\tDev\t2026-11-15T23:00:00Z\n";
      if (argStr.includes("diff --name-only origin/main..HEAD")) return "file.ts\n";
      if (argStr.includes("diff origin/main..HEAD")) return "+clean diff\n";
      if (argStr.includes("push origin main")) return "To github.com:repo.git\n   main -> main\n";
      return "";
    });

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  });

  describe("requestPushApproval", () => {
    it("successfully creates approval and dispatches Telegram card when repository is ready", async () => {
      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        telegramApprovalService: mockTelegramService as TelegramApprovalService,
        gitExec: mockGitExec,
      });

      const result = await service.requestPushApproval("user-456", {
        testProof: "44/44 test files passed",
        telegramChatId: 123456,
      });

      expect(result.success).toBe(true);
      expect(mockApprovalRepo.createApproval).toHaveBeenCalledWith(
        "user-456",
        expect.objectContaining({
          actionType: "git_remote_push",
          targetResource: "origin/main",
          scope: expect.objectContaining({
            testProof: "44/44 test files passed",
            aheadCount: 2,
          }),
        })
      );
      expect(mockTelegramService.sendActionCard).toHaveBeenCalledWith(
        123456,
        expect.objectContaining({
          approval: expect.objectContaining({ action_type: "git_remote_push" }),
        })
      );
    });

    it("rejects approval request if repository has uncommitted changes", async () => {
      mockGitExec.mockImplementation((args: string[]) => {
        const argStr = args.join(" ");
        if (argStr.includes("branch --show-current")) return "main\n";
        if (argStr.includes("status --porcelain")) return " M dirty.ts\n";
        return "";
      });

      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        gitExec: mockGitExec,
      });

      await expect(service.requestPushApproval("user-456")).rejects.toThrow(
        /Pre-push validation failed/
      );
      expect(mockApprovalRepo.createApproval).not.toHaveBeenCalled();
    });
  });

  describe("executePush", () => {
    it("executes git push origin main when approval is valid and approved", async () => {
      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        supabaseClient: mockSupabase,
        gitExec: mockGitExec,
      });

      const result = await service.executePush("appr-123", "user-456");

      expect(result.success).toBe(true);
      expect(result.remoteRef).toBe("origin/main");
      expect(mockGitExec).toHaveBeenCalledWith(["push", "origin", "main"]);
      expect(mockSupabase.from).toHaveBeenCalledWith("audit_events");
    });

    it("throws error if approval status is pending or rejected", async () => {
      mockApprovalRepo.getById = vi.fn().mockResolvedValue({
        ...mockApprovedPush,
        status: "pending",
      });

      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        gitExec: mockGitExec,
      });

      await expect(service.executePush("appr-123", "user-456")).rejects.toThrow(
        /Push rejected: approval status is 'pending'/
      );
      expect(mockGitExec).not.toHaveBeenCalledWith(["push", "origin", "main"]);
    });

    it("throws error if approval has expired", async () => {
      mockApprovalRepo.getById = vi.fn().mockResolvedValue({
        ...mockApprovedPush,
        expires_at: new Date(Date.now() - 60000).toISOString(),
      });

      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        gitExec: mockGitExec,
      });

      await expect(service.executePush("appr-123", "user-456")).rejects.toThrow(
        /Push rejected: approval expired/
      );
      expect(mockGitExec).not.toHaveBeenCalledWith(["push", "origin", "main"]);
    });

    it("throws error if branch changed away from main between approval and execution", async () => {
      mockGitExec.mockImplementation((args: string[]) => {
        const argStr = args.join(" ");
        if (argStr.includes("branch --show-current")) return "dev\n";
        return "";
      });

      const service = new PushGateService({
        approvalRepo: mockApprovalRepo as ApprovalRepository,
        gitExec: mockGitExec,
      });

      await expect(service.executePush("appr-123", "user-456")).rejects.toThrow(
        /Only 'main' is permitted/
      );
      expect(mockGitExec).not.toHaveBeenCalledWith(["push", "origin", "main"]);
    });
  });
});
