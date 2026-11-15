import { describe, it, expect, vi } from "vitest";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";
import { AgentRunRepository } from "@/lib/repositories/agent-run-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("ApprovalRepository & AgentRunRepository Integration", () => {
  describe("ApprovalRepository", () => {
    it("creates an approval request in pending status", async () => {
      const fakeApproval = {
        id: "app-1",
        user_id: "user-1",
        task_id: null,
        action_type: "git_remote_push",
        target_resource: "origin/main",
        scope: { commit: "abc1234" },
        status: "pending",
        decision_reason: null,
        requested_at: new Date().toISOString(),
        decided_at: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: fakeApproval, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
      const repo = new ApprovalRepository(mockClient);

      const result = await repo.createApproval("user-1", {
        actionType: "git_remote_push",
        targetResource: "origin/main",
        scope: { commit: "abc1234" },
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(mockFrom).toHaveBeenCalledWith("approvals");
      expect(result).toEqual(fakeApproval);
    });

    it("records atomic approval decision", async () => {
      const pendingApproval = {
        id: "app-1",
        user_id: "user-1",
        status: "pending",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      const approvedRecord = {
        ...pendingApproval,
        status: "approved",
        decided_at: new Date().toISOString(),
        decision_reason: "Verified safe",
      };

      const mockSingleGet = vi.fn().mockResolvedValue({ data: pendingApproval, error: null });
      const mockEq2Get = vi.fn().mockReturnValue({ single: mockSingleGet });
      const mockEq1Get = vi.fn().mockReturnValue({ eq: mockEq2Get });
      const mockSelectGet = vi.fn().mockReturnValue({ eq: mockEq1Get });

      const mockSingleUpdate = vi.fn().mockResolvedValue({ data: approvedRecord, error: null });
      const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
      const mockEq2Update = vi.fn().mockReturnValue({ select: mockSelectUpdate });
      const mockEq1Update = vi.fn().mockReturnValue({ eq: mockEq2Update });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1Update });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        return {
          select: mockSelectGet,
          update: mockUpdate,
        };
      });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
      const repo = new ApprovalRepository(mockClient);

      const result = await repo.recordDecision("app-1", "user-1", "approved", "Verified safe");
      expect(result.status).toBe("approved");
    });
  });

  describe("AgentRunRepository", () => {
    it("creates queued agent run", async () => {
      const fakeRun = {
        id: "run-99",
        task_id: "task-1",
        agent_engine: "aider",
        status: "queued",
        retry_count: 0,
        created_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: fakeRun, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
      const repo = new AgentRunRepository(mockClient);

      const result = await repo.createRun("task-1");
      expect(result).toEqual(fakeRun);
    });
  });
});
