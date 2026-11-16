# Phase 18 Research: Execution Telemetry, Artifact Capture & Run State Machine Integration

## 1. Requirements & Core Invariants

Phase 18 completes **Milestone 5: Coding Execution Sandbox** by integrating the execution engine with durable database persistence, state machine lifecycles, and dual-channel reporting (`REQ-EX-04`).

### Target Requirements
- **REQ-EX-04:** Execution Telemetry & Artifact Pipeline: Pipeline capturing diff patches, test summaries, and build logs, persisting state transitions in `public.agent_runs`, and updating Web Dashboard and Telegram (`docs/CODING_AGENT_INTERFACE.md §2`, `PRD §7.6`).
- **NFR-SEC-01:** Main-Only Branch Lock: Commit SHAs and diffs tracked in telemetry belong strictly to `main`.
- **NFR-SEC-02:** Zero Secret Leakage: Telemetry payloads, diffs, and logs are scrubbed of master secrets prior to database persistence and Telegram broadcast.
- **NFR-REL-01:** Durable Persistence: All state machine transitions (`queued` -> `running` -> `verifying` -> `completed` / `failed`) are durably recorded in `public.agent_runs` and `public.tasks`.

---

## 2. Technical Architecture & Component Design

### 2.1 Artifact Storage Pipeline (`src/lib/agents/engine/telemetry/artifact-pipeline.ts`)
Converts in-memory `ExecutionArtifact` objects from `CodingTaskResult` into persistent records:
- Computes SHA-256 checksums (`crypto.createHash("sha256")`).
- Calculates byte size.
- Sanitizes log content to redact any potential tokens or secrets (`NFR-SEC-02`).
- Persists records using `AgentRunRepository.recordArtifact`.
- Generates markdown execution summaries.

### 2.2 Execution Coordinator (`src/lib/agents/engine/telemetry/execution-coordinator.ts`)
Coordinates the end-to-end task run lifecycle:
1. Accepts task ID, plan step, project details, and optional run options.
2. Creates an `agent_runs` record in `"queued"` status.
3. Transitions `Task` to `"running"` via `TaskStateMachine` and `TaskRepository`.
4. Transitions `AgentRun` to `"running"` via `AgentRunRepository.startRun`.
5. Synthesizes `CodingTaskContext` via `TaskContextSynthesizer`.
6. Executes task via `SandboxOrchestrator.execute(context)`.
7. Transitions `AgentRun` to `"verifying"` status.
8. If execution succeeded:
   - Completes run via `AgentRunRepository.completeRun` with commit hash, diff patch, and test summary.
   - Transitions `Task` to `"completed"` (or `"planned"` if further steps remain).
9. If execution failed:
   - Fails run via `AgentRunRepository.failRun` with exit code and error log.
   - Transitions `Task` to `"failed"`.
10. Persists artifacts via `ArtifactPipeline`.
11. Dispatches Telegram notification to owner with MarkdownV2 run card.

### 2.3 App Router Runs API (`src/app/api/agents/runs/route.ts`)
- `GET /api/agents/runs`: Lists recent agent runs with status, task reference, duration, commit SHA, and test summary metrics.
- `POST /api/agents/runs`: Initiates execution of an approved step using `ExecutionCoordinator`.

### 2.4 Web Dashboard Telemetry Card (`src/components/dashboard/agent-runs-card.tsx`)
- Displays recent runs with status pills:
  - `Completed`: Green badge with commit short SHA link.
  - `Running`: Blue pulsing badge with active step.
  - `Failed`: Red badge with error snippet.
- Shows test pass/fail counts and duration metrics.
- Integrated into `src/app/page.tsx` alongside `AICoreStatus` and `GitSyncStatusCard`.

### 2.5 Telegram Run Notification (`src/lib/telegram/format.ts`)
- Renders rich MarkdownV2 telemetry alert:
  ```
  ⚡ Agent Run Complete
  Task: #task-id | Project: jarvis
  Status: ✅ Completed
  Commit: 12345678 (main 🔒)
  Tests: 15 passed, 0 failed (450ms)
  Duration: 12s
  ```

---

## 3. Plan Decomposition & Wave Allocation

- **Wave 1 (Plan 18.1):**
  - Task 1: Artifact storage pipeline and checksum generator in `src/lib/agents/engine/telemetry/artifact-pipeline.ts`.
  - Task 2: Execution coordinator and state machine wiring in `src/lib/agents/engine/telemetry/execution-coordinator.ts`.
  - Task 3: Unit test suite in `tests/unit/agents/engine/telemetry.test.ts`.

- **Wave 2 (Plan 18.2):**
  - Task 1: App Router runs endpoint in `src/app/api/agents/runs/route.ts`.
  - Task 2: Web Dashboard `AgentRunsCard` component in `src/components/dashboard/agent-runs-card.tsx` and integration in `src/app/page.tsx`.
  - Task 3: Telegram telemetry notification formatter and integration.
  - Task 4: Unit test suites in `tests/unit/components/agent-runs-card.test.tsx` and `tests/unit/api/agents-runs-route.test.ts`.
