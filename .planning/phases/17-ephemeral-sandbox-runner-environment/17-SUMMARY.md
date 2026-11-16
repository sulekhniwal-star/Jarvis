# Phase 17 Summary: Ephemeral Sandbox Runner Environment

## 1. Execution Overview

Phase 17 delivers the isolated, ephemeral execution runner infrastructure for Jarvis (`REQ-EX-03`). The platform can now orchestrate coding tasks in remote **GitHub Actions container runners** via workflow dispatch or fall back to an isolated **Local Sandbox Runner** with automatic workspace teardown, ensuring zero master credential exposure (`NFR-SEC-02`) and strict branchless locking to `main` (`NFR-SEC-01`).

- **Phase Objective:** Construct an ephemeral execution environment supporting GitHub Actions `workflow_dispatch`, ephemeral credential scoping, isolated local fallback, unified sandbox orchestration, and diagnostic health endpoints.
- **Requirements Satisfied:**
  - `REQ-EX-03`: Ephemeral Sandbox Runner Environment (GitHub Actions workflow dispatcher & local process runner fallback with zero credential leakage).
  - `NFR-SEC-01`: Main-Only Branch Lock: Workflow dispatch ref and local execution target strictly enforce `ref === "main"`.
  - `NFR-SEC-02`: Zero Secret Leakage: Master database connection strings and Supabase service-role keys are completely barred from workflow inputs and container environments.
  - `NFR-REL-01`: Durable Persistence: Execution results conform to standard `CodingTaskResult` schemas.
- **Git Compliance:** 100% compliant with `main`-only policy across all commits.

---

## 2. Key Deliverables & Artifacts

### 2.1 Wave 1 (Plan 17.1) — GitHub Client Workflow Dispatcher & GitHub Actions Runner
- **GitHub Client Extensions (`src/lib/github/client.ts`):**
  - `dispatchWorkflow(owner, repo, workflowId, ref, inputs)`: Triggers GitHub Actions workflow via `POST /repos/{owner}/{repo}/actions/workflows/{workflowId}/dispatches`, strictly verifying `ref === "main"` (`NFR-SEC-01`).
  - `getWorkflowRun(owner, repo, runId)`: Inspects run status and conclusion via `GET /repos/{owner}/{repo}/actions/runs/{runId}`.
- **Sandbox Domain Models (`src/lib/agents/engine/sandbox/types.ts`):**
  - `SandboxMode`: `"github_actions" | "local_process" | "local_docker" | "auto"`.
  - `SandboxExecutionConfig`: Execution timeouts, polling intervals, workspace roots, and workflow file targets.
  - `ISandboxRunner`: Universal contract for sandbox runners (`mode`, `execute(context)`, `validateEnvironment()`).
  - `SandboxRunnerError`: Dedicated exception class for sandbox failures.
- **GitHub Actions Sandbox Runner (`src/lib/agents/engine/sandbox/github-actions-runner.ts`):**
  - Formulates safe inputs (omitting all master secrets), dispatches `coding-agent.yml`, polls for conclusion, and maps run status to `CodingTaskResult`.
- **Unit Test Suite (`tests/unit/agents/engine/github-actions-runner.test.ts`):**
  - 5 unit tests verifying dispatch mechanics, ref validation, polling loops, failure conclusions, and environment checks.

### 2.2 Wave 2 (Plan 17.2) — Local Sandbox Runner, Sandbox Orchestrator & Diagnostic Route
- **Local Sandbox Runner (`src/lib/agents/engine/sandbox/local-sandbox-runner.ts`):**
  - Provides offline/local execution fallback in an isolated temporary scratchpad directory (`.sandbox/<runId>`).
  - Sanitizes environment variables to eliminate any master credentials (`NFR-SEC-02`).
  - Automatically cleans up the workspace on teardown.
- **Sandbox Orchestrator (`src/lib/agents/engine/sandbox/sandbox-orchestrator.ts`):**
  - Dynamically routes execution between GitHub Actions and local runner based on environment health and configuration.
  - Exposes unified singleton `sandboxOrchestrator`.
- **Workflow Template (`.github/workflows/coding-agent.yml`):**
  - GitHub Actions workflow definition for ephemeral containerized task execution triggered via `workflow_dispatch` on `main`.
- **Diagnostic Route (`src/app/api/agents/sandbox/route.ts`):**
  - Exposes `GET /api/agents/sandbox` reporting active mode, runner health checks, and supported execution modes.
- **Sandbox Module Entrypoint (`src/lib/agents/engine/sandbox/index.ts` & `src/lib/agents/engine/index.ts`):**
  - Clean barrel re-exports of all sandbox types, runners, and orchestrator.
- **Unit Test Suites:**
  - `tests/unit/agents/engine/sandbox-orchestrator.test.ts`: 7 tests covering local workspace isolation, cleanup, and orchestrator routing.
  - `tests/unit/api/agents-sandbox-route.test.ts`: 2 tests covering diagnostic API responses.

---

## 3. Empirical Verification Results

- **Phase 17 Unit Tests:** 3 test files, 14 tests passed (100% green).
  - `tests/unit/agents/engine/github-actions-runner.test.ts`: 5/5 passed.
  - `tests/unit/agents/engine/sandbox-orchestrator.test.ts`: 7/7 passed.
  - `tests/unit/api/agents-sandbox-route.test.ts`: 2/2 passed.
- **Full Project Vitest Suite:** 57 test files passed, 368 total tests passed (100% green).
- **Production Build:** Next.js production build compiled cleanly across 15 static and dynamic routes with 0 errors and 0 warnings.

---

## 4. Next Phase Readiness

Phase 17 establishes the ephemeral execution sandbox. Next:
- **Phase 18 (Execution Telemetry, Artifact Capture & Run State Machine Integration):** Will connect sandbox execution with durable database persistence in `public.agent_runs`, task state transitions (`executing` -> `completed` / `failed`), and dual-channel telemetry reporting to the Web Dashboard and Telegram (`REQ-EX-04`).
