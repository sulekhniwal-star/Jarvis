export interface BranchValidationResult {
  isValid: boolean;
  currentBranch: string;
  error?: string;
}

export interface WorkingTreeStatus {
  isClean: boolean;
  modified: string[];
  untracked: string[];
  staged: string[];
}

export interface CommandValidationResult {
  isAllowed: boolean;
  reason?: string;
  violatedRule?: string;
}

export interface GitGuardOptions {
  cwd?: string;
  throwOnError?: boolean;
}

export interface DiffInspectionResult {
  hasSecrets: boolean;
  detectedPatterns: string[];
  filesChanged: string[];
  totalAdditions: number;
  totalDeletions: number;
  rawDiff: string;
}

export class GitPolicyViolationError extends Error {
  constructor(message: string, public readonly rule: string) {
    super(`[Git Policy Violation] ${message} (Rule: ${rule})`);
    this.name = "GitPolicyViolationError";
  }
}

export interface PrePushCommitSummary {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
}

export interface PrePushValidationOptions {
  cwd?: string;
  remoteRef?: string;
  skipSecretScan?: boolean;
  gitExec?: (args: string[]) => string;
}

export interface PrePushValidationResult {
  isReady: boolean;
  activeBranch: string;
  isClean: boolean;
  aheadCount: number;
  behindCount: number;
  remoteRef: string;
  headCommitSha: string;
  headCommitMessage: string;
  commits: PrePushCommitSummary[];
  filesChanged: string[];
  hasSecrets: boolean;
  detectedSecretPatterns: string[];
  errors: string[];
}

