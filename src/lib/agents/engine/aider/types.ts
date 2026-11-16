/**
 * Aider model configuration settings for LLM routing and API endpoints.
 */
export interface AiderModelConfig {
  model: string;
  apiBase?: string;
  apiKey?: string;
  editFormat?: string;
}

/**
 * Execution options passed to Aider CLI command builder.
 */
export interface AiderCliOptions {
  modelConfig: AiderModelConfig;
  yesAlways?: boolean;
  autoCommits?: boolean;
  commitPrompt?: string;
  readOnlyFiles?: string[];
  targetFiles: string[];
  message?: string;
  messageFile?: string;
  workingDirectory?: string;
  extraArgs?: string[];
}

/**
 * Low-level process execution result from running the Aider CLI.
 */
export interface AiderProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * High-level parsed output extracted from Aider logs and Git working state.
 */
export interface ParsedAiderOutput {
  commitHash?: string;
  diffPatch?: string;
  filesModified: string[];
  success: boolean;
  errorMessage?: string;
}

/**
 * Single strike snapshot in the 3-strike bounded repair protocol.
 */
export interface RepairStrike {
  strikeNumber: 1 | 2 | 3;
  errorDetails: string;
  diffSnapshot?: string;
  instructions: string;
  timestamp: string;
}

/**
 * State of the 3-strike bounded repair loop.
 */
export interface RepairState {
  currentStrike: number;
  maxStrikes: number;
  isTerminated: boolean;
  history: RepairStrike[];
}
