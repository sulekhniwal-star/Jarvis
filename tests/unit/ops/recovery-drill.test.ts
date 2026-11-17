import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { DisasterRecoveryDrill } from "@/lib/ops/recovery-drill";

describe("DisasterRecoveryDrill (REQ-OPS-01)", () => {
  let testOutputDir: string;
  let mockSupabase: any;
  let databaseState: Record<string, any[]>;

  beforeEach(() => {
    testOutputDir = path.join(os.tmpdir(), `javis-drill-test-${Date.now()}`);
    fs.mkdirSync(testOutputDir, { recursive: true });

    databaseState = {
      projects: [{ id: "p1", name: "Main System" }],
      tasks: [{ id: "t1", project_id: "p1", title: "Task 1", status: "completed" }],
      approvals: [{ id: "a1", action_type: "push", status: "approved" }],
      agent_runs: [{ id: "r1", status: "completed" }],
      cost_records: [{ id: "c1", cost_inr: 5.0 }],
      memories: [{ id: "m1", content: "Architecture decision" }],
      audit_events: [{ id: "aud1", event_type: "intake" }],
    };

    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockImplementation(async () => ({
          data: databaseState[table] ? [...databaseState[table]] : [],
          error: null,
        })),
        upsert: vi.fn().mockImplementation(async (rows: any[]) => {
          if (!databaseState[table]) databaseState[table] = [];
          for (const row of rows) {
            const idx = databaseState[table].findIndex((item) => item.id === row.id);
            if (idx >= 0) {
              databaseState[table][idx] = row;
            } else {
              databaseState[table].push(row);
            }
          }
          return { error: null };
        }),
      })),
    };
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it("verifies 100% zero-loss restoration in recovery drill", async () => {
    const drill = new DisasterRecoveryDrill(mockSupabase);

    const result = await drill.executeDrill({
      tempDir: testOutputDir,
      encryptionKey: "drill-secret-key-999",
      simulateDisasterCallback: async () => {
        // Disaster wipes all tables
        for (const t of Object.keys(databaseState)) {
          databaseState[t] = [];
        }
      },
    });

    expect(result.success).toBe(true);
    expect(result.zeroLossAchieved).toBe(true);
    expect(result.rtoMet).toBe(true);
    expect(result.rpoMet).toBe(true);
    expect(result.totalRecordsRestored).toBe(7);
    expect(result.snapshotChecksum).toHaveLength(64);
    expect(result.tableReports).toHaveLength(7);

    for (const report of result.tableReports) {
      expect(report.isMatch).toBe(true);
      expect(report.missingRowsCount).toBe(0);
      expect(report.restoredCount).toBe(1);
    }
  });

  it("detects data loss if restoration is incomplete or fails to restore all rows", async () => {
    const drill = new DisasterRecoveryDrill(mockSupabase);

    const result = await drill.executeDrill({
      tempDir: testOutputDir,
      encryptionKey: "drill-secret-key-999",
      simulateDisasterCallback: async () => {
        // Disaster wipes all tables
        for (const t of Object.keys(databaseState)) {
          databaseState[t] = [];
        }
      },
      customRestoreHandler: async (_dataset) => {
        // Incomplete restore: only restores projects, leaves other tables empty
        databaseState.projects = [{ id: "p1", name: "Main System" }];
      },
    });

    expect(result.success).toBe(false);
    expect(result.zeroLossAchieved).toBe(false);

    const tasksReport = result.tableReports.find((r) => r.tableName === "tasks");
    expect(tasksReport?.isMatch).toBe(false);
    expect(tasksReport?.missingRowsCount).toBe(1);
  });
});
