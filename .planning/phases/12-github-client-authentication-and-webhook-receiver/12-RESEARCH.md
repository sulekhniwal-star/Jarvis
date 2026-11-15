# Phase 12 Research: GitHub API Client, Authentication & Webhook Receiver

## 1. Requirements & Scope

Phase 12 initiates Milestone 4 (GitHub Integration & Branchless Discipline) by constructing the programmatic bridge between Jarvis and GitHub (`REQ-GH-01`, `REQ-GH-02`).

### Target Requirements
- **REQ-GH-01:** Type-safe GitHub API client supporting repository status checks, branch HEAD retrieval, commit metadata, and commit comparison (`compareCommits`), authenticated via Personal Access Token (`GITHUB_TOKEN`) or GitHub App installation token.
- **REQ-GH-02:** GitHub Webhook receiver (`POST /api/github/webhook`) verifying HMAC SHA-256 signatures (`X-Hub-Signature-256`) and dispatching events (`push`, `workflow_run`, `ping`).

---

## 2. Technical Architecture & Protocols

### 2.1 GitHub REST API Client (Zero-Dependency)
- **Base URL:** `https://api.github.com`
- **Required Headers:**
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `User-Agent: Jarvis-AI-Agent/1.0` *(GitHub returns HTTP 403 if User-Agent is omitted)*
  - `Authorization: Bearer <token>`
- **Key Methods Required:**
  1. `getRepository(owner, repo)`: Verifies repo existence, default branch (`main`), visibility, permissions.
  2. `getBranch(owner, repo, branch = "main")`: Fetches latest commit SHA at `refs/heads/main`.
  3. `getCommit(owner, repo, ref)`: Returns commit details, author, message, and stats.
  4. `compareCommits(owner, repo, base, head)`: Evaluates divergence (`ahead_by`, `behind_by`, `status`, `files`).
  5. `listWorkflowRuns(owner, repo, options)`: Returns GitHub Actions runs for CI verification.

### 2.2 Webhook Signature Verification (`X-Hub-Signature-256`)
- GitHub signs every webhook payload with the shared `GITHUB_WEBHOOK_SECRET`.
- Header: `X-Hub-Signature-256: sha256=<hex_digest>`
- Verification Protocol:
  ```typescript
  import crypto from "crypto";

  export function verifyGitHubWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string
  ): boolean {
    if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
      return false;
    }
    const signature = signatureHeader.substring("sha256=".length);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf-8")
      .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  }
  ```

### 2.3 Event Routing & Branchless Assertion
- `ping`: Initial webhook configuration verification -> return HTTP 200 `{ ok: true, pong: true }`.
- `push`:
  - Inspect `ref`: must be `refs/heads/main`.
  - If a push to a non-`main` branch is received, log a warning alert (`Branchless Discipline violation on remote`).
  - Extract `after` (head SHA), `commits`, and `pusher`.
- `workflow_run`:
  - Inspect `workflow_run.head_branch`: must be `main`.
  - Capture `conclusion` (`success` / `failure`), duration, and run URL for autonomous verification.

---

## 3. Plan Wave Breakdown

### Wave 1: GitHub API Client & Types (Plan 12.1)
- Author `src/lib/github/types.ts`: Models for `GitHubRepository`, `GitHubBranch`, `GitHubCommit`, `GitHubComparison`, `GitHubWorkflowRun`.
- Author `src/lib/github/client.ts`: Zero-dependency native fetch client (`GitHubClient`) with timeout, error decoding, and rate limit parsing.
- Export from `src/lib/github/index.ts`.
- Unit test suite: `tests/unit/github/client.test.ts`.

### Wave 2: Webhook Verification, Route Handler & Event Router (Plan 12.2)
- Author `src/lib/github/webhook.ts`: HMAC signature verification and event typing.
- Author `src/app/api/github/webhook/route.ts`: App Router route handler verifying signature and routing `push`, `workflow_run`, and `ping` events.
- Unit test suites:
  - `tests/unit/github/webhook.test.ts`: Signature validation edge cases and event parser.
  - `tests/unit/api/github-webhook-route.test.ts`: Route integration tests with valid/invalid signatures and event payloads.

---

## 4. Verification Criteria
- `tests/unit/github/client.test.ts` passes 100%.
- `tests/unit/github/webhook.test.ts` passes 100%.
- `tests/unit/api/github-webhook-route.test.ts` passes 100%.
- Full test suite passes: `pnpm test`.
- Next.js production build passes: `pnpm build`.
