import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listDeployments, POST as createPreview } from "@/app/api/deployments/route";
import { POST as requestPromotion } from "@/app/api/deployments/production/request/route";
import { POST as promoteDeployment } from "@/app/api/deployments/production/promote/route";
import { POST as rollbackDeployment } from "@/app/api/deployments/[id]/rollback/route";
import { DeploymentRepository } from "@/lib/repositories/deployment-repository";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

import { createClient } from "@/lib/supabase/server";

describe("Deployment API Routes (REQ-DEP-01, REQ-DEP-02)", () => {
  const mockUser = { id: "usr-owner-001", email: "owner@javis.ai" };

  function buildMockSupabase(overrides?: {
    approvalsSingle?: any;
  }) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === "deployments") {
          return null;
        }

        if (table === "approvals" && overrides?.approvalsSingle) {
          const singleFn = vi.fn().mockResolvedValue(overrides.approvalsSingle);
          const builder: any = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: singleFn }) }),
            eq: vi.fn().mockReturnThis(),
            single: singleFn,
          };
          return builder;
        }

        const builder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "mock-id", details: {} }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return builder;
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    DeploymentRepository.clearInMemoryStore();
  });

  describe("GET /api/deployments", () => {
    it("returns 401 if unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/deployments");
      const res = await listDeployments(req);
      expect(res.status).toBe(401);
    });

    it("returns deployments list, active production, and latest preview", async () => {
      (createClient as any).mockResolvedValue(buildMockSupabase());

      const repo = new DeploymentRepository();
      await repo.createDeployment({
        environment: "production",
        commit_sha: "prod11111111111111111111111111111111111",
        commit_message: "Production build",
        branch: "main",
        status: "deployed",
        production_url: "https://jarvis.app",
        deployed_at: new Date().toISOString(),
      });
      await repo.createDeployment({
        environment: "preview",
        commit_sha: "prev22222222222222222222222222222222222",
        commit_message: "Preview build",
        branch: "main",
        status: "deployed",
        preview_url: "https://jarvis-preview-prev222.vercel.app",
        deployed_at: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/deployments");
      const res = await listDeployments(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.deployments.length).toBe(2);
      expect(json.activeProduction.commit_sha).toBe("prod11111111111111111111111111111111111");
      expect(json.latestPreview.commit_sha).toBe("prev22222222222222222222222222222222222");
    });
  });

  describe("POST /api/deployments", () => {
    it("returns 401 if unauthenticated", async () => {
      (createClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") }),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/deployments", {
        method: "POST",
        body: JSON.stringify({ commitSha: "abc1234" }),
      });
      const res = await createPreview(req);
      expect(res.status).toBe(401);
    });

    it("creates preview deployment successfully", async () => {
      (createClient as any).mockResolvedValue(buildMockSupabase());

      const req = new NextRequest("http://localhost:3000/api/deployments", {
        method: "POST",
        body: JSON.stringify({
          commitSha: "abc1234567890abcdef1234567890abcdef12345",
          commitMessage: "test preview commit",
        }),
      });

      const res = await createPreview(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deployment.environment).toBe("preview");
      expect(json.deployment.status).toBe("deployed");
      expect(json.deployment.preview_url).toBe("https://jarvis-preview-abc1234.vercel.app");
    });
  });

  describe("POST /api/deployments/production/request", () => {
    it("returns 400 when commitSha is invalid or missing", async () => {
      (createClient as any).mockResolvedValue(buildMockSupabase());

      const req = new NextRequest("http://localhost:3000/api/deployments/production/request", {
        method: "POST",
        body: JSON.stringify({ commitSha: "" }),
      });

      const res = await requestPromotion(req);
      expect(res.status).toBe(400);
    });

    it("creates pending production deployment and approval record", async () => {
      (createClient as any).mockResolvedValue(
        buildMockSupabase({
          approvalsSingle: {
            data: {
              id: "appr-prod-100",
              user_id: mockUser.id,
              action_type: "production_deploy",
              target_resource: "production:jarvis.app",
              status: "pending",
              expires_at: new Date(Date.now() + 100000).toISOString(),
            },
            error: null,
          },
        })
      );

      const req = new NextRequest("http://localhost:3000/api/deployments/production/request", {
        method: "POST",
        body: JSON.stringify({
          commitSha: "feat1234567890abcdef1234567890abcdef1234",
          commitMessage: "Feature release ready for prod",
          verificationSummary: "107 suites passed",
        }),
      });

      const res = await requestPromotion(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deployment.environment).toBe("production");
      expect(json.deployment.status).toBe("pending_approval");
      expect(json.approval.id).toBe("appr-prod-100");
    });
  });

  describe("POST /api/deployments/production/promote", () => {
    it("returns 403 when promotion approval is unapproved", async () => {
      (createClient as any).mockResolvedValue(
        buildMockSupabase({
          approvalsSingle: {
            data: {
              id: "appr-pending",
              status: "pending",
              expires_at: new Date(Date.now() + 10000).toISOString(),
            },
            error: null,
          },
        })
      );

      const repo = new DeploymentRepository();
      const dep = await repo.createDeployment({
        environment: "production",
        commit_sha: "prod-commit-1",
        commit_message: "Ready",
        branch: "main",
        status: "pending_approval",
      });

      const req = new NextRequest("http://localhost:3000/api/deployments/production/promote", {
        method: "POST",
        body: JSON.stringify({
          deploymentId: dep.id,
          approvalId: "appr-pending",
        }),
      });

      const res = await promoteDeployment(req);
      expect(res.status).toBe(403);
    });

    it("promotes to production when approval is approved", async () => {
      (createClient as any).mockResolvedValue(
        buildMockSupabase({
          approvalsSingle: {
            data: {
              id: "appr-approved",
              status: "approved",
              expires_at: new Date(Date.now() + 10000).toISOString(),
            },
            error: null,
          },
        })
      );

      const repo = new DeploymentRepository();
      const dep = await repo.createDeployment({
        environment: "production",
        commit_sha: "prod-commit-1",
        commit_message: "Ready",
        branch: "main",
        status: "pending_approval",
      });

      const req = new NextRequest("http://localhost:3000/api/deployments/production/promote", {
        method: "POST",
        body: JSON.stringify({
          deploymentId: dep.id,
          approvalId: "appr-approved",
        }),
      });

      const res = await promoteDeployment(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deployment.status).toBe("deployed");
      expect(json.deployment.production_url).toBe("https://jarvis.app");
    });
  });

  describe("POST /api/deployments/[id]/rollback", () => {
    it("returns 404 when target deployment does not exist", async () => {
      (createClient as any).mockResolvedValue(buildMockSupabase());

      const req = new NextRequest("http://localhost:3000/api/deployments/non-existent/rollback", {
        method: "POST",
      });

      const res = await rollbackDeployment(req, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      expect(res.status).toBe(404);
    });

    it("successfully rolls back to valid production deployment", async () => {
      (createClient as any).mockResolvedValue(buildMockSupabase());

      const repo = new DeploymentRepository();
      const target = await repo.createDeployment({
        environment: "production",
        commit_sha: "sha-target-11111111111111111111111111111",
        commit_message: "Stable version",
        branch: "main",
        status: "deployed",
        production_url: "https://jarvis.app",
        deployed_at: "2026-11-15T00:00:00Z",
      });

      const current = await repo.createDeployment({
        environment: "production",
        commit_sha: "sha-current-2222222222222222222222222222",
        commit_message: "Problematic version",
        branch: "main",
        status: "deployed",
        production_url: "https://jarvis.app",
        deployed_at: "2026-11-16T00:00:00Z",
      });

      const req = new NextRequest(`http://localhost:3000/api/deployments/${target.id}/rollback`, {
        method: "POST",
      });

      const res = await rollbackDeployment(req, {
        params: Promise.resolve({ id: target.id }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.rollback.targetCommitSha).toBe(target.commit_sha);
      expect(json.rollback.rolledBackFromId).toBe(current.id);
      expect(json.rollback.rolledBackToId).toBe(target.id);
    });
  });
});
