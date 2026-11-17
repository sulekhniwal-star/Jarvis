import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemediationExecutor } from "@/lib/advisory/remediation-executor";

describe("RemediationExecutor (REQ-OPS-05)", () => {
  let mockStoragePruner: any;
  let mockCostRepo: any;
  let mockAuditLedger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStoragePruner = {
      runFullMaintenance: vi.fn().mockResolvedValue({
        success: true,
        artifactsPruned: 5,
        bytesReclaimed: 15 * 1024 * 1024,
        approvalsExpired: 2,
        tempFilesCleaned: 1,
        errors: [],
      }),
      expireStaleApprovals: vi.fn().mockResolvedValue({
        expiredCount: 3,
        errors: [],
      }),
    };

    mockCostRepo = {
      unlockEmergencyReserve: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditLedger = {
      recordEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
    };
  });

  it("executes prune_storage remediation and logs audit event", async () => {
    const executor = new RemediationExecutor({
      storagePruner: mockStoragePruner,
      auditLedger: mockAuditLedger,
    });

    const result = await executor.executeAction("prune_storage", { retentionDays: 30 });

    expect(result.success).toBe(true);
    expect(result.actionType).toBe("prune_storage");
    expect(result.message).toContain("5 artifacts pruned");
    expect(mockStoragePruner.runFullMaintenance).toHaveBeenCalled();

    expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "system.remediation_executed",
        resourceType: "advisory",
        resourceId: "prune_storage",
      })
    );
  });

  it("executes clean_extraneous_branches remediation", async () => {
    const mockGitExec = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) return "main\n";
      if (args.some((a: string) => a.includes("--format="))) return "main\nfeature-old\n";
      if (args.includes("-D")) return "Deleted branch feature-old\n";
      return "";
    });

    const executor = new RemediationExecutor({
      gitExec: mockGitExec,
      auditLedger: mockAuditLedger,
    });

    const result = await executor.executeAction("clean_extraneous_branches");

    expect(result.success).toBe(true);
    expect(result.message).toContain("Deleted 1 extraneous branch(es)");
    expect(mockAuditLedger.recordEvent).toHaveBeenCalled();
  });

  it("executes unlock_emergency_reserve remediation", async () => {
    const executor = new RemediationExecutor({
      costRepo: mockCostRepo,
      auditLedger: mockAuditLedger,
    });

    const result = await executor.executeAction("unlock_emergency_reserve", {}, "usr-owner");

    expect(result.success).toBe(true);
    expect(result.message).toContain("Emergency reserve (₹250) authorized");
    expect(mockCostRepo.unlockEmergencyReserve).toHaveBeenCalledWith(
      "usr-owner",
      expect.any(String)
    );
  });

  it("handles failure gracefully and returns unsuccessful execution result", async () => {
    mockStoragePruner.runFullMaintenance.mockRejectedValue(new Error("Storage disk write lock"));

    const executor = new RemediationExecutor({
      storagePruner: mockStoragePruner,
      auditLedger: mockAuditLedger,
    });

    const result = await executor.executeAction("prune_storage");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Storage disk write lock");
    expect(result.message).toContain("failed");
  });
});
