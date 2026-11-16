import {
  CodingTaskContext,
  CodingTaskResult,
  EngineValidationResult,
  CodingEngineError,
} from "../types";

/**
 * Supported execution environments for the coding sandbox.
 */
export type SandboxMode =
  | "github_actions"
  | "local_process"
  | "local_docker"
  | "auto";

/**
 * Configuration options for sandbox runners.
 */
export interface SandboxExecutionConfig {
  mode?: SandboxMode;
  pollIntervalMs?: number;
  timeoutMs?: number;
  ephemeralWorkspaceRoot?: string;
  workflowFileName?: string;
  owner?: string;
  repo?: string;
}

/**
 * Universal interface for ephemeral sandbox runners.
 */
export interface ISandboxRunner {
  readonly mode: SandboxMode;
  execute(context: CodingTaskContext): Promise<CodingTaskResult>;
  validateEnvironment(): Promise<EngineValidationResult>;
}

/**
 * Error class thrown when sandbox execution or dispatch fails.
 */
export class SandboxRunnerError extends CodingEngineError {
  constructor(message: string) {
    super(message);
    this.name = "SandboxRunnerError";
  }
}
