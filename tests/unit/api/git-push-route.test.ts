import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/git/push/route";

vi.mock("@/lib/auth/require-auth", () => ({
  requireApiAuth: vi.fn().mockResolvedValue({
    user: { id: "user-session-123" },
    supabase: {},
    errorResponse: null,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-session-123" } } },
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

const mockRequestPushApproval = vi.fn();
const mockExecutePush = vi.fn();

vi.mock("@/lib/git/push-gate", () => ({
  PushGateService: vi.fn().mockImplementation(() => ({
    requestPushApproval: mockRequestPushApproval,
    executePush: mockExecutePush,
  })),
}));

describe("POST /api/git/push (REQ-GH-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/git/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 on invalid input payload", async () => {
    const req = createRequest({ action: "invalid_action" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VALIDATION_FAILED");
  });

  it("handles request action and calls requestPushApproval", async () => {
    mockRequestPushApproval.mockResolvedValueOnce({
      success: true,
      approval: { id: "appr-1", status: "pending" },
      validation: { isReady: true, aheadCount: 3 },
    });

    const req = createRequest({
      action: "request",
      testProof: "267/267 tests green",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockRequestPushApproval).toHaveBeenCalledWith(
      "user-session-123",
      expect.objectContaining({ testProof: "267/267 tests green" })
    );
  });

  it("returns 400 on execute action when approvalId is missing", async () => {
    const req = createRequest({
      action: "execute",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("approvalId is required");
  });

  it("handles execute action and calls executePush", async () => {
    mockExecutePush.mockResolvedValueOnce({
      success: true,
      pushedCommit: "abc1234",
      remoteRef: "origin/main",
      aheadCount: 2,
      output: "Everything up-to-date",
      executedAt: new Date().toISOString(),
    });

    const req = createRequest({
      action: "execute",
      approvalId: "appr-999",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pushedCommit).toBe("abc1234");
    expect(mockExecutePush).toHaveBeenCalledWith("appr-999", "user-session-123");
  });

  it("returns 400 with error details when PushGateService throws", async () => {
    mockExecutePush.mockRejectedValueOnce(
      new Error("Push rejected: working tree has uncommitted changes.")
    );

    const req = createRequest({
      action: "execute",
      approvalId: "appr-999",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("PUSH_GATE_ERROR");
    expect(data.message).toContain("uncommitted changes");
  });
});
