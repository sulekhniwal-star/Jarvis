import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ProcessCancellationRegistry,
  ChildProcessLike,
} from "@/lib/system/process-registry";

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

describe("ProcessCancellationRegistry", () => {
  let registry: ProcessCancellationRegistry;

  beforeEach(() => {
    registry = new ProcessCancellationRegistry();
  });

  it("registers active child processes and unregisters on close", () => {
    let closeListener: (() => void) | undefined;

    const mockProcess: ChildProcessLike = {
      pid: 12345,
      kill: vi.fn().mockReturnValue(true),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "close") closeListener = cb;
      }),
    };

    const regId = registry.register("run-101", mockProcess);
    expect(regId).toBeDefined();
    expect(registry.getActiveProcesses()).toHaveLength(1);

    // Simulate process termination
    closeListener?.();
    expect(registry.getActiveProcesses()).toHaveLength(0);
  });

  it("terminates all registered processes and reports summary", async () => {
    const kill1 = vi.fn().mockReturnValue(true);
    const kill2 = vi.fn().mockReturnValue(true);

    const proc1: ChildProcessLike = {
      pid: 20001,
      kill: kill1,
    };
    const proc2: ChildProcessLike = {
      pid: 20002,
      kill: kill2,
    };

    registry.register("run-1", proc1);
    registry.register("run-2", proc2);

    expect(registry.getActiveProcesses()).toHaveLength(2);

    const summary = await registry.terminateAll("SIGKILL");

    expect(summary.terminatedCount).toBe(2);
    expect(summary.pids).toEqual([20001, 20002]);
    expect(registry.getActiveProcesses()).toHaveLength(0);
    expect(summary.durationMs).toBeLessThan(1000); // Sub-second performance
  });

  it("handles empty registry safely and returns zero terminated", async () => {
    const summary = await registry.terminateAll();

    expect(summary.terminatedCount).toBe(0);
    expect(summary.pids).toHaveLength(0);
    expect(summary.durationMs).toBeLessThan(50);
  });
});
