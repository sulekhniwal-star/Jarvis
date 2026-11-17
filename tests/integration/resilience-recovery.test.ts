import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs";
import { ResilienceHarness } from "@/lib/testing/resilience-harness";
import { ProcessCancellationRegistry } from "@/lib/system/process-registry";

describe("ResilienceHarness & Failure Recovery Protocols (REQ-SYS-01, NFR-QUAL-01)", () => {
  let testOutputDir: string;
  let mockSupabase: any;
  let databaseState: Record<string, any[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    testOutputDir = path.join(os.tmpdir(), `javis-resilience-${Date.now()}`);
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
      from: vi.fn((table: string) => {
        const createQueryBuilder = () => {
          const builder: any = {
            select: vi.fn().mockImplementation(() => builder),
            in: vi.fn().mockImplementation(() => builder),
            eq: vi.fn().mockImplementation(() => builder),
            single: vi.fn().mockImplementation(async () => ({
              data: { id: "audit-kill-stop-001" },
              error: null,
            })),
            then: (resolve: any) =>
              resolve({
                data: [{ id: "mock-1" }],
                error: null,
              }),
          };
          return builder;
        };

        return {
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
          update: vi.fn().mockImplementation(() => createQueryBuilder()),
          insert: vi.fn().mockImplementation(() => createQueryBuilder()),
        };
      }),
    };
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      try {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error in test
      }
    }
  });

  it("Scenario 1: Bounds test regression at strike 3 with specialized prompts (REQ-VR-04)", async () => {
    const harness = new ResilienceHarness();
    const result = await harness.simulateTestRegressionAndRepair();

    expect(result.totalStrikes).toBe(3);
    expect(result.maxStrikesReached).toBe(true);
    expect(result.haltedCleanly).toBe(true);
    expect(result.promptsGenerated).toHaveLength(3);

    // Each prompt must be tailored and non-empty
    for (const prompt of result.promptsGenerated) {
      expect(prompt.length).toBeGreaterThan(50);
    }
    // Strike 3 must recommend terminal rollback or escalation
    expect(result.finalState.isTerminated).toBe(true);
  });

  it("Scenario 2: Detects high-entropy secrets and blocks code push (REQ-VR-03)", () => {
    const harness = new ResilienceHarness();

    // Injected secrets test
    const leakResult = harness.simulateSecretLeakAttempt();
    expect(leakResult.blocked).toBe(true);
    expect(leakResult.findingsCount).toBeGreaterThanOrEqual(1);
    expect(leakResult.scanReport.passed).toBe(false);

    // Clean code test
    const cleanResult = harness.simulateSecretLeakAttempt(
      "export const appConfig = { timeoutMs: 5000, maxRetries: 3 };"
    );
    expect(cleanResult.blocked).toBe(false);
    expect(cleanResult.findingsCount).toBe(0);
    expect(cleanResult.scanReport.passed).toBe(true);
  });

  it("Scenario 3: Trips circuit breaker on budget overflow and unlocks via emergency reserve (REQ-COST-02)", async () => {
    const harness = new ResilienceHarness();
    const result = await harness.simulateBudgetOverflowAndReserveUnlock();

    expect(result.nominalAllowed).toBe(true);
    expect(result.dailyExceededCaught).toBe(true);
    expect(result.monthlyExceededCaught).toBe(true);
    expect(result.reserveUnlocked).toBe(true);
    expect(result.postUnlockAllowed).toBe(true);
  });

  it("Scenario 4: Executes emergency kill switch cascade in <1s and clears all subprocesses (REQ-SEC-01, REQ-SEC-02)", async () => {
    const customRegistry = new ProcessCancellationRegistry();
    const harness = new ResilienceHarness({
      processRegistry: customRegistry,
      supabase: mockSupabase,
    });

    const result = await harness.simulateEmergencyKillSwitchCascade();

    expect(result.cascadeSuccess).toBe(true);
    expect(result.remainingActiveProcesses).toBe(0);
    expect(result.stopResult.success).toBe(true);
    expect(result.stopResult.subSecondPerformanceAchieved).toBe(true);
    expect(result.durationMs).toBeLessThan(1000);
  });

  it("Scenario 5: Executes disaster recovery drill with 100% table parity and zero data loss (REQ-OPS-01)", async () => {
    const harness = new ResilienceHarness({
      supabase: mockSupabase,
    });

    const result = await harness.simulateDisasterRecoveryDrill({
      tempDir: testOutputDir,
      encryptionKey: "test-encryption-key-for-harness-drill-999",
      simulateDisasterCallback: async () => {
        // Disaster wiping out memory state
        for (const tbl of Object.keys(databaseState)) {
          databaseState[tbl] = [];
        }
      },
    });

    expect(result.drillResult.success).toBe(true);
    expect(result.zeroLossAchieved).toBe(true);
    expect(result.parityMatched).toBe(true);
    expect(result.drillResult.tableReports.length).toBeGreaterThan(0);
    for (const report of result.drillResult.tableReports) {
      expect(report.isMatch).toBe(true);
      expect(report.missingRowsCount).toBe(0);
    }
  });
});
