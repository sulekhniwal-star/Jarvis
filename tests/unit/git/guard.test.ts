import { describe, it, expect } from "vitest";
import {
  verifyActiveBranchIsMain,
  validateGitCommand,
  getWorkingTreeStatus,
} from "@/lib/git/guard";

describe("Git Guard — Mandatory Main-Only Branch Policy", () => {
  it("verifies that the current repository is on branch main", () => {
    const result = verifyActiveBranchIsMain();
    expect(result.isValid).toBe(true);
    expect(result.currentBranch).toBe("main");
  });

  describe("validateGitCommand — Command Inspection Gate", () => {
    it("allows permitted commands targeting main or read operations", () => {
      const permitted = [
        "git status",
        "git diff",
        "git log -n 5",
        "git add .",
        'git commit -m "feat: init"',
        "git checkout main",
        "git switch main",
      ];

      for (const cmd of permitted) {
        const res = validateGitCommand(cmd);
        expect(res.isAllowed, `Expected '${cmd}' to be permitted`).toBe(true);
      }
    });

    it("rejects branch creation commands", () => {
      const disallowed = [
        "git checkout -b feature/auth",
        "git switch -c new-feature",
        "git branch dev",
        "git checkout -b hotfix-123",
      ];

      for (const cmd of disallowed) {
        const res = validateGitCommand(cmd);
        expect(res.isAllowed, `Expected '${cmd}' to be rejected`).toBe(false);
        expect(res.violatedRule).toBe("MANDATORY_MAIN_ONLY_BRANCH_POLICY");
      }
    });

    it("rejects force-pushing variations", () => {
      const forcePushes = [
        "git push --force origin main",
        "git push -f",
        "git push origin main --force-with-lease",
      ];

      for (const cmd of forcePushes) {
        const res = validateGitCommand(cmd);
        expect(res.isAllowed, `Expected '${cmd}' to be rejected`).toBe(false);
        expect(res.violatedRule).toBe("NO_FORCE_PUSH");
      }
    });

    it("rejects destructive resets and interactive rebases", () => {
      const destructive = [
        "git reset --hard HEAD~1",
        "git rebase -i HEAD~3",
      ];

      for (const cmd of destructive) {
        const res = validateGitCommand(cmd);
        expect(res.isAllowed, `Expected '${cmd}' to be rejected`).toBe(false);
        expect(res.violatedRule).toBe("NO_DESTRUCTIVE_HISTORY_REWRITE");
      }
    });
  });

  describe("getWorkingTreeStatus", () => {
    it("returns structured working tree object", () => {
      const status = getWorkingTreeStatus();
      expect(status).toHaveProperty("isClean");
      expect(Array.isArray(status.modified)).toBe(true);
      expect(Array.isArray(status.untracked)).toBe(true);
      expect(Array.isArray(status.staged)).toBe(true);
    });
  });
});
