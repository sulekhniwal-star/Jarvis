import { FailureCategory, FailureDiagnostic } from "./types";

/**
 * Multi-Stage Verification Failure Diagnostic Analyzer (REQ-VR-04).
 * Parses raw verification and compiler logs into structured diagnostics.
 */
export class FailureAnalyzer {
  /**
   * Analyzes raw verification failure output and classifies the root cause.
   */
  public analyze(rawOutput: string, stageName?: string): FailureDiagnostic {
    const text = rawOutput || "";
    const stage = stageName || this.detectStage(text);

    const category = this.classifyCategory(text, stage);
    const affectedFiles = this.extractAffectedFiles(text);
    const errorSnippets = this.extractErrorSnippets(text);
    const primaryError = this.extractPrimaryError(text, errorSnippets);
    const suggestedStrategy = this.deriveSuggestedStrategy(category);

    return {
      category,
      stage,
      primaryError,
      affectedFiles,
      errorSnippets,
      suggestedStrategy,
    };
  }

  private detectStage(text: string): string {
    if (text.includes("Secret scan security gate failed") || text.includes("secret-scanner")) {
      return "secrets";
    }
    if (text.includes("Diff inspection quality gate failed") || text.includes("diff-inspector")) {
      return "diff";
    }
    if (text.includes("error TS") || text.includes("tsc --noEmit") || text.includes("TypeScript compiler")) {
      return "typecheck";
    }
    if (text.includes("ESLint") || text.includes("@typescript-eslint/")) {
      return "lint";
    }
    if (text.includes("vitest") || text.includes("AssertionError") || text.includes("Tests ") || text.includes("FAIL ")) {
      return "test";
    }
    if (text.includes("Failed to compile") || text.includes("next build")) {
      return "build";
    }
    return "custom";
  }

  private classifyCategory(text: string, stage: string): FailureCategory {
    // 1. Secret leakage
    if (
      stage === "secrets" ||
      text.includes("Secret scan security gate failed") ||
      text.includes("Detected sensitive patterns") ||
      text.includes("[REDACTED_SECRET:")
    ) {
      return "secret_leak_violation";
    }

    // 2. Diff boundary violation
    if (
      stage === "diff" ||
      text.includes("Diff inspection quality gate failed") ||
      text.includes("UNAUTHORIZED_FILE_MUTATION") ||
      text.includes("UNAUTHORIZED_FILE_DELETION") ||
      text.includes("FORBIDDEN_FILE_PATTERN") ||
      text.includes("SINGLE_FILE_CHURN_LIMIT_EXCEEDED") ||
      text.includes("TOTAL_CHURN_LIMIT_EXCEEDED")
    ) {
      return "diff_boundary_violation";
    }

    // 3. TypeScript / Syntax errors
    if (
      stage === "typecheck" ||
      text.includes("error TS") ||
      text.includes("Type error:") ||
      text.includes("TypeScript compiler error")
    ) {
      return "syntax_type_error";
    }

    // 4. ESLint / Lint errors
    if (
      stage === "lint" ||
      text.includes("ESLint error") ||
      text.includes("@typescript-eslint/")
    ) {
      return "lint_violation";
    }

    // 5. Test assertion failures
    if (
      stage === "test" ||
      text.includes("AssertionError") ||
      text.includes("FAIL ") ||
      text.includes("Expected:") ||
      text.includes("expected ")
    ) {
      return "test_assertion_failure";
    }

    // 6. Build failure
    if (
      stage === "build" ||
      text.includes("Failed to compile") ||
      text.includes("Build error")
    ) {
      return "build_failure";
    }

    return "runtime_exception";
  }

  private extractAffectedFiles(text: string): string[] {
    const files = new Set<string>();
    const lines = text.split("\n");

    const filePathRegex =
      /(?:^|\s|`|'|")([a-zA-Z0-9_\-\.\/]+\.(?:tsx|ts|jsx|js|json|md|css))(?::\d+)?/g;

    for (const line of lines) {
      // Look for FAIL / error / file markers
      const lower = line.toLowerCase();
      if (
        lower.includes("error") ||
        line.includes("FAIL") ||
        line.includes("in ") ||
        line.includes("file ") ||
        line.includes("found in")
      ) {
        let match: RegExpExecArray | null;
        while ((match = filePathRegex.exec(line)) !== null) {
          const raw = match[1];
          if (raw && !raw.startsWith("node_modules/") && !raw.includes("webpack")) {
            const cleanPath = raw.replace(/\\/g, "/").replace(/^\.\//, "").trim();
            files.add(cleanPath);
          }
        }
      }
    }

    return Array.from(files).slice(0, 10);
  }

  private extractErrorSnippets(text: string): string[] {
    const snippets: string[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      if (
        line.startsWith("FAIL ") ||
        line.startsWith("AssertionError:") ||
        line.includes("error TS") ||
        line.includes("Type error:") ||
        line.startsWith("Expected:") ||
        line.startsWith("Received:") ||
        line.includes("Error:") ||
        line.includes("gate failed:")
      ) {
        snippets.push(line);
      }
    }

    return snippets.slice(0, 5);
  }

  private extractPrimaryError(text: string, snippets: string[]): string {
    if (snippets.length > 0 && snippets[0]) {
      return snippets[0];
    }

    const firstNonEmpty = text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("==="));

    return firstNonEmpty || "Unknown verification error encountered.";
  }

  private deriveSuggestedStrategy(category: FailureCategory): string {
    switch (category) {
      case "syntax_type_error":
        return "Align parameter and return types with existing interface definitions, check for optional or undefined properties, and resolve compiler errors.";
      case "test_assertion_failure":
        return "Review the test expectations and assertions, ensuring edge cases and return contracts are correctly handled.";
      case "lint_violation":
        return "Fix formatting, remove unused imports/variables, and conform to repository ESLint rules.";
      case "build_failure":
        return "Address bundling or page generation errors preventing Next.js production compilation.";
      case "diff_boundary_violation":
        return "Revert changes to files outside the declared modification scope and remove unauthorized file deletions.";
      case "secret_leak_violation":
        return "Remove hardcoded credentials or high-entropy tokens. Replace with environment variable lookups or mock values for tests.";
      case "runtime_exception":
        return "Inspect the stack trace to eliminate uncaught exceptions or unexpected execution failures.";
    }
  }
}

export const failureAnalyzer = new FailureAnalyzer();
