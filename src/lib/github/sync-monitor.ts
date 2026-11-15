import { execFileSync } from "child_process";
import {
  GitSyncState,
  GitSyncStatus,
  SyncMonitorOptions,
} from "./types";

export interface RepoSyncMonitorOptions {
  gitExec?: (args: string[]) => string;
  ttlMs?: number;
}

export class RepoSyncMonitor {
  private gitExec: (args: string[]) => string;
  private ttlMs: number;
  private cachedStatus: GitSyncStatus | null = null;
  private cacheTime: number = 0;

  constructor(options: RepoSyncMonitorOptions = {}) {
    this.ttlMs = options.ttlMs ?? 30_000;
    this.gitExec =
      options.gitExec ??
      ((args: string[]) =>
        execFileSync("git", args, {
          encoding: "utf-8",
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        }));
  }

  /**
   * Clears the in-memory synchronization cache to force fresh calculation.
   */
  public clearCache(): void {
    this.cachedStatus = null;
    this.cacheTime = 0;
  }

  /**
   * Retrieves the current synchronization status between local main and remote origin/main.
   * Caches results for 30s by default to minimize git process overhead.
   */
  public async getSyncStatus(
    options: SyncMonitorOptions = {}
  ): Promise<GitSyncStatus> {
    const bypassCache = options.bypassCache ?? false;

    if (
      !bypassCache &&
      this.cachedStatus &&
      Date.now() - this.cacheTime < this.ttlMs
    ) {
      return this.cachedStatus;
    }

    const remoteRef = options.remoteRef ?? "origin/main";
    const gitExec = options.gitExec ?? this.gitExec;

    let branch = "UNKNOWN";
    let isMainLocked = false;
    let isClean = false;
    let uncommittedCount = 0;
    let localCommitSha = "";
    let localShortSha = "";
    let localCommitMessage = "";
    let localCommitDate = "";
    let remoteCommitSha = "";
    let remoteShortSha = "";
    let aheadCount = 0;
    let behindCount = 0;
    let status: GitSyncState = "unknown";

    try {
      // 1. Branch check
      branch = gitExec(["branch", "--show-current"]).trim() || "DETACHED_HEAD";
      isMainLocked = branch === "main";

      // 2. Working tree cleanliness
      const statusOutput = gitExec(["status", "--porcelain"]);
      const dirtyLines = statusOutput
        .split("\n")
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
      uncommittedCount = dirtyLines.length;
      isClean = uncommittedCount === 0;

      // 3. Local HEAD commit
      const localHeadRaw = gitExec([
        "log",
        "-1",
        "--format=%H%x09%h%x09%s%x09%aI",
      ]).trim();

      if (localHeadRaw) {
        const [hSha, hShort, hMsg, hDate] = localHeadRaw.split("\t");
        localCommitSha = hSha || "";
        localShortSha = hShort || "";
        localCommitMessage = hMsg || "";
        localCommitDate = hDate || "";
      }

      // 4. Remote ref commit
      try {
        const remoteHeadRaw = gitExec([
          "log",
          "-1",
          remoteRef,
          "--format=%H%x09%h",
        ]).trim();

        if (remoteHeadRaw) {
          const [rSha, rShort] = remoteHeadRaw.split("\t");
          remoteCommitSha = rSha || "";
          remoteShortSha = rShort || "";
        }
      } catch {
        // Remote ref might not be fetched yet or missing
        remoteCommitSha = "";
        remoteShortSha = "";
      }

      // 5. Ahead count
      try {
        const aheadRaw = gitExec([
          "rev-list",
          "--count",
          `${remoteRef}..HEAD`,
        ]).trim();
        aheadCount = parseInt(aheadRaw, 10) || 0;
      } catch {
        aheadCount = 0;
      }

      // 6. Behind count
      try {
        const behindRaw = gitExec([
          "rev-list",
          "--count",
          `HEAD..${remoteRef}`,
        ]).trim();
        behindCount = parseInt(behindRaw, 10) || 0;
      } catch {
        behindCount = 0;
      }

      // 7. Determine status
      if (aheadCount > 0 && behindCount > 0) {
        status = "diverged";
      } else if (aheadCount > 0 && behindCount === 0) {
        status = "ahead";
      } else if (aheadCount === 0 && behindCount > 0) {
        status = "behind";
      } else if (aheadCount === 0 && behindCount === 0) {
        status = "synced";
      }
    } catch {
      status = "unknown";
    }

    const result: GitSyncStatus = {
      branch,
      isMainLocked,
      localCommitSha,
      localShortSha,
      localCommitMessage,
      localCommitDate,
      remoteRef,
      remoteCommitSha,
      remoteShortSha,
      aheadCount,
      behindCount,
      status,
      isClean,
      uncommittedCount,
      lastCheckedAt: new Date().toISOString(),
    };

    this.cachedStatus = result;
    this.cacheTime = Date.now();

    return result;
  }
}
