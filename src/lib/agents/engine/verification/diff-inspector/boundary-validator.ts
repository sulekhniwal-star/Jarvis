import { DiffFile, DiffViolation } from "./types";

/**
 * Normalizes file path to standard forward-slash format without leading './'.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

/**
 * Checks if a file path matches an allowed pattern (exact, prefix, or wildcard).
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  const normFile = normalizePath(filePath);
  const normPattern = normalizePath(pattern);

  // Exact match
  if (normFile === normPattern) {
    return true;
  }

  // Directory prefix match (e.g., 'src/components/' or 'src/components')
  if (
    normPattern.endsWith("/") &&
    normFile.startsWith(normPattern)
  ) {
    return true;
  }
  if (normFile.startsWith(`${normPattern}/`)) {
    return true;
  }

  // Glob pattern conversion (e.g., 'src/**/*.ts' or '*.tsx')
  if (normPattern.includes("*")) {
    const escaped = normPattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/(?<!\.)\*/g, "[^/]*");
    const regex = new RegExp(`^${escaped}$`);
    return regex.test(normFile);
  }

  return false;
}

export const FORBIDDEN_FILE_PATTERNS = [
  /(?:^|\/)\.env(?:\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.cert$/i,
  /\.crt$/i,
  /id_rsa/i,
];

/**
 * Validates that all changed files conform to allowed boundaries and policies.
 */
export function validateFileBoundaries(
  files: DiffFile[],
  allowedPatterns?: string[],
  allowDeletions: boolean = false
): DiffViolation[] {
  const violations: DiffViolation[] = [];

  for (const file of files) {
    const filePath = file.newPath || file.oldPath || "unknown";
    const normPath = normalizePath(filePath);

    // 0. Check for forbidden file extensions/patterns (security blocker)
    const isForbidden = FORBIDDEN_FILE_PATTERNS.some((pattern) =>
      pattern.test(normPath)
    );
    if (isForbidden) {
      violations.push({
        code: "FORBIDDEN_FILE_PATTERN",
        message: `File '${normPath}' contains forbidden pattern or extension and cannot be touched by agent runs.`,
        file: normPath,
        severity: "blocker",
      });
    }

    // 1. Check for unauthorized file deletions
    if (file.status === "deleted" && !allowDeletions) {
      violations.push({
        code: "UNAUTHORIZED_FILE_DELETION",
        message: `File '${normPath}' was deleted without explicit deletion authorization.`,
        file: normPath,
        severity: "blocker",
      });
    }

    // 2. Check allowed file patterns if specified
    if (allowedPatterns && allowedPatterns.length > 0) {
      const isAllowed = allowedPatterns.some((pattern) =>
        matchesPattern(normPath, pattern)
      );

      if (!isAllowed) {
        violations.push({
          code: "UNAUTHORIZED_FILE_MUTATION",
          message: `File '${normPath}' is outside the authorized file modification boundary.`,
          file: normPath,
          severity: "blocker",
        });
      }
    }
  }

  return violations;
}
