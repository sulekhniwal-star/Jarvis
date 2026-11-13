# Project Jarvis — Task Board

**Last Updated:** 2026-11-13  
**Status:** Milestone 0 Complete — Ready for Milestone 1

---

## Status Definitions

- **Done:** Completed, verified, and documented.
- **In Progress:** Currently being designed or implemented.
- **Ready:** Specified and unblocked, queued for implementation.
- **Blocked:** Waiting on external dependency or decision.

---

## Milestone Tracking

### Milestone 0: Research and Specification (Current)

- [x] **M0.1:** Research current official documentation & stable versions (Python 3.12, FastAPI, LangGraph, Next.js 15, PostgreSQL 16).
- [x] **M0.2:** Verify model provider pricing, free-tier quotas, and data privacy policies (Google AI Studio prompt training policy documented).
- [x] **M0.3:** Verify hosting, free-tier constraints (Supabase 500MB DB & 7-day pause rule, GitHub Actions 2,000 mins/mo).
- [x] **M0.4:** Complete STRIDE Threat Model & OWASP Top 10 for LLMs security analysis (`THREAT_MODEL.md`).
- [x] **M0.5:** Author Technology Decision Register (`TECH_STACK.md`) and Architectural Decision Records (`DECISION_LOG.md`).
- [x] **M0.6:** Specify Bifurcated Enclave Architecture & Task State Machine (`SYSTEM_ARCHITECTURE.md`).
- [x] **M0.7:** Inspect development environment (Windows 11, Node.js v24.22.1, npm 11.19.1, Git 2.45.1, winget v1.30; Python & Docker absent).
- [x] **M0.8:** Establish repository structure and backend/frontend directory layout.

---

### Milestone 1: Core Foundation (Next Up)

- [ ] **M1.1:** Setup Python backend virtual environment / project files (`pyproject.toml`, FastAPI app skeleton).
- [ ] **M1.2:** Implement database models (SQLAlchemy 2.0 Async) and initial Alembic migration.
- [ ] **M1.3:** Implement Authentication service (Argon2id hashing, JWT session cookies, single-owner allowlist).
- [ ] **M1.4:** Implement Task CRUD API (`/api/v1/tasks`) with server-side state machine validation.
- [ ] **M1.5:** Implement Audit Logging service (`audit_events` table).
- [ ] **M1.6:** Implement Mock AI Provider for offline, deterministic testing.
- [ ] **M1.7:** Scaffold Next.js 15 TypeScript dashboard skeleton.
- [ ] **M1.8:** Write automated unit and integration tests (Pytest + httpx AsyncClient).

---

### Milestone 2: Agent Orchestration

- [ ] **M2.1:** Implement LangGraph `StateGraph` task workflow with `AsyncPostgresSaver`.
- [ ] **M2.2:** Implement Task Planner node (breaking prompts into deterministic task steps).
- [ ] **M2.3:** Implement Human-in-the-Loop approval interrupt node.
- [ ] **M2.4:** Implement pause, resume, and cancellation mechanics.
- [ ] **M2.5:** Test workflow durability across simulated coordinator restart.

---

### Milestone 3: GitHub Integration

- [ ] **M3.1:** Implement GitHub App JWT generator (RS256) and ephemeral installation token requester.
- [ ] **M3.2:** Implement repository access validator (restrict access exclusively to designated private repo).
- [ ] **M3.3:** Implement Git branch manager (create `jarvis/task-...` branches).
- [ ] **M3.4:** Implement Pull Request generator with structured test evidence and diff summary.
- [ ] **M3.5:** Implement GitHub Webhook signature validator (`X-Hub-Signature-256`).

---

### Milestone 4: Coding Execution & Sandboxing

- [ ] **M4.1:** Implement disposable execution runner interface (GitHub Actions workflow dispatcher & local Docker worker).
- [ ] **M4.2:** Implement filesystem tool suite with strict path sandboxing.
- [ ] **M4.3:** Implement command execution engine with strict allowlist and timeout limits.
- [ ] **M4.4:** Implement test execution parser (capturing exit code 0 vs non-zero, extracting test output).
- [ ] **M4.5:** Implement diagnostic retry loop (analyze error trace, retry within budget of 3).

---

### Milestone 5: User Interfaces (Telegram & Web Dashboard)

- [ ] **M5.1:** Implement Telegram Bot listener (Long Polling mode with strict `from.id` allowlist).
- [ ] **M5.2:** Implement Telegram command handlers (`/start`, `/task`, `/status`, `/emergency_stop`).
- [ ] **M5.3:** Build Next.js 15 mobile-friendly dashboard views (Task List, Task Detail, Live Log Viewer).
- [ ] **M5.4:** Build Approval Modal on dashboard with canonical parameter inspection and one-click approve/reject.

---

### Milestone 6: Memory, Security & Recovery

- [ ] **M6.1:** Implement Project Memory & Shared Preferences service.
- [ ] **M6.2:** Implement automated secret redaction filter for logs and external messages.
- [ ] **M6.3:** Implement Emergency Shutdown switch (cancels active runs, revokes tokens).
- [ ] **M6.4:** Implement automated database backup script (`pg_dump` + AES-256 encryption) and restore test.
- [ ] **M6.5:** Execute security test suite (prompt injection simulation, path traversal attacks, approval tampering).

---

### Milestone 7: Supervised Self-Improvement

- [ ] **M7.1:** Implement read-only self-analysis of the Jarvis repository.
- [ ] **M7.2:** Implement isolated self-improvement branch creation and execution.
- [ ] **M7.3:** Enforce human review gating for self-improvement Pull Requests.
