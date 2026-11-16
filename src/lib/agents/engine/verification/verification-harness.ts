import * as childProcess from "child_process";
import * as os from "os";
import {
  VerificationStage,
  VerificationStageResult,
  VerificationHarnessConfig,
  VerificationResult,
} from "./types";
import {
  sanitizeVerificationOutput,
  parseVitestOutput,
  parseTypeScriptOutput,
  parseESLintOutput,
  parseNextBuildOutput,
} from "./parsers";
import { diffInspector } from "./diff-inspector";
import { ExecutionArtifact, TestSummary } from "../types";

export interface StageProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface StageProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export type StageProcessRunner = (
  command: string,
  args: string[],
  options?: StageProcessOptions
) => Promise<StageProcessResult>;

/**
 * Cross-platform process runner supporting command execution with timeout control.
 */
export const defaultProcessRunner: StageProcessRunner = async (
  command: string,
  args: string[],
  options?: StageProcessOptions
): Promise<StageProcessResult> => {
  const isWindows = os.platform() === "win32";
  const shell = isWindows ? (process.env.ComSpec || "cmd.exe") : "/bin/sh";
  const shellArgs = isWindows
    ? ["/d", "/s", "/c", [command, ...args].join(" ")]
    : ["-c", [command, ...args].join(" ")];

  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs ?? 60000;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let isTerminated = false;

    const child = childProcess.spawn(shell, shellArgs, {
      cwd: options?.cwd || process.cwd(),
      env: {
        ...process.env,
        ...(options?.env || {}),
      },
      windowsVerbatimArguments: isWindows,
    });

    const timer = setTimeout(() => {
      isTerminated = true;
      try {
        child.kill("SIGTERM");
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
        }, 2000);
      } catch {
        // ignore
      }
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
    }

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\nProcess error: ${err.message}`,
        durationMs,
      });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      if (isTerminated) {
        resolve({
          exitCode: 124, // Standard timeout exit code
          stdout,
          stderr: `${stderr}\nProcess timed out after ${timeoutMs}ms.`,
          durationMs,
        });
        return;
      }

      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
        durationMs,
      });
    });
  });
};

/**
 * Universal Verification Harness executing multi-stage test pipelines (REQ-VR-01).
 */
export class VerificationHarness {
  private config: VerificationHarnessConfig;
  private processRunner: StageProcessRunner;

  constructor(
    config?: Partial<VerificationHarnessConfig>,
    processRunner?: StageProcessRunner
  ) {
    const isWindows = os.platform() === "win32";
    const pnpmCmd = isWindows ? "pnpm.cmd" : "pnpm";

    const defaultCommands: Record<VerificationStage, string> = {
      lint: `${pnpmCmd} exec eslint .`,
      typecheck: `${pnpmCmd} exec tsc --noEmit`,
      test: `${pnpmCmd} exec vitest run`,
      build: `${pnpmCmd} build`,
      custom: "",
    };

    this.config = {
      stages: config?.stages ?? ["lint", "typecheck", "test", "build"],
      failFast: config?.failFast ?? true,
      customCommand: config?.customCommand,
      timeoutMs: config?.timeoutMs ?? 60000,
      cwd: config?.cwd,
      env: config?.env,
      diffPatch: config?.diffPatch,
      allowedFilePatterns: config?.allowedFilePatterns,
      allowDeletions: config?.allowDeletions,
      defaultCommands: {
        ...defaultCommands,
        ...(config?.defaultCommands || {}),
      },
    };

    this.processRunner = processRunner ?? defaultProcessRunner;
  }

  /**
   * Resolves command string for a specific verification stage.
   */
  public resolveStageCommand(
    stage: VerificationStage,
    customCommandOverride?: string
  ): string {
    if (stage === "custom") {
      return customCommandOverride || this.config.customCommand || "npm test";
    }
    return this.config.defaultCommands?.[stage] || "";
  }

  /**
   * Executes an individual verification stage with timeout and output parsing.
   */
  public async runStage(
    stage: VerificationStage,
    customCommandOverride?: string
  ): Promise<VerificationStageResult> {
    const commandStr = this.resolveStageCommand(stage, customCommandOverride);
    if (!commandStr) {
      return {
        stage,
        command: "",
        status: "skipped",
        exitCode: 0,
        stdout: "",
        stderr: "No command defined for stage.",
        durationMs: 0,
      };
    }

    const parts = commandStr.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    if (!cmd) {
      return {
        stage,
        command: "",
        status: "skipped",
        exitCode: 0,
        stdout: "",
        stderr: "No executable command found for stage.",
        durationMs: 0,
      };
    }

    const result = await this.processRunner(cmd, args, {
      cwd: this.config.cwd,
      env: this.config.env,
      timeoutMs: this.config.timeoutMs,
    });

    const sanitizedStdout = sanitizeVerificationOutput(result.stdout);
    const sanitizedStderr = sanitizeVerificationOutput(result.stderr);
    const isPassed = result.exitCode === 0;

    const stageResult: VerificationStageResult = {
      stage,
      command: commandStr,
      status: isPassed ? "passed" : "failed",
      exitCode: result.exitCode,
      stdout: sanitizedStdout,
      stderr: sanitizedStderr,
      durationMs: result.durationMs,
    };

    // Stage-specific parsing
    switch (stage) {
      case "test":
      case "custom": {
        const vitest = parseVitestOutput(sanitizedStdout, sanitizedStderr);
        stageResult.testMetrics = {
          passed: vitest.passed,
          failed: vitest.failed,
          skipped: vitest.skipped,
        };
        if (!isPassed && vitest.failureSnippets.length > 0) {
          stageResult.errorSummary = vitest.failureSnippets.join("\n");
        }
        break;
      }
      case "typecheck": {
        const ts = parseTypeScriptOutput(sanitizedStdout || sanitizedStderr);
        if (!isPassed) {
          stageResult.errorSummary = `${ts.errorCount} TypeScript compiler error(s) detected.`;
        }
        break;
      }
      case "lint": {
        const lint = parseESLintOutput(sanitizedStdout || sanitizedStderr);
        if (!isPassed) {
          stageResult.errorSummary = `${lint.errorCount} ESLint error(s) detected.`;
        }
        break;
      }
      case "build": {
        const build = parseNextBuildOutput(sanitizedStdout || sanitizedStderr);
        if (!isPassed) {
          stageResult.errorSummary = build.summary;
        }
        break;
      }
    }

    return stageResult;
  }

  /**
   * Executes the configured multi-stage verification pipeline.
   */
  public async runAll(
    overrideConfig?: Partial<VerificationHarnessConfig>
  ): Promise<VerificationResult> {
    const activeConfig: VerificationHarnessConfig = {
      ...this.config,
      ...(overrideConfig || {}),
    };

    const startTime = Date.now();
    const stageResults: VerificationStageResult[] = [];
    let hasFailed = false;
    let failureStage: VerificationStage | undefined;
    let failureDetails: string | undefined;

    let totalTestsPassed = 0;
    let totalTestsFailed = 0;
    let totalTestsSkipped = 0;

    let combinedTestLog = "";
    let combinedBuildLog = "";

    // Run Diff Quality Gate if diffPatch is provided in config
    let diffReport: import("./diff-inspector/types").DiffInspectionReport | undefined;
    if (activeConfig.diffPatch) {
      diffReport = diffInspector.inspect(activeConfig.diffPatch, {
        allowedFilePatterns: activeConfig.allowedFilePatterns,
        allowDeletions: activeConfig.allowDeletions,
      });

      if (!diffReport.passed) {
        hasFailed = true;
        if (!failureStage) {
          failureStage = "custom";
          const blockers = diffReport.violations.filter(
            (v) => v.severity === "blocker"
          );
          failureDetails = `Diff inspection quality gate failed: ${blockers
            .map((b) => b.message)
            .join("; ")}`;
        }
      }
    }

    const stagesToRun = [...activeConfig.stages];
    if (activeConfig.customCommand && !stagesToRun.includes("custom")) {
      stagesToRun.push("custom");
    }

    for (const stage of stagesToRun) {
      if (hasFailed && activeConfig.failFast) {
        stageResults.push({
          stage,
          command: this.resolveStageCommand(stage, activeConfig.customCommand),
          status: "skipped",
          exitCode: 0,
          stdout: "",
          stderr: "Stage skipped due to prior failure (fail-fast enabled).",
          durationMs: 0,
        });
        continue;
      }

      const stageResult = await this.runStage(
        stage,
        activeConfig.customCommand
      );
      stageResults.push(stageResult);

      // Accumulate logs
      const logHeader = `=== Stage: ${stage.toUpperCase()} (${stageResult.command}) ===\n`;
      const stageLog = `${logHeader}Exit Code: ${stageResult.exitCode}\nSTDOUT:\n${stageResult.stdout}\nSTDERR:\n${stageResult.stderr}\n\n`;

      if (stage === "test" || stage === "custom") {
        combinedTestLog += stageLog;
      } else {
        combinedBuildLog += stageLog;
      }

      // Aggregate test metrics
      if (stageResult.testMetrics) {
        totalTestsPassed += stageResult.testMetrics.passed;
        totalTestsFailed += stageResult.testMetrics.failed;
        totalTestsSkipped += stageResult.testMetrics.skipped;
      } else {
        if (stageResult.status === "passed") {
          totalTestsPassed += 1;
        } else if (stageResult.status === "failed") {
          totalTestsFailed += 1;
        }
      }

      if (stageResult.status === "failed") {
        hasFailed = true;
        if (!failureStage) {
          failureStage = stage;
          failureDetails =
            stageResult.errorSummary ||
            stageResult.stderr.trim().slice(0, 500) ||
            stageResult.stdout.trim().slice(0, 500) ||
            `Stage ${stage} failed with exit code ${stageResult.exitCode}`;
        }
      }
    }

    const overallDurationMs = Date.now() - startTime;

    const summary: TestSummary = {
      passed: totalTestsPassed,
      failed: totalTestsFailed,
      skipped: totalTestsSkipped,
      durationMs: overallDurationMs,
    };

    const artifacts: ExecutionArtifact[] = [];

    if (combinedTestLog) {
      artifacts.push({
        name: "test.log",
        artifactType: "test_log",
        content: combinedTestLog,
        mimeType: "text/plain",
        path: "verification/test.log",
      });
    }

    if (combinedBuildLog) {
      artifacts.push({
        name: "build.log",
        artifactType: "build_log",
        content: combinedBuildLog,
        mimeType: "text/plain",
        path: "verification/build.log",
      });
    }

    if (diffReport) {
      artifacts.push({
        name: "diff-quality.md",
        artifactType: "diff",
        content: diffReport.markdownSummary,
        mimeType: "text/markdown",
        path: "verification/diff-quality.md",
      });
    }

    return {
      status: hasFailed ? "failed" : "passed",
      overallDurationMs,
      stages: stageResults,
      summary,
      artifacts,
      diffReport,
      failureStage,
      failureDetails,
    };
  }
}

export const verificationHarness = new VerificationHarness();
