import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtifactPipeline } from "@/lib/agents/engine/telemetry/artifact-pipeline";
import { ExecutionCoordinator } from "@/lib/agents/engine/telemetry/execution-coordinator";
import { CodingTaskResult, CodingTaskContext } from "@/lib/agents/engine/types";
import { SandboxOrchestrator } from "@/lib/agents/engine/sandbox/sandbox-orchestrator";

describe("ArtifactPipeline", () => {
  let pipeline: ArtifactPipeline;

  beforeEach(() => {
    pipeline = new ArtifactPipeline();
  });

  it("computes deterministic SHA-256 checksums for string and buffer", () => {
    const text = "hello world";
    const hash1 = pipeline.computeSha256(text);
    const hash2 = pipeline.computeSha256(Buffer.from(text, "utf8"));

    expect(hash1).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    expect(hash1).toBe(hash2);
  });

  it("sanitizes known credential patterns and tokens in text", () => {
    const rawContent = `
      DATABASE_URL=postgres://user:supersecretpassword@localhost:5432/db
      TELEGRAM_BOT_TOKEN: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
      SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc123xyz456
      const token = "ghp_abcdefghijklmnopqrstuvwxyz123456";
    `;

    const sanitized = pipeline.sanitizeContent(rawContent);

    expect(sanitized).not.toContain("supersecretpassword");
    expect(sanitized).not.toContain("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");
    expect(sanitized).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc123xyz456");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  it("records artifacts via AgentRunRepository and hashes them", async () => {
    const mockRepo = {
      recordArtifact: vi.fn().mockImplementation((runId, dto) =>
        Promise.resolve({
          id: "art-1",
          run_id: runId,
          artifact_type: dto.artifactType,
          storage_path: dto.storagePath,
          file_size_bytes: dto.fileSizeBytes,
          mime_type: dto.mimeType,
          checksum_sha256: dto.checksumSha256,
          created_at: new Date().toISOString(),
        })
      ),
    } as any;

    const artifacts = [
      {
        name: "test-report.json",
        path: "reports/test-report.json",
        artifactType: "test_log" as const,
        mimeType: "application/json",
        content: JSON.stringify({ passed: 10, failed: 0 }),
      },
    ];

    const recorded = await pipeline.recordArtifacts("run-123", artifacts, mockRepo);

    expect(recorded).toHaveLength(1);
    expect(mockRepo.recordArtifact).toHaveBeenCalledTimes(1);
    expect(mockRepo.recordArtifact).toHaveBeenCalledWith("run-123", expect.objectContaining({
      artifactType: "test_log",
      storagePath: "reports/test-report.json",
      mimeType: "application/json",
      checksumSha256: expect.any(String),
    }));
  });

  it("generates structured markdown execution summary", () => {
    const result: CodingTaskResult = {
      runId: "run-abc",
      status: "success",
      exitCode: 0,
      commitHash: "1234567890abcdef",
      diffPatch: "--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new",
      testSummary: { passed: 5, failed: 0, skipped: 0, durationMs: 120 },
      artifacts: [
        {
          name: "summary.md",
          path: "summary.md",
          artifactType: "log",
          mimeType: "text/markdown",
        },
      ],
      retries: 0,
    };

    const context: CodingTaskContext = {
      taskId: "task-001",
      runId: "run-abc",
      projectSlug: "portfolio",
      targetBranch: "main",
      step: {
        stepNumber: 1,
        title: "Build landing hero",
        description: "Add landing hero component",
        filesToModify: ["src/components/hero.tsx"],
      },
      allowedFiles: ["src/components/hero.tsx"],
      environmentVariables: {},
      retryCount: 0,
      maxRetries: 3,
    };

    const markdown = pipeline.generateSummaryMarkdown(result, context);

    expect(markdown).toContain("# ✅ Task Execution Summary");
    expect(markdown).toContain("Task ID:** `task-001`");
    expect(markdown).toContain("Commit SHA:** `1234567890abcdef` (main 🔒)");
    expect(markdown).toContain("5 passed, 0 failed");
    expect(markdown).toContain("## Diff Patch");
  });
});

