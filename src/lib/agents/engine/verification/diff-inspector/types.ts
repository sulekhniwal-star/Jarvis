export type DiffFileStatus = "added" | "modified" | "deleted" | "renamed";

export type DiffLineType = "add" | "delete" | "context";

export interface DiffHunkLine {
  type: DiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffHunkLine[];
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  status: DiffFileStatus;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export type DiffRiskTier = "low" | "medium" | "high" | "extreme";

export interface DiffQualityMetrics {
  filesCount: number;
  additions: number;
  deletions: number;
  totalChurn: number;
  riskTier: DiffRiskTier;
  debugResidueCount: number;
}

export type DiffViolationSeverity = "blocker" | "warning";

export interface DiffViolation {
  code: string;
  message: string;
  file?: string;
  severity: DiffViolationSeverity;
}

export interface DiffInspectionReport {
  passed: boolean;
  metrics: DiffQualityMetrics;
  violations: DiffViolation[];
  files: DiffFile[];
  markdownSummary: string;
}
