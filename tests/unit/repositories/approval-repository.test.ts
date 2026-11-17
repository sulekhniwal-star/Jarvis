import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApprovalRepository } from "@/lib/repositories/approval-repository";

describe("ApprovalRepository", () => {
  let mockSupabase: any;
  let repo: ApprovalRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an approval request with required fields and pending status", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: "app-1",
        user_id: "user-1",
        action_type: "git_remote_push",
        target_resource: "origin/main",
        status: "pending",
        scope: { aheadCount: 1 },
        requested_at: "2026-11-17T00:00:00Z",
        expires_at: "2026-11-17T01:00:00Z",
      },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    mockSupabase = { from: mockFrom };
    repo = new ApprovalRepository(mockSupabase);

    const result = await repo.createApproval("user-1", {
      actionType: "git_remote_push",
      targetResource: "origin/main",
      scope: { aheadCount: 1 },
      expiresAt: "2026-11-17T01:00:00Z",
    });

    expect(result.id).toBe("app-1");
    expect(result.status).toBe("pending");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        action_type: "git_remote_push",
        target_resource: "origin/main",
      })
    );
  });

  it("records decision and updates decided_at timestamp", async () => {
    // 1. mock getById
    const existing = {
      id: "app-1",
      user_id: "user-1",
      status: "pending",
      expires_at: new Date(Date.now() + 60000).toISOString(),
    };

    const mockGetSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
    const mockUpdateSingle = vi.fn().mockResolvedValue({
      data: { ...existing, status: "approved", decided_at: "2026-11-17T00:05:00Z" },
      error: null,
    });

    const mockEqUser = vi.fn().mockReturnValue({ single: mockGetSingle });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });

    const mockUpdateEqUser = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockUpdateSingle }),
    });
    const mockUpdateEqId = vi.fn().mockReturnValue({ eq: mockUpdateEqUser });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEqId });

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEqId }),
        update: mockUpdate,
      }),
    };

    repo = new ApprovalRepository(mockSupabase);

    const result = await repo.recordDecision("app-1", "user-1", "approved", "LGTM");
    expect(result.status).toBe("approved");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        decision_reason: "LGTM",
      })
    );
  });

  it("lists approvals with status, action type, and search filters", async () => {
    const mockItems = [
      {
        id: "app-1",
        action_type: "git_remote_push",
        status: "pending",
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    ];

    const mockRange = vi.fn().mockResolvedValue({ data: mockItems, count: 1, error: null });
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockEqAction = vi.fn().mockReturnValue({ order: mockOrder });
    const mockGtExpires = vi.fn().mockReturnValue({ eq: mockEqAction, order: mockOrder });
    const mockEqStatus = vi.fn().mockReturnValue({ gt: mockGtExpires, order: mockOrder });
    const mockEqUser = vi.fn().mockReturnValue({
      eq: mockEqStatus,
      order: mockOrder,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

    mockSupabase = {
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    };

    repo = new ApprovalRepository(mockSupabase);

    const result = await repo.listApprovals("user-1", {
      status: "pending",
      limit: 10,
    });

    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("computes approval metrics accurately across states", async () => {
    const now = Date.now();
    const mockApprovals = [
      { status: "approved", expires_at: new Date(now + 10000).toISOString() },
      { status: "rejected", expires_at: new Date(now + 10000).toISOString() },
      { status: "pending", expires_at: new Date(now + 50000).toISOString() },
      { status: "pending", expires_at: new Date(now - 10000).toISOString() }, // expired
      { status: "expired", expires_at: new Date(now - 20000).toISOString() },
    ];

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockApprovals, error: null }),
        }),
      }),
    };

    repo = new ApprovalRepository(mockSupabase);

    const metrics = await repo.getApprovalMetrics("user-1");

    expect(metrics.total).toBe(5);
    expect(metrics.approved).toBe(1);
    expect(metrics.rejected).toBe(1);
    expect(metrics.pending).toBe(1);
    expect(metrics.expired).toBe(2); // 1 explicitly expired + 1 timed-out pending
  });
});
