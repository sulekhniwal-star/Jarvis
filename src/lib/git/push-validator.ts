import { execFileSync } from "child_process";
import { SECRET_PATTERNS } from "./diff";
import {
  PrePushCommitSummary,
  PrePushValidationOptions,
  PrePushValidationResult,
} from "./types";

/**
 * Validates repository invariants before requesting or executing a remote git push.
 * Strictly verifies main-only branch policy, working tree cleanliness, ahead commit count,
 * and zero secrets in outgoing diffs (REQ-GH-03, NFR-SEC-01).
 */
export function validatePrePush(
  options: PrePushValidationOptions = {}
): PrePushValidationResult {
  const cwd = options.cwd ?? process.cwd();
  const remoteRef = options.remoteRef ?? "origin/main";
  const errors: string[] = [];

  const defaultGitExec = (args: string[]): string =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

  const gitExec = options.gitExec ?? defaultGitExec;

  // 1. Branch Verification (Prompt §1, NFR-SEC-01)
  let activeBranch = "";
  try {
    activeBranch = gitExec(["branch", "--show-current"]).trim();
  } catch (err) {
    activeBranch = "UNKNOWN";
    errors.push(`Failed to detect current branch: ${(err as Error).message}`);
  }

  if (activeBranch !== "main") {
    errors.push(
      `Active branch is '${activeBranch || "DETACHED_HEAD"}', but only 'main' is permitted.`
    );
  }

  // 2. Working Tree Cleanliness
  let isClean = false;
  try {
    const statusOutput = gitExec(["status", "--porcelain"]);
    const lines = statusOutput
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    const dirtyFiles: string[] = [];
    for (const line of lines) {
      const file = line.substring(3).trim();
      if (file) dirtyFiles.push(file);
    }

    isClean = lines.length === 0;
    if (!isClean) {
      errors.push(
        `Working tree has uncommitted changes: ${dirtyFiles.join(", ")}`
      );
    }
  } catch (err) {
    errors.push(`Failed to inspect working tree status: ${(err as Error).message}`);
  }

  // 3. HEAD Commit Info
  let headCommitSha = "";
  let headCommitMessage = "";
  try {
    const headOutput = gitExec(["log", "-1", "--format=%H%x09%s"]).trim();
    if (headOutput) {
      const parts = headOutput.split("\t");
      headCommitSha = parts[0] || "";
      headCommitMessage = parts[1] || "";
    }
  } catch (err) {
    errors.push(`Failed to read HEAD commit: ${(err as Error).message}`);
  }

  // 4. Remote Divergence (Ahead / Behind)
  let aheadCount = 0;
  let behindCount = 0;
  try {
    const aheadRaw = gitExec(["rev-list", "--count", `${remoteRef}..HEAD`]).trim();
    aheadCount = parseInt(aheadRaw, 10) || 0;

    if (aheadCount === 0) {
      errors.push("No local commits ahead of remote to push.");
    }
  } catch (err) {
    errors.push(`Failed to calculate ahead commits against '${remoteRef}': ${(err as Error).message}`);
  }

  try {
    const behindRaw = gitExec(["rev-list", "--count", `HEAD..${remoteRef}`]).trim();
    behindCount = parseInt(behindRaw, 10) || 0;

    if (behindCount > 0) {
      errors.push(
        `Local branch is behind '${remoteRef}' by ${behindCount} commits. Pull or sync required.`
      );
    }
  } catch (err) {
    if (!errors.some((e) => e.includes(remoteRef))) {
      errors.push(`Failed to calculate behind commits against '${remoteRef}': ${(err as Error).message}`);
    }
  }

  // 5. Commits to Push & Changed Files
  const commits: PrePushCommitSummary[] = [];
  const filesChanged: string[] = [];
  const detectedSecretPatterns: string[] = [];
  let hasSecrets = false;

  if (aheadCount > 0) {
    try {
      const logOutput = gitExec([
        "log",
        `${remoteRef}..HEAD`,
        "--format=%H%x09%h%x09%s%x09%an%x09%aI",
      ]).trim();

      if (logOutput) {
        const lines = logOutput.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
          const [sha, shortSha, message, author, date] = line.split("\t");
          if (sha && shortSha) {
            commits.push({
              sha,
              shortSha,
              message: message || "",
              author: author || "",
              date: date || "",
            });
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to retrieve outgoing commits: ${(err as Error).message}`);
    }

    try {
      const filesOutput = gitExec(["diff", "--name-only", `${remoteRef}..HEAD`]).trim();

      if (filesOutput) {
        const lines = filesOutput
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        filesChanged.push(...lines);
      }
    } catch (err) {
      errors.push(`Failed to retrieve changed files in diff: ${(err as Error).message}`);
    }

    // 6. Secret Detection in Outgoing Diff
    if (!options.skipSecretScan) {
      try {
        const rawDiff = gitExec(["diff", `${remoteRef}..HEAD`]);
        const lines = rawDiff.split("\n");
        const detectedSet = new Set<string>();

        for (const line of lines) {
          if (line.startsWith("+") && !line.startsWith("+++")) {
            const addedContent = line.substring(1);

            // Skip typical placeholders
            if (
              addedContent.includes("placeholder-") ||
              addedContent.includes("sk-xxx") ||
              addedContent.includes("example")
            ) {
              continue;
            }

            for (const pattern of SECRET_PATTERNS) {
              if (pattern.regex.test(addedContent)) {
                detectedSet.add(pattern.name);
              }
            }
          }
        }

        if (detectedSet.size > 0) {
          hasSecrets = true;
          detectedSecretPatterns.push(...Array.from(detectedSet));
          errors.push(
            `Detected sensitive patterns in outgoing commits: ${detectedSecretPatterns.join(", ")}`
          );
        }
      } catch (err) {
        errors.push(`Failed to perform secret inspection on diff: ${(err as Error).message}`);
      }
    }
  }

  const isReady =
    errors.length === 0 &&
    !hasSecrets &&
    aheadCount > 0 &&
    behindCount === 0 &&
    isClean &&
    activeBranch === "main";

  return {
    isReady,
    activeBranch,
    isClean,
    aheadCount,
    behindCount,
    remoteRef,
    headCommitSha,
    headCommitMessage,
    commits,
    filesChanged,
    hasSecrets,
    detectedSecretPatterns,
    errors,
  };
}
