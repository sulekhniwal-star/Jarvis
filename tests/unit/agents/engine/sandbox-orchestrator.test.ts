import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalSandboxRunner } from "@/lib/agents/engine/sandbox/local-sandbox-runner";
import { SandboxOrchestrator } from "@/lib/agents/engine/sandbox/sandbox-orchestrator";
import { ISandboxRunner } from "@/lib/agents/engine/sandbox/types";
import {
  CodingTaskContext,
  ICodingAgentEngine,
  CodingTaskResult,
  BranchSecurityViolationError,
} from "@/lib/agents/engine/types";

describe("LocalSandboxRunner", () => {
  const sampleContext: CodingTaskContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-1",
    projectSlug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main",
    scopedInstructions: "Write tests",
    allowedFilePatterns: ["tests/sample.test.ts"],
    maxRetries: 3,
    environmentVariables: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://secret@localhost:5432/db",
    },
  };

  it("creates ephemeral workspace, invokes coding engine, and cleans up workspace", async () => {
    const mockMkdir = vi.fn();
    const mockRm = vi.fn();
    let receivedContext: CodingTaskContext | undefined;

    const mockEngine: ICodingAgentEngine = {
      engineName: "test-engine",
      executeTask: vi.fn().mockImplementation(async (ctx: CodingTaskContext) => {
        receivedContext = ctx;
        return {
          runId: ctx.runId,
          status: "success" as const,
          exitCode: 0,
          testSummary: { passed: 5, failed: 0, skipped: 0, durationMs: 100 },
          artifacts: [],
        } as CodingTaskResult;
      }),
      validateEnvironment: vi.fn().mockResolvedValue({
        valid: true,
        engineName: "test-engine",
      }),
    };

    const runner = new LocalSandboxRunner({
      codingEngine: mockEngine,
      fsOps: {
        mkdir: mockMkdir,
        rm: mockRm,
        exists: vi.fn().mockReturnValue(true),
      },
    });

    const result = await runner.execute(sampleContext);

    expect(result.status).toBe("success");
    expect(mockMkdir).toHaveBeenCalled();
    expect(mockRm).toHaveBeenCalled();
    expect(mockEngine.executeTask).toHaveBeenCalled();

    // Verify master credentials were stripped from context (NFR-SEC-02)
    expect(receivedContext?.environmentVariables?.DATABASE_URL).toBeUndefined();
    expect(receivedContext?.environmentVariables?.NODE_ENV).toBe("test");
  });

  it("strictly enforces targetBranch === 'main' (NFR-SEC-01)", async () => {
    const runner = new LocalSandboxRunner();

    await expect(
      runner.execute({
        ...sampleContext,
        targetBranch: "dev" as any,
      })
    ).rejects.toThrow(BranchSecurityViolationError);
  });
});

describe("SandboxOrchestrator", () => {
  let mockGithubRunner: ISandboxRunner;
  let mockLocalRunner: ISandboxRunner;

  beforeEach(() => {
    mockGithubRunner = {
      mode: "github_actions",
      execute: vi.fn().mockResolvedValue({
        runId: "22222222-2222-4222-8222-222222222222",
        status: "success",
        exitCode: 0,
        testSummary: { passed: 1, failed: 0, skipped: 0, durationMs: 200 },
        artifacts: [],
      }),
      validateEnvironment: vi.fn().mockResolvedValue({
        valid: true,
        engineName: "github_actions",
      }),
    };

    mockLocalRunner = {
      mode: "local_process",
      execute: vi.fn().mockResolvedValue({
        runId: "22222222-2222-4222-8222-222222222222",
        status: "success",
        exitCode: 0,
        testSummary: { passed: 1, failed: 0, skipped: 0, durationMs: 50 },
        artifacts: [],
      }),
      validateEnvironment: vi.fn().mockResolvedValue({
        valid: true,
        engineName: "local_process",
      }),
    };
  });

  it("selects GitHub Actions runner when requested", async () => {
    const orchestrator = new SandboxOrchestrator({
      githubRunner: mockGithubRunner,
      localRunner: mockLocalRunner,
    });

    const runner = await orchestrator.getActiveRunner("github_actions");
    expect(runner.mode).toBe("github_actions");
  });

  it("selects Local runner when requested", async () => {
    const orchestrator = new SandboxOrchestrator({
      githubRunner: mockGithubRunner,
      localRunner: mockLocalRunner,
    });

    const runner = await orchestrator.getActiveRunner("local_process");
    expect(runner.mode).toBe("local_process");
  });

  it("in auto mode: selects GitHub Actions runner when valid", async () => {
    const orchestrator = new SandboxOrchestrator({
      githubRunner: mockGithubRunner,
      localRunner: mockLocalRunner,
      preferredMode: "auto",
    });

    const runner = await orchestrator.getActiveRunner();
    expect(runner.mode).toBe("github_actions");
  });

  it("in auto mode: falls back to Local runner when GitHub Actions is unavailable", async () => {
    mockGithubRunner.validateEnvironment = vi.fn().mockResolvedValue({
      valid: false,
      engineName: "github_actions",
      details: "No token",
    });

    const orchestrator = new SandboxOrchestrator({
      githubRunner: mockGithubRunner,
      localRunner: mockLocalRunner,
      preferredMode: "auto",
    });

    const runner = await orchestrator.getActiveRunner();
    expect(runner.mode).toBe("local_process");
  });

  it("returns diagnostics for all runners", async () => {
    const orchestrator = new SandboxOrchestrator({
      githubRunner: mockGithubRunner,
      localRunner: mockLocalRunner,
      preferredMode: "auto",
    });

    const diag = await orchestrator.getDiagnostics();
    expect(diag.activeMode).toBe("github_actions");
    expect(diag.githubRunner.valid).toBe(true);
    expect(diag.localRunner.valid).toBe(true);
  });
});
