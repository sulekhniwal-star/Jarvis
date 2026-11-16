import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "@/lib/github/client";
import { GitHubActionsSandboxRunner } from "@/lib/agents/engine/sandbox/github-actions-runner";
import { CodingTaskContext } from "@/lib/agents/engine/types";
import { SandboxRunnerError } from "@/lib/agents/engine/sandbox/types";

describe("GitHubClient.dispatchWorkflow", () => {
  let client: GitHubClient;

  beforeEach(() => {
    client = new GitHubClient({ token: "fake-token" });
  });

  it("strictly enforces ref === 'main' (NFR-SEC-01)", async () => {
    await expect(
      client.dispatchWorkflow("owner", "repo", "workflow.yml", "feature/bad")
    ).rejects.toThrow("Branch security violation");
  });
});

describe("GitHubActionsSandboxRunner", () => {
  const sampleContext: CodingTaskContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-17.1",
    projectSlug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main",
    scopedInstructions: "Implement sandbox runner",
    allowedFilePatterns: ["src/lib/sandbox.ts"],
    maxRetries: 3,
  };

  it("dispatches workflow and polls until conclusion === 'success'", async () => {
    const mockClient = {
      dispatchWorkflow: vi.fn().mockResolvedValue(undefined),
      listWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 999888,
          created_at: new Date().toISOString(),
          status: "in_progress",
        },
      ]),
      getWorkflowRun: vi.fn().mockResolvedValue({
        id: 999888,
        status: "completed",
        conclusion: "success",
        head_sha: "abcdef1234567890abcdef1234567890abcdef12",
        html_url: "https://github.com/owner/repo/actions/runs/999888",
      }),
      getRepository: vi.fn().mockResolvedValue({
        full_name: "sulekhniwal-star/Jarvis",
        default_branch: "main",
      }),
    } as unknown as GitHubClient;

    const runner = new GitHubActionsSandboxRunner(mockClient, {
      pollIntervalMs: 10,
      timeoutMs: 1000,
    });

    const result = await runner.execute(sampleContext);

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.commitHash).toBe("abcdef1234567890abcdef1234567890abcdef12");
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(mockClient.dispatchWorkflow).toHaveBeenCalledWith(
      "sulekhniwal-star",
      "Jarvis",
      "coding-agent.yml",
      "main",
      expect.objectContaining({
        task_id: sampleContext.taskId,
        run_id: sampleContext.runId,
      })
    );
  });

  it("handles workflow conclusion === 'failure' returning test_failure", async () => {
    const mockClient = {
      dispatchWorkflow: vi.fn().mockResolvedValue(undefined),
      listWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 555,
          created_at: new Date().toISOString(),
          status: "in_progress",
        },
      ]),
      getWorkflowRun: vi.fn().mockResolvedValue({
        id: 555,
        status: "completed",
        conclusion: "failure",
        html_url: "https://github.com/runs/555",
      }),
    } as unknown as GitHubClient;

    const runner = new GitHubActionsSandboxRunner(mockClient, {
      pollIntervalMs: 10,
      timeoutMs: 1000,
    });

    const result = await runner.execute(sampleContext);

    expect(result.status).toBe("test_failure");
    expect(result.exitCode).toBe(1);
    expect(result.errorDetails).toContain("failure");
  });

  it("handles polling timeout gracefully", async () => {
    const mockClient = {
      dispatchWorkflow: vi.fn().mockResolvedValue(undefined),
      listWorkflowRuns: vi.fn().mockResolvedValue([]),
    } as unknown as GitHubClient;

    const runner = new GitHubActionsSandboxRunner(mockClient, {
      pollIntervalMs: 10,
      timeoutMs: 50, // fast timeout
    });

    await expect(runner.execute(sampleContext)).rejects.toThrow(
      SandboxRunnerError
    );
  });

  it("validates environment", async () => {
    process.env.GITHUB_TOKEN = "token-123";
    const mockClient = {
      getRepository: vi.fn().mockResolvedValue({
        full_name: "sulekhniwal-star/Jarvis",
        default_branch: "main",
      }),
    } as unknown as GitHubClient;

    const runner = new GitHubActionsSandboxRunner(mockClient);
    const validation = await runner.validateEnvironment();

    expect(validation.valid).toBe(true);
    expect(validation.engineName).toBe("github_actions");
  });
});
