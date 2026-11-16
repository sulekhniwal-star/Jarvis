import { ExecutionArtifact } from "../types";
import { AiderProcessResult, ParsedAiderOutput } from "./types";

const COMMIT_SHA_PATTERNS = [
  /Commit\s+([0-9a-f]{7,40})/i,
  /commit\s+([0-9a-f]{7,40})/i,
  /\[[^\s\]]+\s+([0-9a-f]{7,40})\]/i,
  /Created\s+commit\s+([0-9a-f]{7,40})/i,
];

const ERROR_PATTERNS = [
  /AuthenticationError/i,
  /RateLimitError/i,
  /APIConnectionError/i,
  /ModelError/i,
  /SyntaxError/i,
  /Fatal error/i,
  /Permission denied/i,
];

/**
 * Parses raw CLI stdout/stderr from Aider into structured execution outputs.
 */
export function parseAiderOutput(
  result: AiderProcessResult,
  targetFiles: string[] = []
): ParsedAiderOutput {
  const combinedLogs = `${result.stdout}\n${result.stderr}`;

  // 1. Commit SHA extraction
  let commitHash: string | undefined;
  for (const pattern of COMMIT_SHA_PATTERNS) {
    const match = combinedLogs.match(pattern);
    if (match && match[1]) {
      commitHash = match[1];
      break;
    }
  }

  // 2. Diff patch extraction
  let diffPatch: string | undefined;
  const diffIndex = result.stdout.indexOf("diff --git");
  if (diffIndex !== -1) {
    diffPatch = result.stdout.slice(diffIndex).trim();
  } else {
    const unifiedIndex = result.stdout.indexOf("--- a/");
    if (unifiedIndex !== -1) {
      diffPatch = result.stdout.slice(unifiedIndex).trim();
    }
  }

  // 3. Modified files detection
  const filesModified: string[] = [];
  for (const file of targetFiles) {
    if (combinedLogs.includes(file)) {
      filesModified.push(file);
    }
  }
  // If targetFiles were specified and process succeeded without explicitly mentioning each, default to targetFiles
  if (filesModified.length === 0 && result.exitCode === 0) {
    filesModified.push(...targetFiles);
  }

  // 4. Failure detection
  let hasError = result.exitCode !== 0;
  let errorMessage: string | undefined;

  for (const errorPattern of ERROR_PATTERNS) {
    const errorMatch = combinedLogs.match(errorPattern);
    if (errorMatch) {
      hasError = true;
      errorMessage = `Aider execution failed with pattern: ${errorMatch[0]}`;
      break;
    }
  }

  if (result.exitCode !== 0 && !errorMessage) {
    errorMessage =
      result.stderr.trim() ||
      `Aider process exited with non-zero exit code ${result.exitCode}`;
  }

  return {
    commitHash,
    diffPatch,
    filesModified,
    success: !hasError,
    errorMessage,
  };
}

/**
 * Converts process output and parsed metadata into standard ExecutionArtifact objects.
 */
export function extractExecutionArtifacts(
  result: AiderProcessResult,
  parsed: ParsedAiderOutput
): ExecutionArtifact[] {
  const artifacts: ExecutionArtifact[] = [];

  // Primary execution stdout log
  if (result.stdout.trim().length > 0) {
    artifacts.push({
      name: "aider-stdout.log",
      artifactType: "build_log",
      content: result.stdout,
      mimeType: "text/plain",
    });
  }

  // Stderr execution log if present
  if (result.stderr.trim().length > 0) {
    artifacts.push({
      name: "aider-stderr.log",
      artifactType: "test_log",
      content: result.stderr,
      mimeType: "text/plain",
    });
  }

  // Diff patch artifact if captured
  if (parsed.diffPatch && parsed.diffPatch.length > 0) {
    artifacts.push({
      name: "changes.diff",
      artifactType: "diff",
      content: parsed.diffPatch,
      mimeType: "text/x-diff",
    });
  }

  return artifacts;
}

/**
 * Class wrapper for Aider output parser.
 */
export class AiderOutputParser {
  public parse(
    result: AiderProcessResult,
    targetFiles: string[] = []
  ): ParsedAiderOutput {
    return parseAiderOutput(result, targetFiles);
  }

  public extractArtifacts(
    result: AiderProcessResult,
    parsed: ParsedAiderOutput
  ): ExecutionArtifact[] {
    return extractExecutionArtifacts(result, parsed);
  }
}
