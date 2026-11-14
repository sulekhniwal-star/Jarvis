# JARVIS — REMEDIATION ROADMAP
**Audit ID:** `AUDIT-2026-11-14-ENG`  
**Date:** November 14, 2026  
**Auditor:** Independent Principal Technical Architecture & Remediation Board  
**Operating Governance:** Prioritized backlog for Phase B (requires explicit owner approval: `APPROVED — BEGIN REMEDIATION`).

---

## 1. Remediation Strategy & Phasing

Remediation is structured into four sequential phases based on risk severity, architectural decoupling, and functional blockers:
- **Phase B.1: Critical Architectural & Dispatch Unification (P0)** — Connect the LangGraph engine to the production task flow, introduce asynchronous background execution, commit real code diffs to GitHub, enforce the emergency stop lock on intake, and eliminate the test harness collision bug.
- **Phase B.2: Security Hardening & Reliability Guarantees (P1)** — Eliminate hardcoded password fallbacks, enforce protected core component guards during file writes, correct Telegram inline button parameter transposition, and replace volatile in-memory checkpointers with persistent storage.
- **Phase B.3: Agent Capability & Precision Code Modification (P2)** — Transition from whole-file overwrites to unified diffs, upgrade context discovery from naive `files[:5]` to symbol indexing, and add pre-PR secret scanning.
- **Phase B.4: Production Infrastructure & Full-Stack Polish (P3)** — Complete multi-service Docker Compose deployment, frontend component test coverage, and end-to-end tracing.

---

## 2. Prioritized Task Backlog

### Phase B.1 — P0 Critical Blockers (Must Complete Before Any Deployment)

| Task ID | Title & Summary | Affected Files | Effort | Dependencies |
|---|---|---|:---:|:---:|
| **REM-P0-01** | **Unify Task Execution with LangGraph StateGraph**<br>Refactor `task_service.approve_and_execute_task()` to invoke `build_task_workflow().ainvoke()` instead of ad-hoc linear execution. | `backend/app/services/task_service.py`<br>`backend/app/orchestrator/workflow.py` | 4h | None |
| **REM-P0-02** | **Implement Asynchronous Background Task Dispatcher**<br>Convert `POST /api/v1/tasks/{id}/execute` to return `202 Accepted`. Create an async worker loop in `cloud_entrypoint.py` that polls for `PENDING` tasks and executes them. | `backend/app/api/v1/tasks.py`<br>`backend/app/cloud_entrypoint.py`<br>`backend/app/services/task_service.py` | 6h | REM-P0-01 |
| **REM-P0-03** | **Commit Modified Source Code to GitHub Pull Requests**<br>Refactor GitHub PR generator to discover all modified files in `workspaces/task_{id}/`, stage each file via `GitHubService.create_or_update_file()`, and link unified diff to PR. | `backend/app/services/task_service.py`<br>`backend/app/orchestrator/nodes.py`<br>`backend/app/services/github_service.py` | 4h | REM-P0-01 |
| **REM-P0-04** | **Enforce Emergency Stop Check on Task Ingestion**<br>In `task_service.create_task()` and `telegram_service.py`, check `_get_system_status()`. Reject task intake with HTTP 423 when status is `"LOCKED"`. | `backend/app/services/task_service.py`<br>`backend/app/services/telegram_service.py` | 2h | None |
| **REM-P0-05** | **Fix Test Harness SQLite State Poisoning**<br>Ensure `test_suite.db` is dropped or truncated on test setup in `conftest.py` to prevent cascading `UNIQUE constraint failed: users.username` errors. | `backend/tests/conftest.py` | 1h | None |

---

### Phase B.2 — P1 Security Hardening & Reliability (High Priority)

