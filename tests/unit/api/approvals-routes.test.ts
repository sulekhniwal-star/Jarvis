import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listApprovals, POST as createApproval } from "@/app/api/approvals/route";
import { GET as getApproval } from "@/app/api/approvals/[id]/route";
import { POST as recordDecision } from "@/app/api/approvals/[id]/decision/route";
import { generateApprovalToken } from "@/lib/approvals/approval-token";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("Approvals API Routes (REQ-APP-01, REQ-APP-02)", () => {
  const mockUser = { id: "usr-test-123", email: "owner@javis.ai" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/approvals", () => {
    it("returns 401 if user is unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/approvals");
      const res = await listApprovals(req);
      expect(res.status).toBe(401);
    });

    it("returns approvals with generated tokens and metrics", async () => {
      const mockApprovals = [
        {
          id: "app-1",
          user_id: "usr-test-123",
          action_type: "git_remote_push",
          target_resource: "origin/main",
          status: "pending",
          expires_at: new Date(Date.now() + 60000).toISOString(),
          requested_at: new Date().toISOString(),
        },
      ];

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === "approvals") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: mockApprovals, count: 1, error: null }),
                  }),
                  eq: vi.fn().mockResolvedValue({ data: mockApprovals, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/approvals");
      const res = await listApprovals(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.approvals).toBeDefined();
      expect(json.approvals[0].token).toBeDefined();
      expect(json.approvals[0].token.startsWith("app-1.")).toBe(true);
    });
  });

  describe("POST /api/approvals", () => {
    it("validates request schema and creates approval with token", async () => {
      const createdItem = {
        id: "app-new",
        user_id: "usr-test-123",
        action_type: "paid_ai_inference",
        target_resource: "anthropic/claude-3-opus",
        status: "pending",
        scope: { estimatedTokens: 4000 },
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdItem, error: null }),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/approvals", {
        method: "POST",
        body: JSON.stringify({
          actionType: "paid_ai_inference",
          targetResource: "anthropic/claude-3-opus",
          scope: { estimatedTokens: 4000 },
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      });

      const res = await createApproval(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.approval.id).toBe("app-new");
      expect(json.token.startsWith("app-new.")).toBe(true);
    });
  });

  describe("POST /api/approvals/[id]/decision", () => {
    it("rejects expired approval request with 400", async () => {
      const expiredApproval = {
        id: "app-exp",
        user_id: "usr-test-123",
        action_type: "git_remote_push",
        target_resource: "origin/main",
        status: "pending",
        expires_at: new Date(Date.now() - 5000).toISOString(),
      };

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: expiredApproval, error: null }),
              }),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/approvals/app-exp/decision", {
        method: "POST",
        body: JSON.stringify({ decision: "approved" }),
      });

      const res = await recordDecision(req, { params: Promise.resolve({ id: "app-exp" }) });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("EXPIRED_APPROVAL");
    });

    it("rejects invalid cryptographic approval token with 403", async () => {
      const activeApproval = {
        id: "app-sec",
        user_id: "usr-test-123",
        action_type: "production_deploy",
        target_resource: "production-cluster",
        status: "pending",
        expires_at: new Date(Date.now() + 60000).toISOString(),
      };

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: activeApproval, error: null }),
              }),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/approvals/app-sec/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "approved",
          token: "app-sec.tampered_signature_1234567890abcdef",
        }),
      });

      const res = await recordDecision(req, { params: Promise.resolve({ id: "app-sec" }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe("INVALID_APPROVAL_TOKEN");
    });

    it("records valid decision when token signature is valid", async () => {
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      const activeApproval = {
        id: "app-valid",
        user_id: "usr-test-123",
        action_type: "git_remote_push",
        target_resource: "origin/main",
        status: "pending",
        expires_at: expiresAt,
      };

      const validToken = generateApprovalToken({
        id: "app-valid",
        actionType: "git_remote_push",
        targetResource: "origin/main",
        userId: "usr-test-123",
        expiresAt,
      });

      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { ...activeApproval, status: "approved", decided_at: new Date().toISOString() },
        error: null,
      });

      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: activeApproval, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({ single: mockUpdateSingle }),
              }),
            }),
          }),
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/approvals/app-valid/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "approved",
          token: validToken,
          reason: "Verified pre-push test results",
        }),
      });

      const res = await recordDecision(req, { params: Promise.resolve({ id: "app-valid" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.approval.status).toBe("approved");
    });
  });
});
