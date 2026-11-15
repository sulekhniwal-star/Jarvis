# Phase 13 Research: Remote Git Push Approval Gate & Branchless Safety Guard

## 1. Requirements & Core Invariants

Phase 13 establishes the human-in-the-loop security perimeter around remote Git writes (`REQ-GH-03`, `NFR-SEC-01`).

### Target Requirements
- **REQ-GH-03:** Automated gate verifying working tree cleanliness, 100% test pass proofs, and strict `main`-only branch lock. Strictly blocks `git push origin main` until approved in `ApprovalRepository`.
- **NFR-SEC-01:** Main-Only Branch Lock: No tool, agent, or script may create or check out a non-`main` branch or perform force-pushes.

### Invariants from `docs/GITHUB_INTEGRATION.md`
1. **Target Remote:** Remote pushes must target `origin/main` exclusively.
2. **Pre-Push Inspection:**
   - Active branch must be strictly `main`.
   - Working tree must be clean (no unstaged or untracked changes).
   - Diff inspection must detect 0 secrets or sensitive tokens.
   - Ahead commit count must be > 0.
   - Test proof must verify that tests pass before a push request is formulated.
3. **Destructive Command Ban:** Absolutely no `--force`, `--force-with-lease`, or history rewrites.
4. **Human Decision Gate:** All remote pushes require explicit authorization recorded in `ApprovalRepository`.

---

## 2. Technical Architecture & Component Design

### 2.1 Pre-Push Validation Engine (`src/lib/git/push-validator.ts`)
- Evaluates repository readiness before requesting or executing a push:
  ```typescript
  export interface PrePushValidationResult {
    isReady: boolean;
    activeBranch: string;
    isClean: boolean;
    aheadCount: number;
    headCommitSha: string;
    headCommitMessage: string;
    filesChanged: string[];
    hasSecrets: boolean;
    errors: string[];
  }
  ```
- Methods:
  - `validatePrePush(options?: { remoteRef?: string }): Promise<PrePushValidationResult>`
  - Inspects `git rev-parse --abbrev-ref HEAD` (must be `main`).
  - Inspects `git status --porcelain` (must be empty).
  - Inspects `git rev-list --count origin/main..main` (ahead count).
  - Inspects `git log origin/main..main --oneline`.
  - Runs secret scanner on the commits being pushed.

### 2.2 Remote Push Gate Service (`src/lib/git/push-gate.ts`)
- Manages the approval request creation and push execution:
  - `requestPushApproval(userId: string, options?: { testProof?: string }): Promise<{ approval: Approval; validation: PrePushValidationResult }>`:
    - Runs `validatePrePush()`.
    - If valid, creates an approval record in `ApprovalRepository` (`action_type: 'git_remote_push'`, `target_resource: 'origin/main'`).
    - Dispatches Telegram approval card via `TelegramApprovalService` if Telegram is configured.
  - `executePush(approvalId: string, userId: string): Promise<{ success: boolean; pushedCommit: string; output: string }>`:
    - Verifies approval record is `approved` in `ApprovalRepository`.
    - Re-validates pre-push criteria (branch is `main`, clean tree).
    - Executes `git push origin main`.
    - Records audit log in `public.audit_events`.

### 2.3 Wiring into Telegram Decision Service & App Router
- Route handler `POST /api/git/push`:
  - Actions: `request_approval` | `execute`
- Telegram callback integration:
  - In `TelegramDecisionService`, when an action of type `git_remote_push` is approved, automatically invoke `pushGateService.executePush(approvalId, userId)` so pressing `[ ✅ Approve ]` on mobile executes the push and updates the card with the live commit SHA!

---

## 3. Plan Wave Breakdown

### Wave 1: Pre-Push Validation Engine & Domain Models (Plan 13.1)
- Author `src/lib/git/push-validator.ts`: Inspects branch invariant, working tree cleanliness, ahead commit count, commits list, changed files, and secret detection.
- Export validator from `src/lib/git/index.ts`.
- Author unit test suite: `tests/unit/git/push-validator.test.ts`.

### Wave 2: Push Gate Service, Route Handler & Decision Wiring (Plan 13.2)
- Author `src/lib/git/push-gate.ts`:
  - `requestPushApproval`: creates approval record with scope, dispatches Telegram card.
  - `executePush`: verifies approval status, executes `git push origin main`, logs audit event.
- Author route handler `src/app/api/git/push/route.ts`:
  - Ingests push approval requests and executions.
- Wire `PushGateService` into `src/lib/telegram/decision.ts` for automatic execution on mobile card approval.
- Author unit test suites:
  - `tests/unit/git/push-gate.test.ts`
  - `tests/unit/api/git-push-route.test.ts`

---

## 4. Verification Criteria
- `tests/unit/git/push-validator.test.ts` passes 100%.
- `tests/unit/git/push-gate.test.ts` passes 100%.
- `tests/unit/api/git-push-route.test.ts` passes 100%.
- Full test suite passes: `pnpm test`.
- Next.js production build passes: `pnpm build`.
