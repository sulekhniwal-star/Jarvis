import { execFileSync } from "child_process";
import {
  BranchValidationResult,
  WorkingTreeStatus,
  CommandValidationResult,
  GitGuardOptions,
  GitPolicyViolationError,
} from "./types";

/**
 * Gets the current active Git branch name.
 */
export function getCurrentBranch(cwd: string = process.cwd()): string {
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }).trim();

    return branch;
  } catch (error) {
    throw new Error(`Failed to determine current Git branch: ${(error as Error).message}`);
  }
}

/**
 * Verifies that the repository is strictly on the 'main' branch.
 * Any other branch violates the mandatory Main-Only branch policy (Prompt §1, REQ-ENV-02).
 */
export function verifyActiveBranchIsMain(
  cwd: string = process.cwd(),
  options: GitGuardOptions = {}
): BranchValidationResult {
  const currentBranch = getCurrentBranch(cwd);

  if (currentBranch === "main") {
    return {
      isValid: true,
      currentBranch,
    };
  }

  const error = `Active branch is '${currentBranch || "DETACHED_HEAD"}', but only 'main' is permitted.`;

  if (options.throwOnError) {
    throw new GitPolicyViolationError(error, "MANDATORY_MAIN_ONLY_BRANCH_POLICY");
  }

  return {
    isValid: false,
    currentBranch,
    error,
  };
}

/**
 * Parses git status --porcelain output into structured status lists.
 */
export function getWorkingTreeStatus(cwd: string = process.cwd()): WorkingTreeStatus {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

    const lines = output
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const x = line.charAt(0);
      const y = line.charAt(1);
      const file = line.substring(3).trim();

      if (x === "?" && y === "?") {
        untracked.push(file);
      } else {
        if (x !== " " && x !== "?") {
          staged.push(file);
        }
        if (y !== " " && y !== "?") {
          modified.push(file);
        }
      }
    }

    return {
      isClean: lines.length === 0,
      modified,
      untracked,
      staged,
    };
  } catch (error) {
    throw new Error(`Failed to determine working tree status: ${(error as Error).message}`);
  }
}

/**
 * Validates a git command or CLI argument array against the project's strict branch and safety rules.
 */
export function validateGitCommand(command: string | string[]): CommandValidationResult {
  const rawArgs = Array.isArray(command)
    ? command
    : command.trim().split(/\s+/);

  // Strip leading 'git' executable if present
  const args = rawArgs[0] === "git" ? rawArgs.slice(1) : rawArgs;
  const cmdString = args.join(" ").toLowerCase();

  // 1. Force push rejection (NFR-SEC-01)
  if (
    cmdString.includes("push") &&
    (cmdString.includes("--force") ||
      cmdString.includes("-f") ||
      cmdString.includes("--force-with-lease"))
  ) {
    return {
      isAllowed: false,
      reason: "Force-pushing is strictly prohibited by project governance.",
      violatedRule: "NO_FORCE_PUSH",
    };
  }

  // 2. Destructive reset / rebase rejection
  if (
    cmdString.includes("reset --hard") ||
    cmdString.includes("rebase -i") ||
    cmdString.includes("rebase --interactive")
  ) {
    return {
      isAllowed: false,
      reason: "Destructive history rewriting or hard resets are prohibited.",
      violatedRule: "NO_DESTRUCTIVE_HISTORY_REWRITE",
    };
  }

  // 3. Branch creation or switching to non-main
  if (
    cmdString.includes("checkout -b") ||
    cmdString.includes("switch -c") ||
    cmdString.includes("switch --create")
  ) {
    return {
      isAllowed: false,
      reason: "Creating feature, dev, or hotfix branches is prohibited. Work must stay on 'main'.",
      violatedRule: "MANDATORY_MAIN_ONLY_BRANCH_POLICY",
    };
  }

  // Check explicit branch <name>
  if (args[0] === "branch" && args.length > 1 && !args[1]?.startsWith("-")) {
    return {
      isAllowed: false,
      reason: "Creating new local branches is prohibited.",
      violatedRule: "MANDATORY_MAIN_ONLY_BRANCH_POLICY",
    };
  }

  // Check checkout / switch to non-main branch
  if ((args[0] === "checkout" || args[0] === "switch") && args.length > 1) {
    const target = args[1];
    if (
      target &&
      !target.startsWith("-") &&
      target !== "main" &&
      target !== "." &&
      !target.includes("/") &&
      !target.endsWith(".ts") &&
      !target.endsWith(".js") &&
      !target.endsWith(".md") &&
      !target.endsWith(".json")
    ) {
      return {
        isAllowed: false,
        reason: `Switching to branch '${target}' is prohibited. Only 'main' is permitted.`,
        violatedRule: "MANDATORY_MAIN_ONLY_BRANCH_POLICY",
      };
    }
  }

  return {
    isAllowed: true,
  };
}
