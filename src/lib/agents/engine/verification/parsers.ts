/**
 * Sensitive credential patterns for zero-secret-leakage compliance (NFR-SEC-02).
 */
const SECRET_PATTERNS = [
  /(?:SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|POSTGRES_PASSWORD|TELEGRAM_BOT_TOKEN|GITHUB_WEBHOOK_SECRET|OPENROUTER_API_KEY)[=:]\s*([^\s"']+)/gi,
  /(?:password|secret|token|api_key|apikey)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{12,})["']?/gi,
  /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/g,
  /(?:eyJhbGciOi[a-zA-Z0-9_\-\.]{40,})/g,
];

/**
 * Sanitizes stdout/stderr content to prevent secret leakage in test artifacts.
 */
export function sanitizeVerificationOutput(content: string): string {
  if (!content) return "";
  let sanitized = content;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match, captured) => {
      if (captured) {
        return match.replace(captured, "[REDACTED_SECRET]");
      }
      return "[REDACTED_SECRET]";
    });
  }
  return sanitized;
}

export interface VitestParseResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  failureSnippets: string[];
}

/**
 * Parses Vitest / Jest test runner stdout and stderr.
 */
export function parseVitestOutput(
  stdout: string,
  stderr: string = ""
): VitestParseResult {
  const combined = `${stdout}\n${stderr}`;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Pattern 1: Tests  2 failed | 5 passed (7)
  const failedAndPassedMatch = combined.match(
    /Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed/i
  );
  if (failedAndPassedMatch && failedAndPassedMatch[1] && failedAndPassedMatch[2]) {
    failed = parseInt(failedAndPassedMatch[1], 10);
    passed = parseInt(failedAndPassedMatch[2], 10);
  } else {
    // Pattern 2: Tests  7 passed (7)
    const passedMatch = combined.match(/Tests\s+(\d+)\s+passed/i);
    if (passedMatch && passedMatch[1]) {
      passed = parseInt(passedMatch[1], 10);
    }

    // Pattern 3: Tests  3 failed
    const failedMatch = combined.match(/Tests\s+(\d+)\s+failed/i);
    if (failedMatch && failedMatch[1]) {
      failed = parseInt(failedMatch[1], 10);
    }
  }

  // Check skipped: Tests  1 skipped
  const skippedMatch = combined.match(/(\d+)\s+skipped/i);
  if (skippedMatch && skippedMatch[1]) {
    skipped = parseInt(skippedMatch[1], 10);
  }

  // If no summary lines were matched, look for checkmarks / test lines
  if (passed === 0 && failed === 0) {
    const passedMarks = (combined.match(/✓\s+/g) || []).length;
    const failedMarks = (combined.match(/×\s+|FAIL\s+/g) || []).length;
    passed = passedMarks;
    failed = failedMarks;
  }

  // Extract failure snippets
  const failureSnippets: string[] = [];
  const failureHeaderMatch = combined.match(/⎯⎯⎯ Failed Tests [\s\S]*?(?=Test Files|\n\n\n|$)/);
  if (failureHeaderMatch) {
    failureSnippets.push(failureHeaderMatch[0].trim().slice(0, 1000));
  }

  return {
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    failureSnippets,
  };
}

export interface TypeScriptError {
  file: string;
  line: number;
  col: number;
  code: string;
  message: string;
}

export interface TypeScriptParseResult {
  errorCount: number;
  errors: TypeScriptError[];
}

/**
 * Parses tsc --noEmit compiler diagnostic output.
 */
export function parseTypeScriptOutput(output: string): TypeScriptParseResult {
  const errors: TypeScriptError[] = [];
  const lines = output.split("\n");

  const tsRegex = /(.+\.tsx?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/;

  for (const line of lines) {
    const match = line.match(tsRegex);
    if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
      errors.push({
        file: match[1].trim(),
        line: parseInt(match[2], 10),
        col: parseInt(match[3], 10),
        code: match[4].trim(),
        message: match[5].trim(),
      });
    }
  }

  return {
    errorCount: errors.length,
    errors,
  };
}

export interface ESLintParseResult {
  errorCount: number;
  warningCount: number;
  details: string[];
}

/**
 * Parses ESLint output.
 */
export function parseESLintOutput(output: string): ESLintParseResult {
  let errorCount = 0;
  let warningCount = 0;
  const details: string[] = [];

  // Match: 2 problems (2 errors, 0 warnings)
  const problemMatch = output.match(
    /(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/i
  );
  if (problemMatch && problemMatch[2] && problemMatch[3]) {
    errorCount = parseInt(problemMatch[2], 10);
    warningCount = parseInt(problemMatch[3], 10);
  } else {
    // Match standalone errors: 1 error
    const errMatch = output.match(/(\d+)\s+errors?/i);
    if (errMatch && errMatch[1]) {
      errorCount = parseInt(errMatch[1], 10);
    }
    const warnMatch = output.match(/(\d+)\s+warnings?/i);
    if (warnMatch && warnMatch[1]) {
      warningCount = parseInt(warnMatch[1], 10);
    }
  }

  // Collect error lines
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes("error") && !line.includes("problems")) {
      details.push(line.trim());
    }
  }

  return {
    errorCount,
    warningCount,
    details: details.slice(0, 10),
  };
}

export interface NextBuildParseResult {
  success: boolean;
  errorCount: number;
  summary: string;
}

/**
 * Parses Next.js production build compiler output.
 */
export function parseNextBuildOutput(output: string): NextBuildParseResult {
  const isSuccess =
    output.includes("Compiled successfully") ||
    output.includes("Generating static pages") ||
    output.includes("Finalizing page optimization");

  const hasFailed =
    output.includes("Failed to compile") ||
    output.includes("Build failed because of webpack errors") ||
    output.includes("Type error:");

  let errorCount = 0;
  if (hasFailed) {
    errorCount = (output.match(/Type error:|Failed to compile|Error:/g) || []).length;
    if (errorCount === 0) errorCount = 1;
  }

  let summary = "Build completed successfully.";
  if (hasFailed) {
    const errorLine = output
      .split("\n")
      .map((l) => l.trim())
      .find(
        (l) =>
          l.startsWith("Type error:") ||
          l.includes("Type error:") ||
          l.startsWith("Error:") ||
          (l.includes("Failed to compile") && !output.includes("Type error:"))
      );
    summary = errorLine ? errorLine.trim() : "Next.js production build failed.";
  }

  return {
    success: !hasFailed && isSuccess,
    errorCount,
    summary,
  };
}
