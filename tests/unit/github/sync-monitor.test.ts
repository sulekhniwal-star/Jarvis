import { describe, it, expect, vi, beforeEach } from "vitest";
import { RepoSyncMonitor } from "@/lib/github/sync-monitor";

describe("RepoSyncMonitor (REQ-GH-04, NFR-SEC-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates 'synced' state when ahead is 0 and behind is 0", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("log -1 --format"))
        return "1111222233334444555566667777888899990000\t1111222\tfeat: sync complete\t2026-11-15T23:00:00Z\n";
      if (argStr.includes("log -1 origin/main"))
        return "1111222233334444555566667777888899990000\t1111222\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "0\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.status).toBe("synced");
    expect(status.branch).toBe("main");
    expect(status.isMainLocked).toBe(true);
    expect(status.isClean).toBe(true);
    expect(status.aheadCount).toBe(0);
    expect(status.behindCount).toBe(0);
    expect(status.localShortSha).toBe("1111222");
    expect(status.localCommitMessage).toBe("feat: sync complete");
  });

  it("calculates 'ahead' state when ahead > 0 and behind == 0", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("log -1 --format"))
        return "aaaa222233334444555566667777888899990000\taaaa222\tfeat: ahead commit\t2026-11-15T23:00:00Z\n";
      if (argStr.includes("log -1 origin/main"))
        return "bbbb222233334444555566667777888899990000\tbbbb222\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "3\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.status).toBe("ahead");
    expect(status.aheadCount).toBe(3);
    expect(status.behindCount).toBe(0);
  });

  it("calculates 'behind' state when ahead == 0 and behind > 0", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "0\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "2\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.status).toBe("behind");
    expect(status.aheadCount).toBe(0);
    expect(status.behindCount).toBe(2);
  });

  it("calculates 'diverged' state when ahead > 0 and behind > 0", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "2\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "1\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.status).toBe("diverged");
    expect(status.aheadCount).toBe(2);
    expect(status.behindCount).toBe(1);
  });

  it("detects uncommitted changes in working tree", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "main\n";
      if (argStr.includes("status --porcelain")) return " M src/index.ts\n?? newfile.ts\n";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "0\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.isClean).toBe(false);
    expect(status.uncommittedCount).toBe(2);
  });

  it("detects non-main branch as isMainLocked = false", async () => {
    const gitExec = vi.fn((args: string[]) => {
      const argStr = args.join(" ");
      if (argStr.includes("branch --show-current")) return "feature/ui-redesign\n";
      if (argStr.includes("status --porcelain")) return "";
      if (argStr.includes("rev-list --count origin/main..HEAD")) return "0\n";
      if (argStr.includes("rev-list --count HEAD..origin/main")) return "0\n";
      return "";
    });

    const monitor = new RepoSyncMonitor({ gitExec });
    const status = await monitor.getSyncStatus();

    expect(status.branch).toBe("feature/ui-redesign");
    expect(status.isMainLocked).toBe(false);
  });

  it("caches status and respects clearCache()", async () => {
    let callCount = 0;
    const gitExec = vi.fn(() => {
      callCount++;
      return "main\n";
    });

    const monitor = new RepoSyncMonitor({ gitExec, ttlMs: 10000 });
    await monitor.getSyncStatus();
    const initialCalls = gitExec.mock.calls.length;

    // Second call should return cached status without invoking git
    await monitor.getSyncStatus();
    expect(gitExec.mock.calls.length).toBe(initialCalls);

    // After clearCache, it should invoke git again
    monitor.clearCache();
    await monitor.getSyncStatus();
    expect(gitExec.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it("can inspect live workspace without throwing unhandled exceptions", async () => {
    const monitor = new RepoSyncMonitor();
    const status = await monitor.getSyncStatus();

    expect(status).toHaveProperty("branch");
    expect(status).toHaveProperty("isMainLocked");
    expect(status).toHaveProperty("aheadCount");
    expect(status).toHaveProperty("behindCount");
    expect(status).toHaveProperty("status");
    expect(status).toHaveProperty("isClean");
  });
});
