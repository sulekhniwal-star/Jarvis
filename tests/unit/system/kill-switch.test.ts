import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  EmergencyKillSwitchService,
  KillSwitchResult,
} from "@/lib/system/kill-switch";
import { ProcessCancellationRegistry } from "@/lib/system/process-registry";

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  const mockExecFile = vi.fn((_cmd: string, _args: string[], options: any, cb?: (err: any) => void) => {
    const callback = typeof options === "function" ? options : cb;
    if (callback) callback(null);
  });
  return {
    ...actual,
    default: {
      ...actual,
      execFile: mockExecFile,
    },
    execFile: mockExecFile,
  };
});

describe("EmergencyKillSwitchService (REQ-SEC-01, REQ-SEC-02, NFR-PERF-03)", () => {
  let mockSupabase: any;
  let mockRegistry: ProcessCancellationRegistry;
  let mockRunsUpdate: any;
  let mockTasksUpdate: any;
  let mockApprovalsUpdate: any;
  let mockAuditInsert: any;

  beforeEach(() => {
    mockRegistry = new ProcessCancellationRegistry();

    mockRunsUpdate = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: "run-1" }, { id: "run-2" }],
          error: null,
        }),
      }),
    });

    mockTasksUpdate = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: "task-1" }],
          error: null,
        }),
      }),
    });

    mockApprovalsUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: "app-1" }, { id: "app-2" }],
          error: null,
        }),
      }),
    });

    mockAuditInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "audit-123" },
          error: null,
        }),
      }),
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "agent_runs") {
          return { update: mockRunsUpdate };
        }
        if (table === "tasks") {
          return { update: mockTasksUpdate };
        }
        if (table === "approvals") {
          return { update: mockApprovalsUpdate };
        }
        if (table === "audit_events") {
          return { insert: mockAuditInsert };
        }
        return {};
      }),
    };
  });

  it("halts active processes, cancels runs and tasks, revokes approvals, and logs audit in < 1s", async () => {
    const procKill = vi.fn().mockReturnValue(true);
    mockRegistry.register("run-1", { pid: 9999, kill: procKill });

    const killService = new EmergencyKillSwitchService({
      supabase: mockSupabase,
      registry: mockRegistry,
    });

    const result = await killService.executeEmergencyStop("user-1", "web");

    // 1. Process tree kill verification
    expect(result.terminatedProcessesCount).toBe(1);
    expect(mockRegistry.getActiveProcesses()).toHaveLength(0);

    // 2. Cascade DB updates verification
    expect(result.cancelledRunsCount).toBe(2);
    expect(result.cancelledTasksCount).toBe(1);
    expect(result.revokedApprovalsCount).toBe(2);
    expect(result.auditEventId).toBe("audit-123");

    // 3. Sub-second performance verification (NFR-PERF-03)
    expect(result.subSecondPerformanceAchieved).toBe(true);
    expect(result.durationMs).toBeLessThan(1000);

    // 4. Audit trail content verification
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        event_type: "EMERGENCY_KILL_SWITCH_ACTIVATED",
        details: expect.objectContaining({
          source: "web",
          terminatedProcesses: 1,
          cancelledRuns: 2,
          cancelledTasks: 1,
          revokedApprovals: 2,
        }),
      })
    );
  });

  it("handles standalone mode gracefully without Supabase client", async () => {
    const standaloneKillService = new EmergencyKillSwitchService({
      registry: mockRegistry,
    });

    const result = await standaloneKillService.executeEmergencyStop(
      "user-1",
      "telegram"
    );

    expect(result.success).toBe(true);
    expect(result.source).toBe("telegram");
    expect(result.subSecondPerformanceAchieved).toBe(true);
  });
});
