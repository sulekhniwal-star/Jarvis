import {
  ICodingAgentEngine,
  CodingTaskContext,
  CodingTaskResult,
  CodingTaskContextSchema,
  EngineValidationResult,
  BranchSecurityViolationError,
  ExecutionArtifact,
  TestSummary,
} from "../types";
import { AiderProcessResult } from "./types";
import { synthesizeAiderArgs, DEFAULT_AIDER_MODEL } from "./config-synthesizer";
import { parseAiderOutput, extractExecutionArtifacts } from "./output-parser";
import { AiderRepairHandler } from "./repair-handler";

export interface ProcessRunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

import { VerificationHarness } from "../verification/verification-harness";
import { processRegistry } from "@/lib/system/process-registry";

export type ProcessRunner = (
  command: string,
  args: string[],
  options?: ProcessRunOptions
) => Promise<AiderProcessResult>;

export type VerificationRunner = (
  command: string,
  cwd?: string
) => Promise<{ exitCode: number; output: string }>;

export type GitRollbackRunner = (
  files: string[],
  cwd?: string
) => Promise<void>;

export interface AiderCliAdapterOptions {
  defaultModel?: string;
  openRouterApiKey?: string;
  openRouterBaseUrl?: string;
  processRunner?: ProcessRunner;
  verificationRunner?: VerificationRunner;
  verificationHarness?: VerificationHarness;
  gitRollbackRunner?: GitRollbackRunner;
}

/**
 * Headless Aider CLI Adapter implementing the provider-agnostic ICodingAgentEngine interface.
 * Operates in non-interactive batch mode with strict file boundaries and 3-strike bounded repair.
 */
export class AiderCliAdapter implements ICodingAgentEngine {
  public readonly engineName: string = "aider";
  private defaultModel: string;
  private openRouterApiKey?: string;
  private openRouterBaseUrl?: string;
  private processRunner: ProcessRunner;
  private verificationRunner: VerificationRunner;
  private verificationHarness?: VerificationHarness;
  private gitRollbackRunner: GitRollbackRunner;
  private repairHandler: AiderRepairHandler;

