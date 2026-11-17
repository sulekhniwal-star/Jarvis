import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeploymentManager } from "@/lib/deployment/deployment-manager";
import { DeploymentRepository } from "@/lib/repositories/deployment-repository";
import {
  UnapprovedProductionDeploymentError,
  DeploymentNotFoundError,
  InvalidRollbackTargetError,
} from "@/lib/deployment/types";

describe("DeploymentManager", () => {
  let mockSupabase: any;
  let mockApprovalRepo: any;
  let mockAuditLedger: any;
  let mockTelegramService: any;
  let deploymentRepo: DeploymentRepository;
  let manager: DeploymentManager;

  const mockUser = "usr-owner-001";
  const testCommitSha = "e1b9477abcdef1234567890abcdef1234567890";
  const testCommitMsg = "feat: initial commit";

  beforeEach(() => {
    vi.clearAllMocks();
    DeploymentRepository.clearInMemoryStore();

    mockApprovalRepo = {
      createApproval: vi.fn().mockImplementation((userId, data) => {
        return Promise.resolve({
          id: "appr-deploy-1",
          user_id: userId,
          action_type: data.actionType,
          target_resource: data.targetResource,
          status: "pending",
          scope: data.scope,
          expires_at: data.expiresAt.toISOString
            ? data.expiresAt.toISOString()
            : data.expiresAt,
          requested_at: new Date().toISOString(),
        });
      }),
      getApproval: vi.fn(),
    };

    mockAuditLedger = {
      recordEvent: vi.fn().mockResolvedValue({
        id: "evt-deploy-1",
        sequence: 1,
        prev_hash: "0".repeat(64),
        hash: "hash-deploy-1",
      }),
    };

    mockTelegramService = {
      sendActionCard: vi.fn().mockResolvedValue({ message_id: 12345 }),
    };

    deploymentRepo = new DeploymentRepository();

    manager = new DeploymentManager({
      deploymentRepo,
      approvalRepo: mockApprovalRepo,
      auditLedger: mockAuditLedger,
      telegramApprovalService: mockTelegramService,
      gitExec: vi.fn((args) => {
        if (args.includes("--abbrev-ref")) {
          return "main";
        }
        if (args.includes("rev-parse") && args.includes("HEAD")) {
          return testCommitSha;
        }
        if (args.includes("--pretty=%B")) {
          return testCommitMsg;
        }
        return "";
      }),
    });
  });

  describe("createPreviewDeployment", () => {
    it("creates an active preview deployment without approval gate", async () => {
      const deployment = await manager.createPreviewDeployment({
        commitSha: testCommitSha,
        commitMessage: testCommitMsg,
        userId: mockUser,
      });

      expect(deployment.environment).toBe("preview");
      expect(deployment.status).toBe("deployed");
      expect(deployment.commit_sha).toBe(testCommitSha);
      expect(deployment.preview_url).toBe(
        `https://jarvis-preview-${testCommitSha.substring(0, 7)}.vercel.app`
      );
      expect(deployment.approval_id).toBeNull();
      expect(deployment.deployed_at).toBeDefined();

      expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "deployment.preview_created",
          resourceType: "deployment",
          resourceId: deployment.id,
        })
      );
    });

    it("uses git exec fallback when parameters are omitted", async () => {
      const deployment = await manager.createPreviewDeployment();

      expect(deployment.commit_sha).toBe(testCommitSha);
      expect(deployment.commit_message).toBe(testCommitMsg);
      expect(deployment.branch).toBe("main");
      expect(deployment.preview_url).toContain(testCommitSha.substring(0, 7));
    });
  });

  describe("requestProductionPromotion (REQ-DEP-01)", () => {
    it("creates an approval record and sets status to pending_approval", async () => {
      const result = await manager.requestProductionPromotion(mockUser, {
        commitSha: testCommitSha,
        commitMessage: testCommitMsg,
        verificationSummary: "107 suites passed",
        telegramChatId: 987654321,
      });

      expect(result.deployment.environment).toBe("production");
      expect(result.deployment.status).toBe("pending_approval");
      expect(result.deployment.commit_sha).toBe(testCommitSha);
      expect(result.deployment.approval_id).toBe(result.approval.id);
      expect(result.deployment.production_url).toBeNull();

      expect(mockApprovalRepo.createApproval).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          actionType: "production_deploy",
          targetResource: "production:jarvis.app",
        })
      );

      expect(mockTelegramService.sendActionCard).toHaveBeenCalledWith(
        987654321,
        expect.objectContaining({
          approval: result.approval,
        })
      );

      expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "deployment.promotion_requested",
          resourceId: result.deployment.id,
        })
      );
    });

    it("throws error if commitSha is missing", async () => {
      await expect(
        manager.requestProductionPromotion(mockUser, {
          commitSha: "",
        })
      ).rejects.toThrow("Commit SHA is required");
    });
  });

  describe("executeProductionPromotion (REQ-DEP-01)", () => {
    it("throws DeploymentNotFoundError if deployment does not exist", async () => {
      await expect(
        manager.executeProductionPromotion("non-existent", "appr-1", mockUser)
      ).rejects.toThrow(DeploymentNotFoundError);
    });

    it("throws UnapprovedProductionDeploymentError if approval is pending or rejected", async () => {
      const { deployment, approval } = await manager.requestProductionPromotion(
        mockUser,
        {
          commitSha: testCommitSha,
        }
      );

      mockApprovalRepo.getApproval.mockResolvedValue({
        id: approval.id,
        status: "pending",
        expires_at: new Date(Date.now() + 10000).toISOString(),
      });

      await expect(
        manager.executeProductionPromotion(deployment.id, approval.id, mockUser)
      ).rejects.toThrow(UnapprovedProductionDeploymentError);

      mockApprovalRepo.getApproval.mockResolvedValue({
        id: approval.id,
        status: "rejected",
        expires_at: new Date(Date.now() + 10000).toISOString(),
      });

      await expect(
        manager.executeProductionPromotion(deployment.id, approval.id, mockUser)
      ).rejects.toThrow(UnapprovedProductionDeploymentError);
    });

    it("throws UnapprovedProductionDeploymentError if approval is expired", async () => {
      const { deployment, approval } = await manager.requestProductionPromotion(
        mockUser,
        {
          commitSha: testCommitSha,
        }
      );

      mockApprovalRepo.getApproval.mockResolvedValue({
        id: approval.id,
        status: "approved",
        expires_at: new Date(Date.now() - 5000).toISOString(), // expired
      });

      await expect(
        manager.executeProductionPromotion(deployment.id, approval.id, mockUser)
      ).rejects.toThrow(UnapprovedProductionDeploymentError);
    });

    it("successfully promotes to production when approval is verified", async () => {
      const { deployment, approval } = await manager.requestProductionPromotion(
        mockUser,
        {
          commitSha: testCommitSha,
        }
      );

      mockApprovalRepo.getApproval.mockResolvedValue({
        id: approval.id,
        status: "approved",
        expires_at: new Date(Date.now() + 10000).toISOString(),
      });

      const promoted = await manager.executeProductionPromotion(
        deployment.id,
        approval.id,
        mockUser
      );

      expect(promoted.id).toBe(deployment.id);
      expect(promoted.status).toBe("deployed");
      expect(promoted.production_url).toBe("https://jarvis.app");
      expect(promoted.deployed_at).toBeDefined();

      const active = await deploymentRepo.getActiveProductionDeployment();
      expect(active?.id).toBe(deployment.id);

      expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "deployment.production_promoted",
          resourceId: deployment.id,
        })
      );
    });
  });

  describe("executeRollback (REQ-DEP-02)", () => {
    it("throws DeploymentNotFoundError if target deployment does not exist", async () => {
      await expect(
        manager.executeRollback("missing-target", mockUser)
      ).rejects.toThrow(DeploymentNotFoundError);
    });

    it("throws InvalidRollbackTargetError if target is not a production deployment", async () => {
      const preview = await manager.createPreviewDeployment({
        commitSha: testCommitSha,
      });

      await expect(
        manager.executeRollback(preview.id, mockUser)
      ).rejects.toThrow(InvalidRollbackTargetError);
    });

    it("rolls back production to target commit, marking previous as rolled_back", async () => {
      // First, seed an older production deployment (v1)
      const v1Deployment = await deploymentRepo.createDeployment({
        environment: "production",
        commit_sha: "v111111111111111111111111111111111111111",
        commit_message: "v1 stable release",
        branch: "main",
        status: "deployed",
        production_url: "https://jarvis.app",
        deployed_at: "2026-11-15T00:00:00.000Z",
      });

      // Then promote a newer production deployment (v2)
      const v2Deployment = await deploymentRepo.createDeployment({
        environment: "production",
        commit_sha: "v222222222222222222222222222222222222222",
        commit_message: "v2 breaking change",
        branch: "main",
        status: "deployed",
        production_url: "https://jarvis.app",
        deployed_at: "2026-11-16T00:00:00.000Z",
      });

      // Verify v2 is currently active
      const currentActive = await deploymentRepo.getActiveProductionDeployment();
      expect(currentActive?.id).toBe(v2Deployment.id);

      // Execute rollback targeting v1
      const rollbackResult = await manager.executeRollback(
        v1Deployment.id,
        mockUser
      );

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rolledBackFromId).toBe(v2Deployment.id);
      expect(rollbackResult.rolledBackToId).toBe(v1Deployment.id);
      expect(rollbackResult.targetCommitSha).toBe(v1Deployment.commit_sha);

      // Verify v2 is now marked rolled_back
      const updatedV2 = await deploymentRepo.getDeployment(v2Deployment.id);
      expect(updatedV2?.status).toBe("rolled_back");
      expect(updatedV2?.rollback_target_id).toBe(v1Deployment.id);

      // Verify new active production points to v1 commit
      const newActive = await deploymentRepo.getActiveProductionDeployment();
      expect(newActive?.commit_sha).toBe(v1Deployment.commit_sha);
      expect(newActive?.status).toBe("deployed");
      expect(newActive?.production_url).toBe("https://jarvis.app");

      expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "deployment.production_rolled_back",
          resourceType: "deployment",
        })
      );
    });
  });
});
