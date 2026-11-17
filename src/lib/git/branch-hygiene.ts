import { execFileSync } from "child_process";

export interface BranchHygieneReport {
  isCompliant: boolean;
  activeBranch: string;
  allLocalBranches: string[];
  extraneousBranches: string[];
  violations: string[];
  timestamp: string;
}

export interface CleanBranchesResult {
  deleted: string[];
  failed: { branch: string; error: string }[];
}

export type GitExecFn = (
  cmd: string,
  args: string[],
  options?: { cwd?: string; encoding?: string }
) => string;

function defaultGitExec(
  cmd: string,
  args: string[],
  options?: { cwd?: string; encoding?: string }
): string {
  return execFileSync(cmd, args, {
    cwd: options?.cwd ?? process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

/**
 * Continuously validates git branch hygiene against the single-branch invariant (NFR-SEC-04).
 * Checks that the active branch is 'main' AND that no other local branches exist in the repository.
 */
export function auditBranchHygiene(
  cwd: string = process.cwd(),
  gitExec: GitExecFn = defaultGitExec
): BranchHygieneReport {
  const timestamp = new Date().toISOString();
  const violations: string[] = [];
  let activeBranch = "";
  let allLocalBranches: string[] = [];

  try {
    const rawActive = gitExec("git", ["branch", "--show-current"], { cwd }).trim();
    activeBranch = rawActive || "DETACHED_HEAD";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    violations.push(`Failed to determine active branch: ${msg}`);
  }

  try {
    const rawBranchList = gitExec(
      "git",
      ["branch", "--format=%(refname:short)"],
      { cwd }
    );
    allLocalBranches = rawBranchList
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    violations.push(`Failed to list local branches: ${msg}`);
  }

  if (activeBranch && activeBranch !== "main") {
    violations.push(
      `Active branch '${activeBranch}' violates mandatory main-only policy (NFR-SEC-04). Only 'main' is permitted.`
    );
  }

  const extraneousBranches = allLocalBranches.filter((b) => b !== "main");
  if (extraneousBranches.length > 0) {
    violations.push(
      `Extraneous local branch(es) detected: ${extraneousBranches.join(", ")}. Single-branch policy (NFR-SEC-04) prohibits non-main branches.`
    );
  }

  return {
    isCompliant: violations.length === 0,
    activeBranch,
    allLocalBranches,
    extraneousBranches,
    violations,
    timestamp,
  };
}

/**
 * Removes extraneous local branches to restore compliance with the single-branch invariant.
 */
export function cleanExtraneousBranches(
  cwd: string = process.cwd(),
  options: { force?: boolean; gitExec?: GitExecFn } = {}
): CleanBranchesResult {
  const gitExec = options.gitExec ?? defaultGitExec;
  const audit = auditBranchHygiene(cwd, gitExec);

  const deleted: string[] = [];
  const failed: { branch: string; error: string }[] = [];

  if (audit.extraneousBranches.length === 0) {
    return { deleted, failed };
  }

  const flag = options.force !== false ? "-D" : "-d";

  for (const branch of audit.extraneousBranches) {
    try {
      gitExec("git", ["branch", flag, branch], { cwd });
      deleted.push(branch);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ branch, error: msg });
    }
  }

  return { deleted, failed };
}
