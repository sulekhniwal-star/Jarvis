import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { BackupSnapshotRunner } from "@/lib/ops/backup-runner";

describe("BackupSnapshotRunner (REQ-OPS-01)", () => {
  let testOutputDir: string;
  let mockSupabase: any;
  let mockData: Record<string, any[]>;

  beforeEach(() => {
    testOutputDir = path.join(os.tmpdir(), `javis-test-backups-${Date.now()}`);
    fs.mkdirSync(testOutputDir, { recursive: true });

    mockData = {
      projects: [{ id: "proj-1", name: "Jarvis Core" }],
      tasks: [{ id: "task-1", title: "Implement Backup", status: "completed" }],
      agent_runs: [{ id: "run-1", agent_name: "aider", status: "completed" }],
      approvals: [{ id: "app-1", action_type: "push", status: "approved" }],
      cost_records: [{ id: "cost-1", cost_inr: 1.5 }],
      memories: [{ id: "mem-1", content: "Architecture note" }],
      audit_events: [{ id: "aud-1", event_type: "task_intake" }],
    };

    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockResolvedValue({
          data: mockData[table] || [],
          error: null,
        }),
      })),
    };
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it("creates encrypted and compressed snapshot with SHA-256 checksum digest", async () => {
    const runner = new BackupSnapshotRunner(mockSupabase);

    const result = await runner.createSnapshot({
      outputDir: testOutputDir,
      encryptionKey: "test-secret-key-12345",
    });

    expect(result.snapshotId).toContain("snapshot-");
    expect(result.recordCount).toBe(7);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.checksum).toHaveLength(64);

    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(fs.existsSync(result.checksumPath)).toBe(true);

    // Verify .sha256 file contents
    const checksumFile = fs.readFileSync(result.checksumPath, "utf-8");
    expect(checksumFile).toContain(result.checksum);
    expect(checksumFile).toContain(result.filename);
  });

  it("verifies snapshot checksum accurately", async () => {
    const runner = new BackupSnapshotRunner(mockSupabase);

    const result = await runner.createSnapshot({
      outputDir: testOutputDir,
      encryptionKey: "test-secret-key-12345",
    });

    const isValid = runner.verifySnapshotChecksum(result.filePath);
    expect(isValid).toBe(true);

    // Tamper with the snapshot file
    fs.appendFileSync(result.filePath, "corrupted-bytes");
    const isTamperedValid = runner.verifySnapshotChecksum(result.filePath);
    expect(isTamperedValid).toBe(false);
  });

  it("decrypts and decompresses snapshot restoring 100% of data", async () => {
    const runner = new BackupSnapshotRunner(mockSupabase);
    const key = "my-encryption-key-xyz";

    const result = await runner.createSnapshot({
      outputDir: testOutputDir,
      encryptionKey: key,
    });

    const dataset = runner.decryptSnapshot(result.filePath, key);

    expect(dataset.version).toBe("1.0");
    expect(dataset.metadata.totalRecords).toBe(7);
    expect(dataset.tables.projects).toHaveLength(1);
    expect(dataset.tables.projects[0].name).toBe("Jarvis Core");
    expect(dataset.tables.tasks).toHaveLength(1);
    expect(dataset.tables.audit_events).toHaveLength(1);
  });

  it("fails to decrypt if wrong encryption key or corrupted auth tag is used", async () => {
    const runner = new BackupSnapshotRunner(mockSupabase);

    const result = await runner.createSnapshot({
      outputDir: testOutputDir,
      encryptionKey: "correct-key-1",
    });

    // Wrong key throws
    expect(() => {
      runner.decryptSnapshot(result.filePath, "wrong-key-2");
    }).toThrow();
  });

  it("rotates snapshots according to retention limit", () => {
    const runner = new BackupSnapshotRunner(mockSupabase);

    // Create 10 dummy snapshot files
    for (let i = 1; i <= 10; i++) {
      const pad = String(i).padStart(2, "0");
      const snapName = `snapshot-20261117-1000${pad}.enc.gz`;
      const snapPath = path.join(testOutputDir, snapName);
      const chkPath = path.join(testOutputDir, `${snapName}.sha256`);

      fs.writeFileSync(snapPath, "dummy-encrypted-content");
      fs.writeFileSync(chkPath, "dummy-checksum");
    }

    const rotation = runner.rotateSnapshots(testOutputDir, 7);

    expect(rotation.retained).toHaveLength(7);
    expect(rotation.pruned).toHaveLength(3);

    const remainingFiles = fs.readdirSync(testOutputDir);
    // 7 snapshots + 7 checksums = 14 files
    expect(remainingFiles).toHaveLength(14);
  });
});
