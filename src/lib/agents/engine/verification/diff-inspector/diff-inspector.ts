import {
  DiffFile,
  DiffInspectionReport,
  DiffQualityMetrics,
  DiffViolation,
} from "./types";
import { parseUnifiedDiff } from "./diff-parser";
import { validateFileBoundaries } from "./boundary-validator";
import { scoreDiffQuality } from "./quality-scorer";

export interface InspectOptions {
  allowedFilePatterns?: string[];
  allowDeletions?: boolean;
}

/**
 * Unified Diff Inspector & Quality Gate (REQ-VR-02).
 */
export class DiffInspector {
  /**
   * Inspects a git diff patch against file boundary rules and quality heuristics.
   */
  public inspect(
    rawDiff: string,
    options: InspectOptions = {}
  ): DiffInspectionReport {
    const files = parseUnifiedDiff(rawDiff);
    const boundaryViolations = validateFileBoundaries(
      files,
      options.allowedFilePatterns,
      options.allowDeletions
    );
    const { metrics, violations: qualityViolations } = scoreDiffQuality(files);

    const allViolations = [...boundaryViolations, ...qualityViolations];
    const passed = !allViolations.some((v) => v.severity === "blocker");

    const markdownSummary = this.generateMarkdownSummary(
      passed,
      metrics,
      allViolations,
      files
    );

    return {
      passed,
      metrics,
      violations: allViolations,
      files,
      markdownSummary,
    };
  }

  /**
   * Formats a clean Markdown summary report for Web Dashboard, Telegram, and audit logs.
   */
  public generateMarkdownSummary(
    passed: boolean,
    metrics: DiffQualityMetrics,
    violations: DiffViolation[],
    files: DiffFile[]
  ): string {
    const statusEmoji = passed ? "✅" : "❌";
    const statusText = passed ? "PASSED" : "BLOCKED";
    const lines: string[] = [];

    lines.push(`# ${statusEmoji} Diff Inspection Quality Report (${statusText})`);
    lines.push(
      `- **Files Changed:** ${metrics.filesCount} | **Additions:** +${metrics.additions} | **Deletions:** -${metrics.deletions}`
    );
    lines.push(
      `- **Total Churn:** ${metrics.totalChurn} lines | **Risk Tier:** \`${metrics.riskTier.toUpperCase()}\``
    );

    if (metrics.debugResidueCount > 0) {
      lines.push(
        `- **Debug Residue:** ⚠️ ${metrics.debugResidueCount} instance(s) detected`
      );
    }

    // Violations section
    if (violations.length > 0) {
      lines.push("\n## Policy Violations & Quality Notices");
      for (const violation of violations) {
        const icon = violation.severity === "blocker" ? "🛑" : "⚠️";
        const fileRef = violation.file ? ` (\`${violation.file}\`)` : "";
        lines.push(
          `- ${icon} **${violation.code}** [${violation.severity.toUpperCase()}]: ${violation.message}${fileRef}`
        );
      }
    }

    // Changed files table
    if (files.length > 0) {
      lines.push("\n## Changed Files");
      for (const file of files.slice(0, 10)) {
        const filePath = file.newPath || file.oldPath || "unknown";
        lines.push(
          `- \`${file.status}\`: \`${filePath}\` (+${file.additions}/-${file.deletions})`
        );
      }
      if (files.length > 10) {
        lines.push(`- ... and ${files.length - 10} more files`);
      }
    }

    return lines.join("\n");
  }
}

export const diffInspector = new DiffInspector();
