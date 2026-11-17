import { describe, it, expect, vi } from "vitest";
import {
  auditBranchHygiene,
  cleanExtraneousBranches,
  GitExecFn,
} from "@/lib/git/branch-hygiene";

describe("Branch Hygiene Enforcement (NFR-SEC-04)", () => {
  it("reports full compliance when only the main branch exists", () => {
    const mockGitExec: GitExecFn = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) {
        return "main\n";
      }
      if (args.some((a) => a.includes("--format="))) {
        return "main\n";
      }
      return "";
    });

    const report = auditBranchHygiene("/mock/repo", mockGitExec);

    expect(report.isCompliant).toBe(true);
    expect(report.activeBranch).toBe("main");
    expect(report.allLocalBranches).toEqual(["main"]);
    expect(report.extraneousBranches).toEqual([]);
    expect(report.violations).toHaveLength(0);
  });

  it("detects violation when active branch is not main", () => {
    const mockGitExec: GitExecFn = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) {
        return "feature-auth\n";
      }
      if (args.some((a) => a.includes("--format="))) {
        return "feature-auth\nmain\n";
      }
      return "";
    });

    const report = auditBranchHygiene("/mock/repo", mockGitExec);

    expect(report.isCompliant).toBe(false);
    expect(report.activeBranch).toBe("feature-auth");
    expect(report.extraneousBranches).toContain("feature-auth");
    expect(report.violations.some((v) => v.includes("feature-auth"))).toBe(true);
  });

  it("detects violation when extraneous local branches exist alongside main", () => {
    const mockGitExec: GitExecFn = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) {
        return "main\n";
      }
      if (args.some((a) => a.includes("--format="))) {
        return "main\nexperiment-ai\nlegacy-backup\n";
      }
      return "";
    });

    const report = auditBranchHygiene("/mock/repo", mockGitExec);

    expect(report.isCompliant).toBe(false);
    expect(report.activeBranch).toBe("main");
    expect(report.extraneousBranches).toEqual(["experiment-ai", "legacy-backup"]);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toContain("Extraneous local branch(es) detected");
  });

  it("cleans extraneous local branches with force flag (-D)", () => {
    const executedCommands: { cmd: string; args: string[] }[] = [];

    const mockGitExec: GitExecFn = vi.fn((cmd, args) => {
      executedCommands.push({ cmd, args });
      if (args.includes("--show-current")) {
        return "main\n";
      }
      if (args.some((a) => a.includes("--format="))) {
        return "main\nfeature-xyz\n";
      }
      if (args.includes("-D") && args.includes("feature-xyz")) {
        return "Deleted branch feature-xyz";
      }
      return "";
    });

    const result = cleanExtraneousBranches("/mock/repo", { gitExec: mockGitExec });

    expect(result.deleted).toEqual(["feature-xyz"]);
    expect(result.failed).toHaveLength(0);

    const deleteCall = executedCommands.find(
      (c) => c.args.includes("-D") && c.args.includes("feature-xyz")
    );
    expect(deleteCall).toBeDefined();
  });

  it("returns empty lists when no extraneous branches exist to clean", () => {
    const mockGitExec: GitExecFn = vi.fn((_cmd, args) => {
      if (args.includes("--show-current")) return "main\n";
      if (args.some((a) => a.includes("--format="))) return "main\n";
      return "";
    });

    const result = cleanExtraneousBranches("/mock/repo", { gitExec: mockGitExec });

    expect(result.deleted).toEqual([]);
    expect(result.failed).toEqual([]);
  });
});
