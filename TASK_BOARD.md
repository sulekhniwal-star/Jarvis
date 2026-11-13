# Project Jarvis — Task Board

**Last Updated:** 2026-11-13  
**Status:** Milestone 4 Complete — Ready for Milestone 5  

---

## Status Definitions
- **Done:** Completed, verified, and documented.
- **In Progress:** Currently being designed or implemented.
- **Ready:** Specified and unblocked, queued for implementation.
- **Blocked:** Waiting on external dependency or decision.

---

## Milestone Tracking

### Milestone 0: Research and Specification (COMPLETED)
- [x] **M0.1:** Research current official documentation & stable versions (Python 3.12, FastAPI, LangGraph, Next.js 15, PostgreSQL 16).
- [x] **M0.2:** Verify model provider pricing, free-tier quotas, and data privacy policies.
- [x] **M0.3:** Verify hosting, free-tier constraints (Supabase 500MB DB & 7-day pause rule, GitHub Actions 2,000 mins/mo).
- [x] **M0.4:** Complete STRIDE Threat Model & OWASP Top 10 for LLMs security analysis (`THREAT_MODEL.md`).
- [x] **M0.5:** Author Technology Decision Register (`TECH_STACK.md`) and Architectural Decision Records (`DECISION_LOG.md`).
- [x] **M0.6:** Specify Bifurcated Enclave Architecture & Task State Machine (`SYSTEM_ARCHITECTURE.md`).
- [x] **M0.7:** Inspect development environment (Windows 11, Node.js v24.22.1, npm 11.19.1, Git 2.45.1, winget v1.30; Python 3.12 verified installed).
- [x] **M0.8:** Establish repository structure and backend/frontend directory layout.

---

### Milestone 1: Core Foundation (COMPLETED)
- [x] **M1.1:** Setup Python backend virtual environment / project files (`pyproject.toml`, FastAPI app skeleton).
- [x] **M1.2:** Implement database models (SQLAlchemy 2.0 Async: `User`, `Project`, `Task`, `TaskStep`, `Execution`, `Approval`, `AuditEvent`).
- [x] **M1.3:** Implement Authentication service (Argon2id hashing, JWT session bearer tokens, single-owner allowlist).
- [x] **M1.4:** Implement Task CRUD API (`/api/v1/tasks`) with server-side state machine validation and cancellation.
- [x] **M1.5:** Implement Audit Logging service (`audit_events` table with secret redaction filter).
- [x] **M1.6:** Implement Mock AI Provider for offline, deterministic testing.
- [x] **M1.7:** Scaffold Next.js 15 TypeScript mobile-first dashboard skeleton (`frontend/`).
- [x] **M1.8:** Write automated unit, integration, and security tests (15 tests passing in 2.85s).

---

### Milestone 2: Agent Orchestration (COMPLETED)
- [x] **M2.1:** Implement LangGraph `StateGraph` task workflow with checkpointer (`MemorySaver` / `AsyncPostgresSaver`).
- [x] **M2.2:** Implement Task Planner node (breaking prompts into deterministic task steps and detecting sensitive actions).
- [x] **M2.3:** Implement Human-in-the-Loop approval interrupt node (`interrupt_before=["approval_gate"]`).
- [x] **M2.4:** Implement pause, resume, diagnostic retry loop, and rejection handling.
- [x] **M2.5:** Test workflow durability across simulated coordinator restart (all 5 orchestration tests passing in 0.65s).

---

### Milestone 3: GitHub Integration (COMPLETED)
- [x] **M3.1:** Implement GitHub App JWT generator (RS256) and ephemeral installation token requester (`services/github_app_auth.py`).
- [x] **M3.2:** Implement repository access validator enforcing strict organization and repo allowlists (`services/github_service.py`).
- [x] **M3.3:** Implement Git branch manager with protected branch guard preventing direct pushes to `main`/`master`.
- [x] **M3.4:** Implement Pull Request generator with structured markdown, test evidence, and human review requirement.
- [x] **M3.5:** Implement GitHub Webhook signature validator (`X-Hub-Signature-256`) using constant-time HMAC-SHA256 comparison (`api/v1/webhooks.py`).

---

### Milestone 4: Coding Execution & Sandboxing (COMPLETED)
- [x] **M4.1:** Implement disposable execution runner interface (`LocalSandboxRunner` with timeout and subprocess management).
- [x] **M4.2:** Implement filesystem tool suite with strict path sandboxing (`SandboxedFilesystem` blocking directory traversal outside workspace).
- [x] **M4.3:** Implement command execution engine with strict allowlist and timeout limits (`validate_and_tokenize_command`).
- [x] **M4.4:** Implement test execution parser (`parse_test_results` capturing exit code 0 vs non-zero).
- [x] **M4.5:** Implement diagnostic retry loop in autonomous coding agent (`CodingAgent` verified against a real test codebase).

---

### Milestone 5: User Interfaces (Telegram & Web Dashboard) (COMPLETED)
- [x] **M5.1:** Implement Telegram Bot service with strict `from.id` allowlist and MarkdownV2 safe escaping (`services/telegram_service.py`).
- [x] **M5.2:** Implement Telegram command handlers (`/start`, `/task`, `/status`, `/emergency_stop`).
- [x] **M5.3:** Build Next.js 15 mobile-friendly dashboard views (Task status, active tasks, log viewers, emergency kill switch in `frontend/src/app/page.tsx`).
- [x] **M5.4:** Implement system kill-switch API endpoints (`/api/v1/system/emergency-stop`, `/resume`, `/status`) and integration test suite (`test_m5_interfaces.py`).

---

### Milestone 6: Memory, Security & Recovery (COMPLETED)
- [x] **M6.1:** Implement Project Memory & Shared Preferences service (`models/memory.py`, `services/memory_service.py`, `api/v1/memories.py`).
- [x] **M6.2:** Implement automated secret rejection filter for memory storage preventing credential leaks into long-term context (`contains_secret`).
- [x] **M6.3:** Implement Emergency Shutdown switch and system status lockdown (`api/v1/system.py`).
- [x] **M6.4:** Implement automated database backup and restore script with AES-256 Fernet encryption and SHA-256 integrity validation (`scripts/backup_db.py`, `scripts/restore_db.py`).
- [x] **M6.5:** Execute security test suite verifying prompt injection defense, filesystem traversal containment, and backup integrity (`test_m6_security.py`).

---

### Milestone 7: Supervised Self-Improvement (Current Milestone)
- [ ] **M7.1:** Implement read-only self-analysis of the Jarvis repository.
- [ ] **M7.2:** Implement isolated self-improvement branch creation and execution.
- [ ] **M7.3:** Enforce human review gating for self-improvement Pull Requests.
