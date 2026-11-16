import { describe, it, expect, vi } from "vitest";
import {
  AiderCliAdapter,
  AiderProcessResult,
} from "@/lib/agents/engine/aider/aider-adapter";
import { AiderRepairHandler } from "@/lib/agents/engine/aider/repair-handler";
import {
  CodingTaskContext,
  BranchSecurityViolationError,
} from "@/lib/agents/engine/types";
import { codingEngineRegistry } from "@/lib/agents/engine";

describe("AiderRepairHandler (3-Strike Protocol)", () => {
  let handler: AiderRepairHandler;

  beforeEach(() => {
    handler = new AiderRepairHandler();
  });

  it("advances through strike 1 and 2 with targeted repair prompts", () => {
    let state = handler.createInitialState(3);
    expect(state.currentStrike).toBe(0);
    expect(state.isTerminated).toBe(false);

    // Strike 1
    const strike1 = handler.recordStrike(state, "AssertionError: expected true to be false");
    state = strike1.nextState;
    expect(state.currentStrike).toBe(1);
    expect(strike1.shouldRollback).toBe(false);
    expect(strike1.repairPrompt).toContain("Strike 1 (Targeted Test Fix)");
    expect(strike1.repairPrompt).toContain("AssertionError");

    // Strike 2
    const strike2 = handler.recordStrike(state, "TypeError: cannot read property of undefined", "+const x = 1;");
    state = strike2.nextState;
    expect(state.currentStrike).toBe(2);
    expect(strike2.shouldRollback).toBe(false);
    expect(strike2.repairPrompt).toContain("Strike 2 (Review & Dependency Fix)");
    expect(strike2.repairPrompt).toContain("Recent Changes Diff");
  });

  it("terminates and signals rollback on strike 3", () => {
    let state = handler.createInitialState(3);

    const s1 = handler.recordStrike(state, "Error 1");
    const s2 = handler.recordStrike(s1.nextState, "Error 2");
    const s3 = handler.recordStrike(s2.nextState, "Error 3");

    expect(s3.nextState.currentStrike).toBe(3);
    expect(s3.nextState.isTerminated).toBe(true);
    expect(s3.shouldRollback).toBe(true);
    expect(s3.repairPrompt).toContain("Strike 3");

    // Subsequent call after termination keeps shouldRollback true
    const s4 = handler.recordStrike(s3.nextState, "Error 4");
    expect(s4.shouldRollback).toBe(true);
  });
});