| Task ID | Title & Summary | Affected Files | Effort | Dependencies |
|---|---|---|:---:|:---:|
| **REM-P1-01** | **Eliminate Hardcoded Initial Passwords (`VULN-01`)**<br>Remove string fallbacks (`jarvis_secure_initial_password_2026`, `ZymmgxGdhlZLxp1I_EFDPA`) from `authenticate_owner()`. Strictly verify Argon2id hash. | `backend/app/services/auth_service.py` | 1h | None |
| **REM-P1-02** | **Enforce Protected Components Guard in Sandbox Writes (`VULN-03`)**<br>Wire `SelfImprovementService.validate_modification_target()` into `SandboxedFilesystem.write_file()` to prevent model overwriting security files. | `backend/app/workers/filesystem.py`<br>`backend/app/workers/coding_agent.py` | 2h | None |
| **REM-P1-03** | **Fix Parameter Order in Telegram Inline Approval Callbacks (`VULN-04`)**<br>Pass `decided_by_user_id` and `reason` as explicit keyword arguments to `evaluate_approval()` in inline button handler. | `backend/app/services/telegram_service.py` | 1h | None |
| **REM-P1-04** | **Replace In-Memory Checkpointer with Persistent Storage**<br>Implement SQLite or PostgreSQL backed checkpoint saver for LangGraph so state survives container restarts. | `backend/app/orchestrator/workflow.py` | 4h | REM-P0-01 |
| **REM-P1-05** | **Add Test Coverage for Cloud Entrypoint Daemon**<br>Write automated tests verifying concurrent Uvicorn startup, Telegram listener initialization, and shutdown signal handling. | `backend/tests/unit/test_cloud_entrypoint.py` | 3h | REM-P0-02 |

---

### Phase B.3 — P2 Agent Precision & Operational Excellence (Medium Priority)

| Task ID | Title & Summary | Affected Files | Effort | Dependencies |
|---|---|---|:---:|:---:|
| **REM-P2-01** | **Implement Unified Diff / Patch Engine in Coding Agent**<br>Replace whole-file overwrites with unified diff parsing or search-and-replace block edits to prevent file truncations on large modules. | `backend/app/workers/coding_agent.py` | 6h | None |
| **REM-P2-02** | **Implement Codebase Symbol & Grep Search for Context**<br>Replace naive `files[:5]` scoping with AST-based symbol locator or ripgrep search tool to discover relevant context in large repos. | `backend/app/workers/coding_agent.py`<br>`backend/app/workers/filesystem.py` | 5h | None |
| **REM-P2-03** | **Pre-PR Diff Security & Secret Scanner**<br>Scan generated diffs for leaked secrets (API keys, private keys) and unauthorized file changes before pushing branches to GitHub. | `backend/app/services/github_service.py`<br>`backend/app/services/memory_service.py` | 3h | REM-P0-03 |
| **REM-P2-04** | **Disposable Workspace Pruning & Garbage Collection**<br>Add automated routine to prune `workspaces/task_*` older than 7 days or after successful PR merge. | `backend/app/services/task_service.py` | 2h | None |

---

### Phase B.4 — P3 Infrastructure & Observability (Polish)

| Task ID | Title & Summary | Affected Files | Effort | Dependencies |
|---|---|---|:---:|:---:|
| **REM-P3-01** | **Multi-Service Docker Compose Production Bundle**<br>Provide unified `docker-compose.yml` orchestrating FastAPI, Next.js frontend, background worker daemon, and PostgreSQL. | `docker-compose.yml`<br>`docker/` | 4h | REM-P0-02 |
| **REM-P3-02** | **Frontend Component & Integration Tests**<br>Add Vitest / Playwright tests for Web HUD components (`MissionManifest`, `DiffViewerModal`, `PendingApprovalsModal`). | `frontend/__tests__/` | 6h | None |
| **REM-P3-03** | **OpenTelemetry & Sentry Tracing Integration**<br>Wire `@sentry/nextjs` in frontend and OpenTelemetry spans across LangGraph nodes for distributed tracing. | `frontend/sentry.*.config.ts`<br>`backend/app/middleware/trace_middleware.py` | 3h | None |

---

## 3. Total Estimated Effort & Governance Gate

- **Total Estimated Engineering Effort:** ~50 hours (Phase B.1: 17h, Phase B.2: 11h, Phase B.3: 16h, Phase B.4: 13h).
- **Owner Approval Gate:**  
  Per Part 2 of the Autonomous Engineering Operating Protocol, **no remediation changes will be made to application source files** until explicit owner authorization is provided:
  ```
  APPROVED — BEGIN REMEDIATION
  ```
