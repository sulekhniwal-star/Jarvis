import {
  DiffFile,
  DiffQualityMetrics,
  DiffRiskTier,
  DiffViolation,
} from "./types";

const DEBUG_RESIDUE_PATTERNS = [
  { name: "console.log", regex: /\bconsole\.log\s*\(/ },
  { name: "debugger", regex: /\bdebugger\s*;?/ },
  { name: "print() call", regex: /\bprint\s*\(/ },
  { name: "temporary TODO/FIXME", regex: /(?:TODO|FIXME):\s*(?:remove|temporary|temp|hack)/i },
];

/**
 * Evaluates code quality, churn metrics, and risk tier for a set of diff files.
 */
export function scoreDiffQuality(files: DiffFile[]): {
  metrics: DiffQualityMetrics;
  violations: DiffViolation[];
} {
  let totalAdditions = 0;
  let totalDeletions = 0;
  let debugResidueCount = 0;
  const violations: DiffViolation[] = [];

  for (const file of files) {
    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    const filePath = file.newPath || file.oldPath || "unknown";
    const fileChurn = file.additions + file.deletions;

    // Single file churn check
    if (file.additions > 500) {
      violations.push({
        code: "EXCESSIVE_FILE_CHURN",
        message: `File '${filePath}' has ${file.additions} added lines (>500 limit). High risk of unreviewed complexity.`,
        file: filePath,
        severity: "warning",
      });
    }

    if (fileChurn > 800) {
      violations.push({
        code: "SINGLE_FILE_CHURN_LIMIT_EXCEEDED",
        message: `File '${filePath}' churn (${fileChurn} lines) exceeds maximum allowed single-file limit (800 lines).`,
        file: filePath,
        severity: "blocker",
      });
    }

    // Inspect added lines for debug residue
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") {
          for (const pattern of DEBUG_RESIDUE_PATTERNS) {
            if (pattern.regex.test(line.content)) {
              debugResidueCount++;
              violations.push({
                code: "DEBUG_RESIDUE_DETECTED",
                message: `Potential debug residue detected in '${filePath}': found '${pattern.name}' on line +${line.newLine ?? "?"}.`,
                file: filePath,
                severity: "warning",
              });
            }
          }
        }
      }
    }
  }

  const filesCount = files.length;
  const totalChurn = totalAdditions + totalDeletions;

  // Determine Risk Tier
  let riskTier: DiffRiskTier = "low";
  if (totalChurn > 2000 || filesCount > 50) {
    riskTier = "extreme";
    violations.push({
      code: "TOTAL_CHURN_LIMIT_EXCEEDED",
      message: `Total diff churn (${totalChurn} lines across ${filesCount} files) exceeds maximum allowable limit (2000 lines / 50 files).`,
      severity: "blocker",
    });
  } else if (totalChurn > 800 || filesCount > 10) {
    riskTier = "extreme";
    violations.push({
      code: "EXTREME_DIFF_CHURN",
      message: `Total diff churn (${totalChurn} lines across ${filesCount} files) exceeds extreme review thresholds.`,
      severity: "warning",
    });
  } else if (totalChurn > 300 || filesCount > 6) {
    riskTier = "high";
  } else if (totalChurn > 100 || filesCount > 3) {
    riskTier = "medium";
  }

  const metrics: DiffQualityMetrics = {
    filesCount,
    additions: totalAdditions,
    deletions: totalDeletions,
    totalChurn,
    riskTier,
    debugResidueCount,
  };

  return {
    metrics,
    violations,
  };
}