describe("AiderCliAdapter", () => {
  const sampleContext: CodingTaskContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-1",
    projectSlug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main",
    scopedInstructions: "Implement helper function in utils.ts",
    allowedFilePatterns: ["src/utils.ts"],
    maxRetries: 3,
  };

  it("executes task in headless batch mode without verification successfully", async () => {
    const mockProcessRunner = vi.fn().mockResolvedValue({
      stdout: "Applied edit\nCommit 1234567890abcdef1234567890abcdef12345678: feat: add helper\ndiff --git a/src/utils.ts b/src/utils.ts\n",
      stderr: "",
      exitCode: 0,
      durationMs: 750,
    } as AiderProcessResult);

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
    });

    const result = await adapter.executeTask(sampleContext);

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.commitHash).toBe("1234567890abcdef1234567890abcdef12345678");
    expect(result.diffPatch).toBeDefined();
    expect(mockProcessRunner).toHaveBeenCalledTimes(1);

    const calledArgs = mockProcessRunner.mock.calls[0][1];
    expect(calledArgs).toContain("--yes-always");
    expect(calledArgs).toContain("src/utils.ts");
  });

  it("strictly enforces targetBranch === 'main' (NFR-SEC-01)", async () => {
    const adapter = new AiderCliAdapter();

    await expect(
      adapter.executeTask({
        ...sampleContext,
        targetBranch: "feature/dangerous" as any,
      })
    ).rejects.toThrow();
  });

  it("runs verification command; succeeds on first try", async () => {
    const mockProcessRunner = vi.fn().mockResolvedValue({
      stdout: "Commit 1111222233334444555566667777888899990000",
      stderr: "",
      exitCode: 0,
      durationMs: 500,
    });
    const mockVerificationRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      output: "All 5 tests passed",
    });

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
      verificationRunner: mockVerificationRunner,
    });

    const result = await adapter.executeTask({
      ...sampleContext,
      metadata: { verificationCommand: "pnpm test tests/unit/utils.test.ts" },
    });

    expect(result.status).toBe("success");
    expect(mockVerificationRunner).toHaveBeenCalledWith("pnpm test tests/unit/utils.test.ts");
    expect(mockProcessRunner).toHaveBeenCalledTimes(1);
  });

  it("orchestrates repair loop when verification fails on strike 1 and passes on strike 2", async () => {
    const mockProcessRunner = vi.fn()
      .mockResolvedValueOnce({
        stdout: "Initial edit\nCommit 1111222233334444555566667777888899990000",
        stderr: "",
        exitCode: 0,
        durationMs: 500,
      })
      .mockResolvedValueOnce({
        stdout: "Repaired edit\nCommit 2222333344445555666677778888999900001111",
        stderr: "",
        exitCode: 0,
        durationMs: 400,
      });

    const mockVerificationRunner = vi.fn()
      .mockResolvedValueOnce({
        exitCode: 1,
        output: "Test failed: missing semicolon",
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        output: "All tests passed",
      });

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
      verificationRunner: mockVerificationRunner,
    });

    const result = await adapter.executeTask({
      ...sampleContext,
      metadata: { verificationCommand: "pnpm test" },
    });

    expect(result.status).toBe("success");
    expect(mockProcessRunner).toHaveBeenCalledTimes(2);
    expect(mockVerificationRunner).toHaveBeenCalledTimes(2);

    // Verify repair call included strike 1 instructions
    const repairArgs = mockProcessRunner.mock.calls[1][1];
    expect(repairArgs.join(" ")).toContain("Strike 1");
  });

  it("aborts and invokes git rollback when 3 strikes are exhausted", async () => {
    const mockProcessRunner = vi.fn().mockResolvedValue({
      stdout: "Edit made",
      stderr: "",
      exitCode: 0,
      durationMs: 300,
    });

    const mockVerificationRunner = vi.fn().mockResolvedValue({
      exitCode: 1,
      output: "Fatal test error that cannot be resolved",
    });

    const mockRollbackRunner = vi.fn().mockResolvedValue(undefined);

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
      verificationRunner: mockVerificationRunner,
      gitRollbackRunner: mockRollbackRunner,
    });

    const result = await adapter.executeTask({
      ...sampleContext,
      maxRetries: 3,
      metadata: { verificationCommand: "pnpm test" },
    });

    expect(result.status).toBe("test_failure");
    expect(result.exitCode).toBe(1);
    expect(result.commitHash).toBeUndefined();
    expect(result.errorDetails).toContain("3-strike bounded repair exhausted");
    expect(mockRollbackRunner).toHaveBeenCalledWith(["src/utils.ts"]);
  });

  it("validates environment checking CLI version", async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: "aider 0.70.0",
      stderr: "",
      exitCode: 0,
      durationMs: 100,
    });

    const adapter = new AiderCliAdapter({ processRunner: mockRunner });
    const validation = await adapter.validateEnvironment();

    expect(validation.valid).toBe(true);
    expect(validation.version).toBe("aider 0.70.0");
    expect(validation.engineName).toBe("aider");
  });

  it("is registered in codingEngineRegistry", () => {
    expect(codingEngineRegistry.hasEngine("aider")).toBe(true);
    const aiderEngine = codingEngineRegistry.getEngine("aider");
    expect(aiderEngine.engineName).toBe("aider");
  });
});
