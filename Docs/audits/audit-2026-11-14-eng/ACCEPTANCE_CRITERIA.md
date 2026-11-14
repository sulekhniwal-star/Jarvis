# JARVIS — ACCEPTANCE CRITERIA FOR REMEDIATION
**Audit ID:** `AUDIT-2026-11-14-ENG`  
**Date:** November 14, 2026  
**Auditor:** Independent Quality Assurance & Verification Engineer  
**Purpose:** Objective, testable, and automated pass/fail verification criteria for Phase B remediation tasks.

---

## 1. Acceptance Criteria: Phase B.1 (P0 Critical Blockers)

### 1.1 REM-P0-01: LangGraph State Machine Unification
- [ ] Calling `approve_and_execute_task(session, task_id, user_id)` initializes `TaskGraphState` and invokes `build_task_workflow().ainvoke()`.
- [ ] Step progression in the database (`TaskStep`) strictly corresponds to node execution (`planner` → `approval_gate` → `executor` → `tester` → `diagnoser` → `pr_generator`).
- [ ] If tests fail during execution, the graph transitions to `diagnoser`, increments `retry_count`, and triggers a repair cycle up to `max_retries`.
- [ ] Automated integration test demonstrates full graph traversal from API entrypoint to terminal state.

### 1.2 REM-P0-02: Asynchronous Background Task Dispatcher
- [ ] `POST /api/v1/tasks/{id}/execute` returns HTTP status `202 Accepted` within < 200 ms, returning the task in `status="EXECUTING"`.
- [ ] Tasks submitted via Telegram `/task <prompt>` are placed in `status="PENDING"` and picked up automatically by the background worker daemon within 5 seconds without manual API invocation.
- [ ] Background worker catches unhandled exceptions, marks the task as `status="FAILED"`, logs error diagnostics, and notifies the operator via Telegram.

### 1.3 REM-P0-03: Real Source Code in GitHub PRs
- [ ] For every completed coding task targeting a GitHub repository, the opened Pull Request contains the exact source code files modified in `workspaces/task_{id}/`.
- [ ] A multi-file modification task (e.g. creating `src/calculator.py` and updating `tests/test_calculator.py`) reflects all created and edited files in the PR diff.
- [ ] The PR body contains the verified test execution evidence, exit code, and summary.
- [ ] Automated mock integration test verifies `GitHubService.create_or_update_file` is called for every modified file before `create_pull_request`.

### 1.4 REM-P0-04: Emergency Stop Enforcement on Ingestion
- [ ] When `/api/v1/system/emergency-stop` is called, `_get_system_status()` returns `{"status": "LOCKED"}`.
- [ ] Subsequent calls to `POST /api/v1/tasks` return HTTP status `423 Locked` with detail `"System is locked by emergency kill-switch"`.
- [ ] Subsequent messages to Telegram `/task <prompt>` receive an immediate reply: `"🚨 System is currently in emergency lockdown. Tasks cannot be accepted."` and no task record is created.
- [ ] Calling `/api/v1/system/resume` restores `status="OPERATIONAL"`, allowing normal task intake.

### 1.5 REM-P0-05: Clean Test Database Startup
- [ ] Running `pytest backend/tests` twice consecutively passes 100% of tests without manual deletion of `backend/tests/test_suite.db`.
- [ ] Simulating an interrupted test run (creating `test_suite.db` with duplicate `users` records) does not cause subsequent pytest runs to fail.

---

## 2. Acceptance Criteria: Phase B.2 (P1 Security & Reliability)

### 2.1 REM-P1-01: Elimination of Hardcoded Password Fallbacks (`VULN-01`)
- [ ] Code search for `"jarvis_secure_initial_password_2026"` and `"ZymmgxGdhlZLxp1I_EFDPA"` yields 0 occurrences in `backend/app/`.
- [ ] Calling `/api/v1/auth/login` with any password other than the owner's explicitly configured password returns HTTP status `401 Unauthorized`.
- [ ] Password verification solely utilizes `verify_password(password, user.hashed_password)`.

### 2.2 REM-P1-02: Protected Security Components Guard (`VULN-03`)
- [ ] An autonomous agent attempt to write or overwrite `app/core/security.py`, `app/workers/command_policy.py`, or `app/services/approval_service.py` inside the sandbox immediately raises `ProtectedComponentViolation`.
- [ ] Attempted violation is recorded in `AuditLog` with action `"PROTECTED_COMPONENT_WRITE_BLOCKED"`.
- [ ] The task is marked as `FAILED` with an explicit security alert notification sent to Telegram.

### 2.3 REM-P1-03: Telegram Inline Button Argument Correction (`VULN-04`)
- [ ] Clicking an inline Telegram approval button (`approve_{id}`) passes `decided_by_user_id=owner_user_id` and `reason="Approved via Telegram one-tap inline button"`.
- [ ] The resulting `AuditLog` entry has `actor_id` equal to the actual user ID (UUID or owner username), and `metadata["reason"]` contains `"Approved via Telegram one-tap inline button"`.

### 2.4 REM-P1-04: Persistent LangGraph Checkpointing
- [ ] Starting a task that requires approval pauses the graph before `approval_gate`.
- [ ] Terminating and restarting the backend server process retains the task checkpoint.
- [ ] Calling `/api/v1/approvals/{id}/decide` successfully resumes graph execution from the persisted checkpoint without restarting from the intake node.

---

## 3. Acceptance Criteria: Phase B.3 (P2 Precision & Intelligence)

### 3.1 REM-P2-01: Unified Diff / Chunk Patch Engine
- [ ] Coding agent edits large files (> 500 lines) by applying unified diffs or search-and-replace blocks without truncating unedited functions or file headers.
- [ ] If a patch fails to apply cleanly (fuzzy match failure), the agent triggers diagnostic replanning with the exact conflict rejected chunk.

### 3.2 REM-P2-02: Codebase Context Discovery
- [ ] Coding agent locates relevant files across a 100+ file repository using symbol indexing or search, rather than reading the first 5 arbitrary files.
- [ ] Relevant test files are automatically paired with their corresponding implementation files.

### 3.3 REM-P2-03: Pre-PR Security & Scope Scanner
- [ ] Before opening a PR, the diff is scanned for tokens matching `_SECRET_PATTERNS`. If a secret is detected, the PR is aborted and an alert is logged.
- [ ] Files outside the declared task scope are flagged for human confirmation before push.

---

## 4. Acceptance Criteria: Phase B.4 (P3 Production Readiness)

### 4.1 REM-P3-01: Unified Multi-Service Docker Compose
- [ ] Running `docker compose up --build` launches:
  1. `jarvis-backend` (FastAPI API on port 8000)
  2. `jarvis-frontend` (Next.js 15 on port 3000)
  3. `jarvis-worker` (Background task queue consumer & Telegram daemon)
  4. `jarvis-db` (PostgreSQL 16)
- [ ] All services pass health checks (`/api/v1/health` returns status `200 OK`).
- [ ] Frontend successfully communicates with backend over internal Docker network.
