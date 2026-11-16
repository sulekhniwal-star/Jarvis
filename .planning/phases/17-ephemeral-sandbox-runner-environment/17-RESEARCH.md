# Phase 17 Research: Ephemeral Sandbox Runner Environment

## 1. Requirements & Core Invariants

Phase 17 implements the isolated execution runner environment (`REQ-EX-03`) that executes coding agent tasks in ephemeral, secure sandboxes with zero master secret exposure.

### Target Requirements
- **REQ-EX-03:** Ephemeral Sandbox Runner: Isolated execution environment (GitHub Actions workflow dispatcher & local Docker/process runner fallback) ensuring zero exposure of master credentials or persistent host state (`docs/CODING_AGENT_INTERFACE.md §4`).
- **NFR-SEC-01:** Main-Only Branch Lock: Workflow dispatch ref must strictly be locked to `"main"`. Any attempt to dispatch or execute on a non-`main` ref is rejected immediately.
- **NFR-SEC-02:** Zero Secret Leakage: Master Supabase service-role keys and master database URLs are never transmitted in workflow dispatch inputs or injected into sandbox containers.
- **NFR-REL-01:** Durable Persistence: Sandbox runs produce `CodingTaskResult` conforming to schemas compatible with `public.agent_runs`.

---

## 2. Technical Architecture & Component Design

### 2.1 GitHub API Extensions (`src/lib/github/client.ts`)
Adds workflow dispatch capability to `GitHubClient`:
```typescript
public async dispatchWorkflow(
  owner: string,
  repo: string,
  workflowId: string,
  ref: string,
  inputs?: Record<string, unknown>
): Promise<void>
```
- Endpoint: `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`
- Headers: `Accept: application/vnd.github+json`
- Strictly checks `ref === "main"` (`NFR-SEC-01`).
- Polling via `getWorkflowRun(owner, repo, runId)` to monitor status (`"queued"`, `"in_progress"`, `"completed"`).

### 2.2 Sandbox Domain Models (`src/lib/agents/engine/sandbox/types.ts`)
```typescript
export type SandboxMode = "github_actions" | "local_process" | "local_docker" | "auto";

export interface SandboxExecutionConfig {
  mode?: SandboxMode;
  pollIntervalMs?: number;
  timeoutMs?: number;
  ephemeralWorkspaceRoot?: string;
  workflowFileName?: string;
}

export interface ISandboxRunner {
  readonly mode: SandboxMode;
  execute(context: CodingTaskContext): Promise<CodingTaskResult>;
  validateEnvironment(): Promise<EngineValidationResult>;
}
```

### 2.3 GitHub Actions Sandbox Runner (`src/lib/agents/engine/sandbox/github-actions-runner.ts`)
- Dispatches `coding-agent.yml` workflow using `GitHubClient.dispatchWorkflow`.
- Ref is strictly validated as `"main"`.
- Inputs payload passes only safe metadata:
  - `taskId`, `runId`, `stepId`, `allowedFilePatterns` (JSON string), `scopedInstructions`
  - Zero master database strings or master secrets (`NFR-SEC-02`).
- Polls for completion with configurable timeout and backoff.
- Maps GitHub workflow conclusion (`"success"`, `"failure"`, `"timed_out"`) to `CodingTaskResult`.

### 2.4 Local Sandbox Runner Fallback (`src/lib/agents/engine/sandbox/local-sandbox-runner.ts`)
- Provides offline / local development runner when GitHub Actions is not reachable or during tests.
- Creates an isolated scratch folder (e.g. `.sandbox/<runId>/`).
- Invokes the registered engine (`AiderCliAdapter` or `MockCodingAgentEngine`).
- Automatically cleans up the workspace on teardown.

### 2.5 Sandbox Orchestrator (`src/lib/agents/engine/sandbox/sandbox-orchestrator.ts`)
- Determines active sandbox runner based on environment:
  - If `GITHUB_TOKEN` is present and repo is configured -> selects `GitHubActionsSandboxRunner`.
  - Else -> selects `LocalSandboxRunner`.
- Implements unified `execute(context: CodingTaskContext): Promise<CodingTaskResult>`.

### 2.6 App Router Diagnostic Route (`src/app/api/agents/sandbox/route.ts`)
- `GET /api/agents/sandbox`: Reports sandbox health, active mode, and runner capabilities.

---

## 3. Plan Decomposition & Wave Allocation

- **Wave 1 (Plan 17.1):**
  - Task 1: Extend `GitHubClient` with `dispatchWorkflow` and `getWorkflowRun`.
  - Task 2: Sandbox types in `src/lib/agents/engine/sandbox/types.ts`.
  - Task 3: `GitHubActionsSandboxRunner` in `src/lib/agents/engine/sandbox/github-actions-runner.ts`.
  - Task 4: Unit test suite in `tests/unit/agents/engine/github-actions-runner.test.ts`.

- **Wave 2 (Plan 17.2):**
  - Task 1: `LocalSandboxRunner` in `src/lib/agents/engine/sandbox/local-sandbox-runner.ts`.
  - Task 2: `SandboxOrchestrator` in `src/lib/agents/engine/sandbox/sandbox-orchestrator.ts` and barrel exports in `src/lib/agents/engine/sandbox/index.ts`.
  - Task 3: Workflow template `.github/workflows/coding-agent.yml` and diagnostic route `/api/agents/sandbox`.
  - Task 4: Comprehensive unit test suites in `tests/unit/agents/engine/sandbox-orchestrator.test.ts` and `tests/unit/api/agents-sandbox-route.test.ts`.
