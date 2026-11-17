import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { StoragePruningService } from "@/lib/ops/storage-pruner";

describe("StoragePruningService (REQ-OPS-03)", () => {
  let testDir: string;
  let oldFilePath: string;
  let recentFilePath: string;
  let tempDirPath: string;
  let tempFilePath: string;

  let mockSupabase: any;
  let mockAuditLedger: any;
  let runArtifactsStore: any[];
  let approvalsStore: any[];

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `javis-storage-prune-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    oldFilePath = path.join(testDir, "old-artifact.log");
    recentFilePath = path.join(testDir, "recent-artifact.log");
    tempDirPath = path.join(testDir, "temp-logs");
    fs.mkdirSync(tempDirPath, { recursive: true });
    tempFilePath = path.join(tempDirPath, "debug.tmp");

    fs.writeFileSync(oldFilePath, "old build artifacts content for testing 12345");
    fs.writeFileSync(recentFilePath, "recent build artifacts content");
    fs.writeFileSync(tempFilePath, "ephemeral debug trace");

    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const pastExpiration = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const futureExpiration = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    runArtifactsStore = [
      {
        id: "art-old-1",
        run_id: "run-old-1",
        storage_path: oldFilePath,
        file_size_bytes: 42,
        created_at: oldDate,
      },
      {
        id: "art-recent-1",
        run_id: "run-recent-1",
        storage_path: recentFilePath,
        file_size_bytes: 30,
        created_at: recentDate,
      },
    ];

    approvalsStore = [
      {
        id: "app-stale-1",
        user_id: "usr-1",
        action_type: "deploy_prod",
        target_resource: "prod",
        status: "pending",
        expires_at: pastExpiration,
      },
      {
        id: "app-active-1",
        user_id: "usr-1",
        action_type: "deploy_preview",
        target_resource: "preview",
        status: "pending",
        expires_at: futureExpiration,
      },
      {
        id: "app-already-approved-1",
        user_id: "usr-1",
        action_type: "kill_switch",
        target_resource: "sys",
        status: "approved",
        expires_at: pastExpiration,
      },
    ];

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "run_artifacts") {
          return {
            select: vi.fn().mockReturnThis(),
            lt: vi.fn().mockImplementation((_field: string, cutoff: string) => {
              const matching = runArtifactsStore.filter(
                (item) => new Date(item.created_at) < new Date(cutoff)
              );
              return Promise.resolve({ data: matching, error: null });
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((_field: string, ids: string[]) => {
                runArtifactsStore = runArtifactsStore.filter(
                  (item) => !ids.includes(item.id)
                );
                return Promise.resolve({ data: null, error: null });
              }),
            }),
          };
        }

        if (table === "approvals") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function (this: any, field: string, val: any) {
              this._eqFilters = this._eqFilters || {};
              this._eqFilters[field] = val;
              return this;
            }),
            lt: vi.fn().mockImplementation(function (this: any, _field: string, cutoff: string) {
              const matching = approvalsStore.filter((item) => {
                if (this._eqFilters?.status && item.status !== this._eqFilters.status) {
                  return false;
                }
                if (this._eqFilters?.user_id && item.user_id !== this._eqFilters.user_id) {
                  return false;
                }
                return new Date(item.expires_at) < new Date(cutoff);
              });
              return Promise.resolve({ data: matching, error: null });
            }),
            update: vi.fn().mockImplementation((updates: any) => ({
              eq: vi.fn().mockImplementation((_field: string, id: string) => {
                const target = approvalsStore.find((item) => item.id === id);
                if (target) {
                  Object.assign(target, updates);
                }
                return Promise.resolve({ data: target, error: null });
              }),
            })),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    mockAuditLedger = {
      recordEvent: vi.fn().mockResolvedValue({ id: "audit-evt-1" }),
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("prunes artifacts older than 30 days and preserves recent artifacts", async () => {
    const service = new StoragePruningService({
      supabase: mockSupabase,
      auditLedger: mockAuditLedger,
      cwd: testDir,
    });

    const result = await service.pruneOldArtifacts({ retentionDays: 30 });

    expect(result.prunedCount).toBe(1);
    expect(result.bytesReclaimed).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    // Old file on disk should be deleted
    expect(fs.existsSync(oldFilePath)).toBe(false);
    // Recent file should be preserved
    expect(fs.existsSync(recentFilePath)).toBe(true);

    // Database record for old artifact should be deleted
    expect(runArtifactsStore.find((a) => a.id === "art-old-1")).toBeUndefined();
    expect(runArtifactsStore.find((a) => a.id === "art-recent-1")).toBeDefined();
  });

  it("does not delete files or DB records when dryRun is true", async () => {
    const service = new StoragePruningService({
      supabase: mockSupabase,
      auditLedger: mockAuditLedger,
      cwd: testDir,
    });

    const result = await service.pruneOldArtifacts({ retentionDays: 30, dryRun: true });

    expect(result.prunedCount).toBe(1);
    expect(result.bytesReclaimed).toBeGreaterThan(0);

    // Files on disk must still exist
    expect(fs.existsSync(oldFilePath)).toBe(true);
    expect(fs.existsSync(recentFilePath)).toBe(true);

    // Database records must still be present
    expect(runArtifactsStore.find((a) => a.id === "art-old-1")).toBeDefined();
  });

  it("expires stale pending approvals and generates audit ledger events", async () => {
    const service = new StoragePruningService({
      supabase: mockSupabase,
      auditLedger: mockAuditLedger,
      cwd: testDir,
    });

    const result = await service.expireStaleApprovals();

    expect(result.expiredCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    const expiredItem = approvalsStore.find((a) => a.id === "app-stale-1");
    expect(expiredItem?.status).toBe("expired");

    const activeItem = approvalsStore.find((a) => a.id === "app-active-1");
    expect(activeItem?.status).toBe("pending");

    expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "approval.expired",
        resourceType: "approval",
        resourceId: "app-stale-1",
      })
    );
  });

  it("cleans temporary logs and calculates reclaimed space", async () => {
    const service = new StoragePruningService({
      supabase: mockSupabase,
      auditLedger: mockAuditLedger,
      cwd: testDir,
    });

    const result = await service.pruneTemporaryLogs({ tempDirPaths: [tempDirPath] });

    expect(result.cleanedCount).toBe(1);
    expect(result.bytesReclaimed).toBeGreaterThan(0);
    expect(fs.existsSync(tempFilePath)).toBe(false);
  });

  it("runs full maintenance lifecycle successfully with aggregated report", async () => {
    const service = new StoragePruningService({
      supabase: mockSupabase,
      auditLedger: mockAuditLedger,
      cwd: testDir,
    });

    const report = await service.runFullMaintenance({
      retentionDays: 30,
      dryRun: false,
      tempDirPaths: [tempDirPath],
    });

    expect(report.success).toBe(true);
    expect(report.isDryRun).toBe(false);
    expect(report.artifactsPruned).toBe(1);
    expect(report.approvalsExpired).toBe(1);
    expect(report.tempFilesCleaned).toBe(1);
    expect(report.bytesReclaimed).toBeGreaterThan(0);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.errors).toHaveLength(0);

    // Verify system maintenance audit event was recorded
    expect(mockAuditLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "system.maintenance_prune",
        resourceType: "system",
        resourceId: "storage-pruner",
      })
    );
  });
});
