export type FailureCategory =
  | "syntax_type_error"
  | "test_assertion_failure"
  | "lint_violation"
  | "build_failure"
  | "diff_boundary_violation"
  | "secret_leak_violation"
  | "runtime_exception";

export interface FailureDiagnostic {
  category: FailureCategory;
  stage: string;
  primaryError: string;
  affectedFiles: string[];
  errorSnippets: string[];
  suggestedStrategy: string;
}

export interface RepairStrikeRecord {
  strikeNumber: 1 | 2 | 3;
  diagnostic: FailureDiagnostic;
  prompt: string;
  diffSnapshot?: string;
  timestamp: string;
}

export interface RepairLoopState {
  currentStrike: number;
  maxStrikes: number;
  isTerminated: boolean;
  preRunCommitSha?: string;
  history: RepairStrikeRecord[];
}
