import { describe, it, expect } from "vitest";
import { validatePrePush } from "@/lib/git/push-validator";

describe("Pre-Push Validation Engine (REQ-GH-03, NFR-SEC-01)", () => {
  it("approves pre-push when branch is main, tree is clean, ahead > 0, behind == 0, and no secrets", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("log -1 --format=%H%x09%s"))
        return "1111222233334444555566667777888899990000\tfeat: implement remote push gate\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "2\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      if (argStr.includes("log origin/main..HEAD --format"))
        return "1111222233334444555566667777888899990000\t1111222\tfeat: implement remote push gate\tDeveloper\t2026-11-15T23:00:00Z\n";
      if (argStr.includes("diff --name-only origin/main..HEAD"))
        return "src/lib/git/push-validator.ts\n";
      if (argStr.includes("diff origin/main..HEAD"))
        return "+export function validatePrePush() {}\n";
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(true);
    expect(result.activeBranch).toBe("main");
    expect(result.isClean).toBe(true);
    expect(result.aheadCount).toBe(2);
    expect(result.behindCount).toBe(0);
    expect(result.hasSecrets).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]?.shortSha).toBe("1111222");
    expect(result.filesChanged).toContain("src/lib/git/push-validator.ts");
  });

  it("rejects pre-push when active branch is not main", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "feature/auth\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "1\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.activeBranch).toBe("feature/auth");
    expect(result.errors.some((e) => e.includes("only 'main' is permitted"))).toBe(true);
  });

  it("rejects pre-push when working tree is dirty", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return " M src/index.ts\n?? untracked.txt\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "1\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.isClean).toBe(false);
    expect(result.errors.some((e) => e.includes("uncommitted changes"))).toBe(true);
  });

  it("rejects pre-push when there are 0 ahead commits to push", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "0\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.aheadCount).toBe(0);
    expect(result.errors.some((e) => e.includes("No local commits ahead"))).toBe(true);
  });

  it("rejects pre-push when local branch is behind remote", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "1\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "3\n";
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.behindCount).toBe(3);
    expect(result.errors.some((e) => e.includes("behind 'origin/main' by 3 commits"))).toBe(true);
  });

  it("rejects pre-push when secrets are detected in outgoing commits", () => {
    const gitExec = (args: string[]): string => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("log -1 --format=%H%x09%s")) return "abc123\tfeat: leaked token\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "1\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      if (argStr.includes("log origin/main..HEAD --format"))
        return "abc1234567890123456789012345678901234567\tabc1234\tfeat: leaked token\tDev\t2026-11-15T23:00:00Z\n";
      if (argStr.includes("diff --name-only origin/main..HEAD")) return "src/secrets.ts\n";
      if (argStr.includes("diff origin/main..HEAD")) {
        return "+const token = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';\n";
      }
      return "";
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.hasSecrets).toBe(true);
    expect(result.detectedSecretPatterns).toContain("GitHub Personal Access Token");
    expect(result.errors.some((e) => e.includes("sensitive patterns"))).toBe(true);
  });

  it("gracefully catches git execution exceptions without throwing", () => {
    const gitExec = (): string => {
      throw new Error("fatal: not a git repository");
    };

    const result = validatePrePush({ gitExec });

    expect(result.isReady).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Failed to detect current branch");
  });

  it("can inspect the live repository without throwing unhandled exceptions", () => {
    // Calling without options uses default gitExec against actual local repository
    const result = validatePrePush();
    expect(result).toHaveProperty("isReady");
    expect(result).toHaveProperty("activeBranch");
    expect(result).toHaveProperty("isClean");
    expect(result).toHaveProperty("aheadCount");
    expect(result).toHaveProperty("commits");
    expect(result).toHaveProperty("errors");
  });
});