  constructor(options: AiderCliAdapterOptions = {}) {
    this.defaultModel = options.defaultModel || DEFAULT_AIDER_MODEL;
    this.openRouterApiKey = options.openRouterApiKey;
    this.openRouterBaseUrl = options.openRouterBaseUrl;
    this.repairHandler = new AiderRepairHandler();
    this.verificationHarness = options.verificationHarness;

    // Default process runner using child_process (with lazy import to support non-node environments if needed)
    this.processRunner =
      options.processRunner ??
      (async (command, args, opts) => {
        const { spawn } = await import("child_process");
        const startTime = Date.now();

        return new Promise<AiderProcessResult>((resolve) => {
          let stdout = "";
          let stderr = "";

          const proc = spawn(command, args, {
            cwd: opts?.cwd || process.cwd(),
            env: { ...process.env, ...(opts?.env || {}) },
            shell: true,
          });

          // Register process in cancellation registry (REQ-SEC-02)
          processRegistry.register("aider-cli", proc, { command, args });

          proc.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
          });

          proc.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          proc.on("close", (code) => {
            resolve({
              stdout,
              stderr,
              exitCode: code ?? 0,
              durationMs: Date.now() - startTime,
            });
          });

          proc.on("error", (err) => {
            resolve({
              stdout,
              stderr: `${stderr}\n${err.message}`,
              exitCode: 1,
              durationMs: Date.now() - startTime,
            });
          });
        });
      });

    // Default verification runner
    this.verificationRunner =
      options.verificationRunner ??
      (async (command, cwd) => {
        const { exec } = await import("child_process");
        return new Promise<{ exitCode: number; output: string }>((resolve) => {
          exec(
            command,
            { cwd: cwd || process.cwd() },
            (error, stdout, stderr) => {
              const output = `${stdout}\n${stderr}`;
              const exitCode = error && typeof error.code === "number" ? error.code : error ? 1 : 0;
              resolve({ exitCode, output });
            }
          );
        });
      });

    // Default git rollback runner
    this.gitRollbackRunner =
      options.gitRollbackRunner ??
      (async (files, cwd) => {
        const { execSync } = await import("child_process");
        if (files.length > 0) {
          const fileArgs = files.map((f) => `"${f}"`).join(" ");
          execSync(`git checkout HEAD -- ${fileArgs}`, {
            cwd: cwd || process.cwd(),
            stdio: "ignore",
          });
        }
      });
  }

  /**
   * Validates whether the Aider CLI executable is available in the current environment.
   */
  public async validateEnvironment(): Promise<EngineValidationResult> {
    try {
      const result = await this.processRunner("aider", ["--version"]);
      if (result.exitCode === 0) {
        return {
          valid: true,
          engineName: this.engineName,
          version: result.stdout.trim() || "unknown",
          details: "Aider CLI executable verified successfully.",
        };
      }
      return {
        valid: false,
        engineName: this.engineName,
        details: `Aider CLI validation returned exit code ${result.exitCode}: ${result.stderr}`,
        missingRequirements: ["aider executable in PATH"],
      };
    } catch (error) {
      return {
        valid: false,
        engineName: this.engineName,
        details: error instanceof Error ? error.message : String(error),
        missingRequirements: ["aider executable in PATH"],
      };
    }
  }

  /**
   * Executes a coding task using Aider in headless batch mode.
   * If verification fails, orchestrates the 3-strike bounded repair loop.
   */
  public async executeTask(
    context: CodingTaskContext
  ): Promise<CodingTaskResult> {
    // 1. Validate context and target branch
    const validated = CodingTaskContextSchema.parse(context);
    if (validated.targetBranch !== "main") {
      throw new BranchSecurityViolationError(validated.targetBranch);
    }

    const allArtifacts: ExecutionArtifact[] = [];

    // 2. Synthesize initial command arguments
    const cliArgs = synthesizeAiderArgs(validated, {
      modelConfig: {
        model: this.defaultModel,
        apiBase: this.openRouterBaseUrl,
        apiKey: this.openRouterApiKey,
      },
    });

    // 3. Execute initial Aider batch pass
    let processResult = await this.processRunner("aider", cliArgs, {
      env: validated.environmentVariables,
    });

    let parsed = parseAiderOutput(
      processResult,
      validated.allowedFilePatterns
    );
    allArtifacts.push(...extractExecutionArtifacts(processResult, parsed));

    if (!parsed.success) {
      return {
        runId: validated.runId,
        status: "error",
        exitCode: processResult.exitCode || 1,
        commitHash: parsed.commitHash,
        diffPatch: parsed.diffPatch,
        testSummary: { passed: 0, failed: 1, skipped: 0, durationMs: processResult.durationMs },
        artifacts: allArtifacts,
        errorDetails: parsed.errorMessage || "Aider process encountered a fatal error.",
      };
    }

    // 4. Verification & 3-Strike Bounded Repair Loop
    const verificationCmd =
      (validated.metadata?.verificationCommand as string) || undefined;

    let testSummary: TestSummary = {
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: processResult.durationMs,
    };

    let verificationFailed = false;
    let verificationOutput = "";

    const runVerificationPass = async (): Promise<{
      failed: boolean;
      output: string;
    }> => {
      if (this.verificationHarness) {
        const vResult = await this.verificationHarness.runAll({
          customCommand: verificationCmd,
        });
        testSummary = vResult.summary;
        allArtifacts.push(...vResult.artifacts);
        if (vResult.status !== "passed") {
          return {
            failed: true,
            output:
              vResult.failureDetails ||
              vResult.stages
                .filter((s) => s.status === "failed")
                .map((s) => `${s.stage}: ${s.errorSummary || s.stderr}`)
                .join("\n"),
          };
        }
        return { failed: false, output: "" };
      }

      if (verificationCmd) {
        const v = await this.verificationRunner(verificationCmd);
        if (v.exitCode !== 0) {
          return { failed: true, output: v.output };
        }
      }

      return { failed: false, output: "" };
    };

    const initialVerification = await runVerificationPass();
    if (initialVerification.failed) {
      verificationFailed = true;
      verificationOutput = initialVerification.output;
    }

    if (verificationFailed) {
      // Verification failed — engage 3-strike bounded repair protocol
      let repairState = this.repairHandler.createInitialState(
        validated.maxRetries || 3
      );

      while (!repairState.isTerminated) {
        const { nextState, repairPrompt, shouldRollback } =
          this.repairHandler.recordStrike(
            repairState,
            verificationOutput,
            parsed.diffPatch
          );

        repairState = nextState;

        if (shouldRollback) {
          // Strike 3 reached: execute safe rollback
          try {
            await this.gitRollbackRunner(validated.allowedFilePatterns);
          } catch (rollbackErr) {
            // Note rollback error if any
            allArtifacts.push({
              name: "rollback-error.log",
              artifactType: "test_log",
              content: String(rollbackErr),
              mimeType: "text/plain",
            });
          }

          return {
            runId: validated.runId,
            status: "test_failure",
            exitCode: 1,
            commitHash: undefined,
            diffPatch: undefined,
            testSummary: {
              passed: 0,
              failed: 1,
              skipped: 0,
              durationMs: processResult.durationMs,
            },
            artifacts: allArtifacts,
            errorDetails: `3-strike bounded repair exhausted (${repairState.currentStrike}/${repairState.maxStrikes} strikes). Changes rolled back to base commit.`,
          };
        }

        // Execute repair pass with targeted prompt
        const repairArgs = synthesizeAiderArgs(validated, {
          modelConfig: {
            model: this.defaultModel,
            apiBase: this.openRouterBaseUrl,
            apiKey: this.openRouterApiKey,
          },
          message: repairPrompt,
        });

        processResult = await this.processRunner("aider", repairArgs, {
          env: validated.environmentVariables,
        });

        parsed = parseAiderOutput(
          processResult,
          validated.allowedFilePatterns
        );
        allArtifacts.push(...extractExecutionArtifacts(processResult, parsed));

        // Re-run verification
        const repairVerification = await runVerificationPass();
        if (!repairVerification.failed) {
          // Repair succeeded!
          testSummary = {
            passed: 1,
            failed: 0,
            skipped: 0,
            durationMs: processResult.durationMs,
          };
          break;
        } else {
          verificationOutput = repairVerification.output;
        }
      }
    }

    return {
      runId: validated.runId,
      status: "success",
      exitCode: 0,
      commitHash: parsed.commitHash,
      diffPatch: parsed.diffPatch,
      testSummary,
      artifacts: allArtifacts,
    };
  }
}