describe("ExecutionCoordinator", () => {
  let mockTaskRepo: any;
  let mockAgentRunRepo: any;
  let mockOrchestrator: any;
  let mockPipeline: any;
  let mockTelegramClient: any;

  beforeEach(() => {
    mockTaskRepo = {
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockAgentRunRepo = {
      createRun: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111" }),
      startRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
      failRun: vi.fn().mockResolvedValue(undefined),
      recordArtifact: vi.fn().mockResolvedValue({}),
    };

    mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        runId: "11111111-1111-4111-a111-111111111111",
        status: "success",
        exitCode: 0,
        commitHash: "abcdef1234567890",
        diffPatch: "diff",
        testSummary: { passed: 4, failed: 0, skipped: 0, durationMs: 250 },
        artifacts: [{ name: "diff.patch", path: "diff.patch", artifactType: "diff", mimeType: "text/x-diff" }],
        retries: 0,
      }),
    };

    mockPipeline = {
      recordArtifacts: vi.fn().mockResolvedValue([]),
    };

    mockTelegramClient = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1001 }),
    };
  });

  it("coordinates successful task execution with state machine transitions and telemetry", async () => {
    const coordinator = new ExecutionCoordinator({
      taskRepo: mockTaskRepo,
      agentRunRepo: mockAgentRunRepo,
      orchestrator: mockOrchestrator as unknown as SandboxOrchestrator,
      pipeline: mockPipeline as unknown as ArtifactPipeline,
      telegramClient: mockTelegramClient,
      ownerTelegramId: "999888777",
    });

    const validStep = {
      id: "step-1",
      title: "Implement auth middleware",
      description: "Protect /dashboard routes with edge middleware",
      filesTargeted: ["src/middleware.ts"],
      actionType: "modify" as const,
      wave: 1,
      dependencies: [],
      riskLevel: "low" as const,
      requiresApproval: false,
      verificationCommand: "npm test",
      rollbackProcedure: "git checkout src/middleware.ts",
    };

    const summary = await coordinator.executeTaskStep({
      taskId: "12345678-1234-4234-a234-123456789012",
      step: validStep,
      project: {
        slug: "javis-core",
        repositoryUrl: "https://github.com/org/repo",
      },
    });

    expect(mockAgentRunRepo.createRun).toHaveBeenCalledWith("12345678-1234-4234-a234-123456789012", "aider");
    expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith("12345678-1234-4234-a234-123456789012", "running");
    expect(mockAgentRunRepo.startRun).toHaveBeenCalledWith("11111111-1111-4111-a111-111111111111");
    expect(mockOrchestrator.execute).toHaveBeenCalled();
    expect(mockAgentRunRepo.completeRun).toHaveBeenCalledWith("11111111-1111-4111-a111-111111111111", expect.objectContaining({
      exitCode: 0,
      gitCommitHash: "abcdef1234567890",
    }));
    expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith("12345678-1234-4234-a234-123456789012", "completed");
    expect(mockPipeline.recordArtifacts).toHaveBeenCalledWith("11111111-1111-4111-a111-111111111111", expect.any(Array), mockAgentRunRepo);
    expect(mockTelegramClient.sendMessage).toHaveBeenCalledWith("999888777", expect.stringContaining("Agent Run Update"), expect.any(Object));

    expect(summary.status).toBe("success");
    expect(summary.commitHash).toBe("abcdef1234567890");
    expect(summary.testSummary.passed).toBe(4);
  });

  it("handles catastrophic sandbox failures by transitioning task and run to failed", async () => {
    mockOrchestrator.execute.mockRejectedValueOnce(new Error("Local execution timeout"));

    const coordinator = new ExecutionCoordinator({
      taskRepo: mockTaskRepo,
      agentRunRepo: mockAgentRunRepo,
      orchestrator: mockOrchestrator as unknown as SandboxOrchestrator,
      pipeline: mockPipeline as unknown as ArtifactPipeline,
    });

    const summary = await coordinator.executeTaskStep({
      taskId: "22222222-2222-4222-a222-222222222222",
      step: {
        id: "step-2",
        title: "Run heavy task",
        description: "Will timeout during execution",
        filesTargeted: ["src/heavy.ts"],
        actionType: "modify" as const,
        wave: 1,
        dependencies: [],
        riskLevel: "medium" as const,
        requiresApproval: false,
        verificationCommand: "npm test",
        rollbackProcedure: "git checkout src/heavy.ts",
      },
      project: {
        slug: "test-project",
        repositoryUrl: "https://github.com/org/repo",
      },
    });

    expect(summary.status).toBe("error");
    expect(summary.errorDetails).toContain("Local execution timeout");
    expect(mockAgentRunRepo.failRun).toHaveBeenCalledWith("11111111-1111-4111-a111-111111111111", expect.stringContaining("Local execution timeout"), 1);
    expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith("22222222-2222-4222-a222-222222222222", "failed");
  });

  it("handles runner returned error status gracefully", async () => {
    mockOrchestrator.execute.mockResolvedValueOnce({
      runId: "11111111-1111-4111-a111-111111111111",
      status: "error",
      exitCode: 1,
      errorDetails: "Tests failed on attempt 3",
      testSummary: { passed: 2, failed: 2, skipped: 0, durationMs: 150 },
      artifacts: [],
      retries: 3,
    });

    const coordinator = new ExecutionCoordinator({
      taskRepo: mockTaskRepo,
      agentRunRepo: mockAgentRunRepo,
      orchestrator: mockOrchestrator as unknown as SandboxOrchestrator,
      pipeline: mockPipeline as unknown as ArtifactPipeline,
    });

    const summary = await coordinator.executeTaskStep({
      taskId: "33333333-3333-4333-a333-333333333333",
      step: {
        id: "step-3",
        title: "Failing test step",
        description: "Tests will fail after 3 retries",
        filesTargeted: ["src/feature.ts"],
        actionType: "modify" as const,
        wave: 1,
        dependencies: [],
        riskLevel: "high" as const,
        requiresApproval: false,
        verificationCommand: "npm test",
        rollbackProcedure: "git checkout src/feature.ts",
      },
      project: {
        slug: "test-project",
        repositoryUrl: "https://github.com/org/repo",
      },
    });

    expect(summary.status).toBe("error");
    expect(mockAgentRunRepo.failRun).toHaveBeenCalledWith("11111111-1111-4111-a111-111111111111", "Tests failed on attempt 3", 1);
    expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith("33333333-3333-4333-a333-333333333333", "failed");
  });
});
