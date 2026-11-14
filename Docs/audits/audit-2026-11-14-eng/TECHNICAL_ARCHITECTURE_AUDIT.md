# JARVIS — TECHNICAL ARCHITECTURE AUDIT
**Audit ID:** `AUDIT-2026-11-14-ENG`  
**Date:** November 14, 2026  
**Auditor:** Independent Principal Software & Distributed Systems Architect  
**Subject:** Technical Architecture, Component Boundaries, Runtime Mechanics & Architectural Drift

---

## 1. Architectural Blueprint: Specification vs Reality

The authoritative documentation baseline (`docs/system_architecture.md`, `docs/adrs/ADR-004-execution-sandbox.md`, `docs/adrs/ADR-013-openrouter-primary-ai-provider.md`) describes a decoupled, event-driven, graph-orchestrated autonomous engineering assistant.

### 1.1 Documented Target Architecture
```
[User Interfaces]
   │
   ├── Next.js 15 Web HUD (REST + SSE/WebSocket)
   └── Telegram Bot (Long-polling / Webhooks)
         │
         ▼
[FastAPI Gateway / Ingestion Engine]
   │ (Idempotency, Auth, Rate Limiting)
   ▼
[Task Store (PostgreSQL / SQLite via SQLAlchemy 2.0 Async)]
   │
   ▼
[LangGraph Orchestrator (StateGraph)]
   │
   ├── Planner Node (OpenRouter auto / Fallback Cascade)
   ├── Approval Gate Node (Human-in-the-Loop Interrupt)
   ├── Executor Node (Sandboxed Workspace Generation)
   ├── Tester Node (CommandPolicy Vetted Pytest / Vitest Runner)
   ├── Diagnoser Node (Iterative Failure Context Reflection)
   └── PR Generator Node (GitHub App API / Feature Branch & Diff)
         │
         ▼
[Local Sandbox Worker Plane (LocalSandboxRunner + SandboxedFilesystem)]
```

### 1.2 Actual Runtime Architecture (Discovered During Audit)
```
[User Interfaces]
   ├── Next.js 15 Web HUD ─── (REST Calls) ───► [FastAPI Gateway]
   └── Telegram Bot ───────── (Long Polling) ──► [FastAPI Gateway]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
                       ▼                                                             ▼
           [POST /tasks (Intake)]                                      [POST /tasks/{id}/execute]
                       │                                                             │
         Writes Task (status="PENDING")                                Synchronous Execution Block
                       │                                                             │
                [DANGLING STATE]                                         Bypasses LangGraph Workflow!
           (No background worker polls                                   Directly invokes:
            or executes PENDING tasks)                                   CodingAgent(LocalSandboxRunner)
                                                                         - test_command="python --version"
                                                                         - Naive files[:5] context
                                                                         - Whole-file overwrite
                                                                         - Commits Markdown Report to PR
                                                                           (Source code changes dropped!)

[LangGraph StateGraph Engine (app/orchestrator/workflow.py)]
   ▲
   └── ONLY executed within `backend/tests/integration/test_m2_orchestration.py`
```

---

## 2. Component Inventory & Service Boundaries

| Component / Layer | Module Path | Primary Responsibility | Discovered State & Deficiencies |
|---|---|---|---|
| **API Layer** | `app/api/v1/` | REST endpoint routing, request validation, response serialization. | Fully functional. Endpoints: `auth`, `tasks`, `approvals`, `memories`, `projects`, `system`, `webhooks`, `health`. |
| **Core Layer** | `app/core/` | Configuration (`config.py`), database connection (`database.py`), cryptography & JWT (`security.py`). | Solid Argon2id hashing, AES token encryption. Fallback passwords in `auth_service.py` need hardening. |
| **Model Layer** | `app/models/` | SQLAlchemy ORM declarative models (`user`, `task`, `approval`, `memory`, `project`, `audit`). | Strict typing with `Mapped` and `mapped_column`, UTC timestamps, foreign keys with indexes. |
| **Orchestrator** | `app/orchestrator/` | LangGraph `StateGraph`, node handlers (`nodes.py`), state schema (`state.py`), routing logic. | Complete 8-node state machine with conditional branching, but isolated from the API task dispatch route. |
| **AI Provider** | `app/providers/` | Multi-model routing, OpenRouter client, token & budget tracking. | Excellent implementation. Supports `openrouter/auto`, fallback cascade to OpenAI/Gemini, structured token telemetry. |
| **Services Layer** | `app/services/` | Business domain services: `task_service`, `approval_service`, `audit_service`, `memory_service`, `telegram_service`, `github_service`, `project_auditor`, `self_improvement`. | High quality, but `task_service.py` has duplicate execution logic that should delegate to `app/orchestrator/workflow.py`. |
| **Workers Layer** | `app/workers/` | Execution sandbox (`filesystem.py`, `command_policy.py`, `runner.py`, `coding_agent.py`, `test_parser.py`). | Isolated filesystem with path traversal blocking; command allowlist. `CodingAgent` lacks diff-based editing and semantic search. |
| **Daemon Entry** | `app/cloud_entrypoint.py` | 24/7 cloud container startup running Uvicorn and Telegram listener in `asyncio.gather`. | Zero test coverage (0%); lacks background task worker loop. |
| **Web HUD** | `frontend/src/` | Next.js 15 dashboard with mission feeds, diff viewer, telemetry, approvals. | TypeScript compiles cleanly (0 errors); Next.js production build passes in 4.2s. |

---

## 3. Deep-Dive: Architectural Drift Analysis

