import { CodingTaskContext, CodingTaskResult, EngineValidationResult } from "../types";
import { ISandboxRunner, SandboxMode } from "./types";
import { GitHubActionsSandboxRunner } from "./github-actions-runner";
import { LocalSandboxRunner } from "./local-sandbox-runner";

export interface SandboxOrchestratorOptions {
  githubRunner?: ISandboxRunner;
  localRunner?: ISandboxRunner;
  preferredMode?: SandboxMode;
}

/**
 * Orchestrator dynamically managing and dispatching execution between
 * GitHub Actions ephemeral runners and local process fallbacks (REQ-EX-03).
 */
export class SandboxOrchestrator {
  private githubRunner: ISandboxRunner;
  private localRunner: ISandboxRunner;
  private preferredMode: SandboxMode;

  constructor(options: SandboxOrchestratorOptions = {}) {
    this.githubRunner = options.githubRunner ?? new GitHubActionsSandboxRunner();
    this.localRunner = options.localRunner ?? new LocalSandboxRunner();
    this.preferredMode = options.preferredMode || "auto";
  }

  /**
   * Resolves the active runner according to requested mode or environment health checks.
   */
  public async getActiveRunner(requestedMode?: SandboxMode): Promise<ISandboxRunner> {
    const targetMode = requestedMode || this.preferredMode;

    if (targetMode === "github_actions") {
      return this.githubRunner;
    }

    if (targetMode === "local_process" || targetMode === "local_docker") {
      return this.localRunner;
    }

    // "auto" mode: check if GitHub Actions is viable
    try {
      const ghCheck = await this.githubRunner.validateEnvironment();
      if (ghCheck.valid) {
        return this.githubRunner;
      }
    } catch {
      // Fallback
    }

    return this.localRunner;
  }

  /**
   * Executes a task using the resolved active sandbox runner.
   */
  public async execute(
    context: CodingTaskContext,
    mode?: SandboxMode
  ): Promise<CodingTaskResult> {
    const runner = await this.getActiveRunner(mode);
    return runner.execute(context);
  }

  /**
   * Returns diagnostic status of all available sandbox runners.
   */
  public async getDiagnostics(): Promise<{
    activeMode: SandboxMode;
    githubRunner: EngineValidationResult;
    localRunner: EngineValidationResult;
  }> {
    const activeRunner = await this.getActiveRunner();
    const githubRunner = await this.githubRunner.validateEnvironment();
    const localRunner = await this.localRunner.validateEnvironment();

    return {
      activeMode: activeRunner.mode,
      githubRunner,
      localRunner,
    };
  }
}

/**
 * Shared singleton instance of SandboxOrchestrator.
 */
export const sandboxOrchestrator = new SandboxOrchestrator();
