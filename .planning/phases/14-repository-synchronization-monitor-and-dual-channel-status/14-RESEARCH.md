# Phase 14 Research: Repository Synchronization Monitor & Dual-Channel Status

## 1. Requirements & Core Invariants

Phase 14 completes Milestone 4 by establishing automated, continuous visibility into Git synchronization status between local `main` HEAD and remote `origin/main` (`REQ-GH-04`).

### Target Requirements
- **REQ-GH-04:** Repository Synchronization Monitor: Service tracking commit divergence between local `main` HEAD and remote `origin/main`, surfacing ahead/behind counts in Web Dashboard and Telegram (`/status`, `/projects`).
- **NFR-SEC-01:** Main-Only Branch Lock: Status reporting must explicitly confirm that active branch is locked to `main` with 0 non-main branches.

---

## 2. Technical Architecture & Component Design

### 2.1 Repository Synchronization Monitor (`src/lib/github/sync-monitor.ts`)
The monitor service aggregates local git metrics and remote GitHub state to compute divergence:

```typescript
export type GitSyncState = "synced" | "ahead" | "behind" | "diverged" | "unknown";

export interface GitSyncStatus {
  branch: string;
  isMainLocked: boolean;
  localCommitSha: string;
  localShortSha: string;
  localCommitMessage: string;
  localCommitDate: string;
  remoteRef: string;
  remoteCommitSha: string;
  remoteShortSha: string;
  aheadCount: number;
  behindCount: number;
  status: GitSyncState;
  isClean: boolean;
  uncommittedCount: number;
  lastCheckedAt: string;
}
```

Methods on `RepoSyncMonitor`:
1. `getSyncStatus(options?: { fetchRemote?: boolean; cwd?: string; gitExec?: (args: string[]) => string }): Promise<GitSyncStatus>`
   - Inspects local HEAD (`git log -1`)
   - If `fetchRemote: true`, optionally triggers `git fetch origin main` (or queries `GitHubClient.getBranch` if token is set)
   - Inspects `origin/main` commit SHA
   - Computes `aheadCount` (`git rev-list --count origin/main..HEAD`)
   - Computes `behindCount` (`git rev-list --count HEAD..origin/main`)
   - Inspects working tree cleanliness (`git status --porcelain`)
   - Derives `status`:
     - ahead === 0 && behind === 0 -> `"synced"`
     - ahead > 0 && behind === 0 -> `"ahead"`
     - ahead === 0 && behind > 0 -> `"behind"`
     - ahead > 0 && behind > 0 -> `"diverged"`
2. Cache/Memoization:
   - Stores current sync status with a short TTL (e.g. 30 seconds) to avoid redundant git process spawns on rapid page reloads.

### 2.2 App Router Endpoint (`src/app/api/git/sync/route.ts`)
- `GET /api/git/sync`:
  - Returns `GitSyncStatus` JSON object.
- `POST /api/git/sync`:
  - Bypasses cache, optionally fetches remote updates, and returns fresh `GitSyncStatus`.

### 2.3 Channel 1: Web Dashboard Sync Widget (`src/components/dashboard/git-sync-status.tsx`)
- UI Card component rendered in `src/app/page.tsx`:
  - Visual status pill / badge:
    - `"synced"`: Green badge ("Synced with origin/main")
    - `"ahead"`: Amber badge ("X commits ahead — push pending")
    - `"behind"`: Blue/Red badge ("X commits behind — sync required")
    - `"diverged"`: Rose badge ("Diverged — reconciliation needed")
  - Displays:
    - Active Branch: `main` (with lock icon / badge)
    - Local HEAD: short SHA + commit message
    - Ahead / Behind commit metrics
    - Working tree state: clean or uncommitted count
    - "Request Push" action button or quick link when `ahead > 0`
  - Included in the dashboard overview alongside `AICoreStatus` and `PendingApprovalsCard`.

### 2.4 Channel 2: Telegram Status & Projects Commands (`src/lib/telegram/commands.ts`)
- `/status` enhancement:
  - Appends a dedicated Git sync block:
    ```
    🐙 Git Repository Sync:
    • Branch: main (LOCKED)
    • Status: 2 commits ahead (Push pending)
    • HEAD: 260ffd2 — feat(git): implement push gate...
    ```
- `/projects` enhancement:
  - For projects linked to repositories, includes branch lock and sync status summary.

---

## 3. Plan Wave Breakdown

### Wave 1: Repository Synchronization Monitor & Sync API Route (Plan 14.1)
- Author `src/lib/github/sync-monitor.ts`:
  - Define `GitSyncStatus`, `GitSyncState`, `RepoSyncMonitor` class with dependency injection (`gitExec`, `githubClient`).
  - Export from `src/lib/github/index.ts`.
- Author `src/app/api/git/sync/route.ts`:
  - `GET` and `POST` handlers returning `GitSyncStatus`.
- Author unit test suites:
  - `tests/unit/github/sync-monitor.test.ts` (testing synced, ahead, behind, diverged, dirty tree, and live workspace).
  - `tests/unit/api/git-sync-route.test.ts` (testing GET/POST route responses and error handling).

### Wave 2: Dual-Channel UI & Telegram Status Integration (Plan 14.2)
- Author `src/components/dashboard/git-sync-status.tsx`:
  - React component presenting live sync metrics, status badges, and branch lock indicator.
- Update `src/app/page.tsx`:
  - Integrate `GitSyncStatusCard` into the top or middle grid.
- Update `src/lib/telegram/commands.ts`:
  - Enhance `/status` and `/projects` handlers to query and display repository synchronization details.
- Author unit test suites:
  - `tests/unit/components/git-sync-status.test.tsx` (testing UI rendering across synced, ahead, and behind states).
  - `tests/unit/telegram/commands.test.ts` (updating and extending tests for sync details in `/status` and `/projects`).

---

## 4. Verification Criteria
- `tests/unit/github/sync-monitor.test.ts` passes 100%.
- `tests/unit/api/git-sync-route.test.ts` passes 100%.
- `tests/unit/components/git-sync-status.test.tsx` passes 100%.
- `tests/unit/telegram/commands.test.ts` passes 100%.
- Full test suite passes: `pnpm test`.
- Next.js production build passes: `pnpm build`.