### 3.1 LangGraph Orchestration vs `task_service.py` Execution
- **Specification:** ADR-002 and `docs/system_architecture.md` specify that task lifecycles are governed by a LangGraph compiled graph with durable checkpointers, allowing interrupt/resume around human approvals.
- **Implementation Finding:**  
  `backend/app/orchestrator/workflow.py` builds and compiles `StateGraph(TaskGraphState)`. However, `backend/app/services/task_service.py` lines 204–237 implements an ad-hoc, linear execution routine when `approve_and_execute_task` is called. It creates `CodingAgent(runner=runner, ai_provider=provider)` and executes it directly.
- **Architectural Consequence:**  
  The diagnoser node, retry conditions, automated test-failure reflection, and interrupt recovery present in the LangGraph graph are not exercised during real user executions.

### 3.2 Synchronous HTTP Execution vs Asynchronous Queue
- **Specification:** Tasks should be accepted asynchronously, returning `202 Accepted` or `201 Created`, while background workers execute long-running coding loops.
- **Implementation Finding:**  
  In `backend/app/api/v1/tasks.py` (lines 74–83), calling `POST /api/v1/tasks/{task_id}/execute` directly awaits `approve_and_execute_task()`.
- **Architectural Consequence:**  
  The HTTP request remains open for the entire duration of the AI code generation, sandbox file writes, test runner execution, and GitHub API calls (often 30–90+ seconds). Any network blip or gateway timeout (e.g. Cloudflare 100s timeout, Render 30s proxy timeout) kills the task prematurely.

### 3.3 GitHub PR Generation: Report vs Source Code
- **Specification:** `docs/adrs/ADR-003-github-integration.md` states: *"Jarvis commits the validated code changes onto an isolated branch and opens a Pull Request for human review."*
- **Implementation Finding:**  
  In `backend/app/services/task_service.py` (lines 268–297):
  ```python
  report_path = f".jarvis/reports/mission_{task.id[:8]}.md"
  # ... constructs markdown report ...
  await gh.create_or_update_file(
      repository=target_repo,
      path=report_path,
      content=report_content,
      commit_message=f"feat(jarvis): autonomous mission {task.id[:8]} execution report",
      branch=branch_name,
  )
  ```
  The code modifications written to `workspace_dir` are never inspected, staged, or committed to GitHub! Only the `.jarvis/reports/mission_{id}.md` file is committed.
- **Architectural Consequence:**  
  The PR created on GitHub contains only a Markdown report and zero code changes, completely defeating the purpose of an autonomous coding agent.

### 3.4 In-Memory Checkpointing Vulnerability
- **Specification:** State must survive server restarts and network interruptions.
- **Implementation Finding:**  
  `backend/app/orchestrator/workflow.py` line 103 defaults to `MemorySaver()`:
  ```python
  saver = checkpointer if checkpointer is not None else MemorySaver()
  return builder.compile(checkpointer=saver, interrupt_before=["approval_gate"])
  ```
- **Architectural Consequence:**  
  If Jarvis restarts (or Render/Railway restarts the container) while an approval is pending, the in-memory checkpoint is obliterated, leaving the task in an un-resumable state.

---

## 4. Architectural Strengths

1. **Sandboxed Filesystem Security:** `SandboxedFilesystem` in `backend/app/workers/filesystem.py` uses `Path.resolve()` and `target.relative_to(self.workspace_root)` to block path traversal, symlink escapes, and Windows drive letter jumps with absolute rigor.
2. **Command Tokenization & Allowlist:** `validate_and_tokenize_command()` in `backend/app/workers/command_policy.py` disallows shell meta-characters (`;`, `&&`, `|`, `` ` ``, `$`), splits arguments safely with `shlex`, and restricts binaries strictly to an approved allowlist. Subprocess execution in `runner.py` uses `asyncio.create_subprocess_exec` with `shell=False`.
3. **Multi-Model Provider Architecture:** `OpenRouterProvider` in `backend/app/providers/openrouter.py` gracefully supports dynamic routing via `openrouter/auto`, tracks prompt and completion tokens, calculates INR costs, and provides fallback capabilities to OpenAI and Gemini.
4. **Clean SQLAlchemy Async Stack:** The database layer uses modern SQLAlchemy 2.0 with async sessions, explicit transaction commits, selectinload eager-loading to avoid N+1 queries, and Alembic migrations.

---

## 5. Architectural Debt & Remediation Directives

| Debt ID | Architectural Area | Problem Description | Recommended Remedy | Target Phase |
|---|---|---|---|:---:|
| **ARCH-01** | Orchestrator Integration | Production API bypasses LangGraph workflow in `task_service.py`. | Refactor `approve_and_execute_task` to execute `build_task_workflow().ainvoke()`. | Phase B.1 |
| **ARCH-02** | Background Processing | Synchronous HTTP execution blocks API; no background worker for `PENDING` tasks. | Introduce an `asyncio` background task worker or ARQ/Redis queue to dispatch pending tasks. | Phase B.1 |
| **ARCH-03** | PR Code Commit | Only Markdown reports committed to GitHub PRs; sandbox code changes dropped. | Inspect sandbox workspace, gather git diff or file changes, and commit all modified source files. | Phase B.1 |
| **ARCH-04** | State Checkpointing | In-memory `MemorySaver` drops graph state on container restarts. | Implement `SqliteSaver` or Postgres checkpointer using SQLAlchemy connection. | Phase B.2 |
| **ARCH-05** | Agent Context Scoping | `CodingAgent` naively reads `files[:5]` and overwrites entire files. | Add symbol indexer / ripgrep search tool and unified diff / search-and-replace patch engine. | Phase B.3 |
