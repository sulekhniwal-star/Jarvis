import { execFileSync } from "child_process";
import { DiffInspectionResult } from "./types";

interface InspectDiffOptions {
  cached?: boolean;
  ref?: string;
  cwd?: string;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "Private Key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "OpenAI / OpenRouter API Key",
    regex: /\bsk-(?:live-)?[a-zA-Z0-9_-]{24,}\b/,
  },
  {
    name: "GitHub Personal Access Token",
    regex: /\bghp_[a-zA-Z0-9]{36}\b/,
  },
  {
    name: "Slack Token",
    regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/,
  },
  {
    name: "JSON Web Token (JWT)",
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
  },
  {
    name: "Hardcoded Secret Assignment",
    regex: /(?:SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY|TELEGRAM_BOT_TOKEN)\s*=\s*['"]?[a-zA-Z0-9_\-\.]{16,}['"]?/i,
  },
];

/**
 * Inspects a git diff, parsing changed files, lines added/deleted, and scanning for credentials.
 */
export function inspectCommitDiff(options: InspectDiffOptions = {}): DiffInspectionResult {
  const cwd = options.cwd ?? process.cwd();
  const args = ["diff"];

  if (options.cached) {
    args.push("--cached");
  }

  if (options.ref) {
    args.push(options.ref);
  }

  let rawDiff = "";
  try {
    rawDiff = execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (error) {
    throw new Error(`Failed to execute git diff: ${(error as Error).message}`);
  }

  const lines = rawDiff.split("\n");
  const filesChangedSet = new Set<string>();
  let totalAdditions = 0;
  let totalDeletions = 0;
  const detectedPatterns: string[] = [];

  for (const line of lines) {
    if (line.startsWith("diff --git a/")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      if (match && match[2]) {
        filesChangedSet.add(match[2]);
      }
      continue;
    }

    // Only inspect additions for secrets (lines starting with '+' but not '+++')
    if (line.startsWith("+") && !line.startsWith("+++")) {
      totalAdditions++;
      const addedContent = line.substring(1);

      // Skip common placeholder markers
      if (
        addedContent.includes("placeholder-") ||
        addedContent.includes("sk-xxx") ||
        addedContent.includes("example")
      ) {
        continue;
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(addedContent)) {
          detectedPatterns.push(pattern.name);
        }
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      totalDeletions++;
    }
  }

  const uniqueDetected = Array.from(new Set(detectedPatterns));

  return {
    hasSecrets: uniqueDetected.length > 0,
    detectedPatterns: uniqueDetected,
    filesChanged: Array.from(filesChangedSet),
    totalAdditions,
    totalDeletions,
    rawDiff,
  };
}
