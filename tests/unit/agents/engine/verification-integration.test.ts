import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiderCliAdapter } from "@/lib/agents/engine/aider/aider-adapter";
import { VerificationHarness } from "@/lib/agents/engine/verification/verification-harness";
import { CodingTaskContext } from "@/lib/agents/engine/types";
import { ExecutionCoordinator } from "@/lib/agents/engine/telemetry/execution-coordinator";

describe("VerificationHarness & Coding Agent Engine Integration (REQ-VR-01)", () => {
  let mockProcessRunner: any;
  let mockRollbackRunner: any;

  beforeEach(() => {
    mockProcessRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "Applied edit to src/app.ts\nCommit 1234567: add feature",
      stderr: "",
      durationMs: 200,
    });
    mockRollbackRunner = vi.fn().mockResolvedValue(undefined);
  });

  const baseContext: CodingTaskContext = {
    taskId: "11111111-2222-4333-a444-555555555555",
    runId: "22222222-3333-4444-a555-666666666666",
    projectSlug: "test-project",
    repositoryUrl: "https://github.com/org/test-project",
    targetBranch: "main",
    scopedInstructions: "Implement API route with validation in src/app/api/test/route.ts",
    allowedFilePatterns: ["src/app/api/test/route.ts"],
    environmentVariables: {},
    retryCount: 0,
    maxRetries: 3,
  };

  it("completes task successfully when injected VerificationHarness passes all stages", async () => {
    const mockHarness = {
      runAll: vi.fn().mockResolvedValue({
        status: "passed",
        overallDurationMs: 350,
        stages: [
          {
            stage: "lint",
            command: "eslint .",
            status: "passed",
            exitCode: 0,
            stdout: "",
            stderr: "",
            durationMs: 50,
          },
          {
            stage: "test",
            command: "vitest run",
            status: "passed",
            exitCode: 0,
            stdout: "Tests 10 passed",
            stderr: "",
            durationMs: 300,
            testMetrics: { passed: 10, failed: 0, skipped: 0 },
          },
        ],
        summary: { passed: 10, failed: 0, skipped: 0, durationMs: 350 },
        artifacts: [
          {
            name: "test.log",
            artifactType: "test_log" as const,
            content: "all tests green",
            mimeType: "text/plain",
          },
        ],
      }),
    } as unknown as VerificationHarness;

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
      verificationHarness: mockHarness,
      gitRollbackRunner: mockRollbackRunner,
    });

    const result = await adapter.executeTask(baseContext);

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.testSummary.passed).toBe(10);
    expect(result.artifacts.some((a) => a.name === "test.log")).toBe(true);
    expect(mockHarness.runAll).toHaveBeenCalled();
  });

  it("engages repair loop and rolls back when VerificationHarness repeatedly fails", async () => {
    const failingHarness = {
      runAll: vi.fn().mockResolvedValue({
        status: "failed",
        overallDurationMs: 200,
        stages: [
          {
            stage: "test",
            command: "vitest run",
            status: "failed",
            exitCode: 1,
            stdout: "Tests 2 failed",
            stderr: "AssertionError: expected true to be false",
            durationMs: 200,
            testMetrics: { passed: 0, failed: 2, skipped: 0 },
            errorSummary: "AssertionError: expected true to be false",
          },
        ],
        summary: { passed: 0, failed: 2, skipped: 0, durationMs: 200 },
        artifacts: [
          {
            name: "test.log",
            artifactType: "test_log" as const,
            content: "AssertionError trace",
            mimeType: "text/plain",
          },
        ],
        failureStage: "test" as const,
        failureDetails: "AssertionError: expected true to be false",
      }),
    } as unknown as VerificationHarness;

    const adapter = new AiderCliAdapter({
      processRunner: mockProcessRunner,
      verificationHarness: failingHarness,
      gitRollbackRunner: mockRollbackRunner,
    });

    const result = await adapter.executeTask(baseContext);

    expect(result.status).toBe("test_failure");
    expect(result.exitCode).toBe(1);
    expect(mockRollbackRunner).toHaveBeenCalled();
    expect(result.errorDetails).toContain("3-strike bounded repair exhausted");
  });

  it("coordinates execution and records verification artifacts through ExecutionCoordinator", async () => {
    const mockAgentRunRepo = {
      createRun: vi.fn().mockResolvedValue({ id: "22222222-3333-4444-a555-666666666666" }),
      startRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
      failRun: vi.fn().mockResolvedValue(undefined),
      recordArtifact: vi.fn().mockResolvedValue({}),
    } as any;

    const mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        runId: "22222222-3333-4444-a555-666666666666",
        status: "success",
        exitCode: 0,
        commitHash: "abcdef1234567890",
        diffPatch: "diff",
        testSummary: { passed: 15, failed: 0, skipped: 0, durationMs: 400 },
        artifacts: [
          {
            name: "test.log",
            path: "verification/test.log",
            artifactType: "test_log" as const,
            mimeType: "text/plain",
            content: "test log output",
          },
          {
            name: "build.log",
            path: "verification/build.log",
            artifactType: "build_log" as const,
            mimeType: "text/plain",
            content: "build log output",
          },
        ],
        retries: 0,
      }),
    } as any;

    const coordinator = new ExecutionCoordinator({
      agentRunRepo: mockAgentRunRepo,
      orchestrator: mockOrchestrator,
    });

    const summary = await coordinator.executeTaskStep({
      taskId: "11111111-2222-4333-a444-555555555555",
      step: {
        id: "step-1",
        title: "Test Step",
        description: "Executing test step",
        filesTargeted: ["src/index.ts"],
        actionType: "modify",
        wave: 1,
        dependencies: [],
        riskLevel: "low",
        requiresApproval: false,
        verificationCommand: "npm test",
        rollbackProcedure: "git checkout src/index.ts",
      },
      project: {
        slug: "core-repo",
        repositoryUrl: "https://github.com/org/repo",
      },
    });

    expect(summary.status).toBe("success");
    expect(summary.testSummary.passed).toBe(15);
    expect(mockAgentRunRepo.completeRun).toHaveBeenCalledWith(
      "22222222-3333-4444-a555-666666666666",
      expect.objectContaining({
        testResults: expect.objectContaining({ passed: 15 }),
      })
    );
  });
});
