import {
  ICodingAgentEngine,
  CodingTaskContext,
  CodingTaskResult,
  CodingTaskContextSchema,
  EngineValidationResult,
  TaskExecutionStatus,
  TestSummary,
  ExecutionArtifact,
  EngineExecutionError,
} from "./types";

export interface MockCodingAgentEngineOptions {
  engineName?: string;
  defaultStatus?: TaskExecutionStatus;
  exitCode?: number;
  commitHash?: string;
  diffPatch?: string;
  testSummary?: TestSummary;
  artifacts?: ExecutionArtifact[];
  shouldThrow?: boolean;
  throwError?: Error;
  validationResult?: EngineValidationResult;
  delayMs?: number;
}

/**
 * Deterministic in-memory mock implementation of ICodingAgentEngine
 * used for testing, CI pipelines, and offline dry-runs.
 */
export class MockCodingAgentEngine implements ICodingAgentEngine {
  public readonly engineName: string;
  private defaultStatus: TaskExecutionStatus;
  private exitCode: number;
  private commitHash?: string;
  private diffPatch?: string;
  private testSummary: TestSummary;
  private artifacts: ExecutionArtifact[];
  private shouldThrow: boolean;
  private throwError?: Error;
  private validationResult: EngineValidationResult;
  private delayMs: number;

  public executedContexts: CodingTaskContext[] = [];

  constructor(options: MockCodingAgentEngineOptions = {}) {
    this.engineName = options.engineName || "mock";
    this.defaultStatus = options.defaultStatus || "success";
    this.exitCode = options.exitCode ?? 0;
    this.commitHash =
      options.commitHash ?? "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
    this.diffPatch =
      options.diffPatch ??
      `--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1,3 +1,3 @@\n-export const foo = 1;\n+export const foo = 2;\n`;
    this.testSummary = options.testSummary ?? {
      passed: 12,
      failed: 0,
      skipped: 0,
      durationMs: 450,
    };
    this.artifacts = options.artifacts ?? [
      {
        name: "test-run.log",
        artifactType: "test_log",
        content: "PASS tests/unit/example.test.ts (12 tests passed)",
        mimeType: "text/plain",
      },
    ];
    this.shouldThrow = options.shouldThrow ?? false;
    this.throwError = options.throwError;
    this.validationResult = options.validationResult ?? {
      valid: true,
      engineName: this.engineName,
      version: "mock-1.0.0",
      details: "In-memory test mock engine ready",
    };
    this.delayMs = options.delayMs ?? 0;
  }

  /**
   * Execute task against the mock engine.
   * Validates input context and returns configured result.
   */
  public async executeTask(
    context: CodingTaskContext
  ): Promise<CodingTaskResult> {
    // Validate input context schema
    const validated = CodingTaskContextSchema.parse(context);
    this.executedContexts.push(validated);

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldThrow) {
      throw (
        this.throwError ??
        new EngineExecutionError(
          `Simulated failure in mock engine '${this.engineName}'`,
          this.exitCode
        )
      );
    }

    const isSuccess = this.defaultStatus === "success";

    return {
      runId: validated.runId,
      status: this.defaultStatus,
      exitCode: isSuccess ? 0 : this.exitCode || 1,
      commitHash: isSuccess ? this.commitHash : undefined,
      diffPatch: isSuccess ? this.diffPatch : undefined,
      testSummary: isSuccess
        ? this.testSummary
        : {
            ...this.testSummary,
            passed: 0,
            failed: Math.max(1, this.testSummary.failed || 1),
          },
      artifacts: this.artifacts,
      errorDetails: isSuccess
        ? undefined
        : `Execution ended with status: ${this.defaultStatus}`,
    };
  }

  /**
   * Return simulated environment validation health.
   */
  public async validateEnvironment(): Promise<EngineValidationResult> {
    return this.validationResult;
  }

  /**
   * Reset executed context history and state.
   */
  public reset(): void {
    this.executedContexts = [];
  }
}
