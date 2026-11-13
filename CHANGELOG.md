# Changelog

All notable changes to Project Jarvis are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0-m5] - 2026-11-13 — Milestone 5: User Interfaces (Telegram & Web Dashboard)

### Added
- **Telegram Service (`services/telegram_service.py`):** Implemented Telegram Bot service with strict `from.id` identity allowlisting (unauthorized messages are silently dropped and logged to audit), MarkdownV2 escaping, command intake (`/start`, `/task`, `/status`, `/emergency_stop`), and task completion notifications with Pull Request links.
- **System Emergency Stop (`api/v1/system.py`):** Added emergency lockdown endpoints (`POST /api/v1/system/emergency-stop`, `POST /api/v1/system/resume`, `GET /api/v1/system/status`) that instantly halt executing tasks and lock system intake.
- **Mobile-First Web Dashboard (`frontend/src/app/page.tsx`):** Enhanced Next.js 15 dashboard with responsive mobile layouts, real-time task cards, active approval action buttons, and a header emergency kill-switch.
- **Unified Test Fixture Architecture (`backend/tests/conftest.py`):** Centralized file-backed SQLite database lifecycle with full model registration, preventing connection collisions and ensuring 100% test isolation.
- **Automated Verification:** Added 5 interface integration tests (`backend/tests/integration/test_m5_interfaces.py`). All 34 tests passing across the repository.

---

## [0.5.0-m4] - 2026-11-13 — Milestone 4: Coding Execution & Sandboxing

### Added
- **Sandboxed Filesystem (`workers/filesystem.py`):** Implemented strict directory containment checks preventing path traversal (`../`), symlink escapes, or access to sensitive host directories outside the task workspace.
- **Command Policy & Allowlist Engine (`workers/command_policy.py`):** Added argument tokenizer and whitelist engine allowing only vetted developer utilities (`pytest`, `python`, `git`, `npm`, `ruff`) while blocking dangerous utilities (`curl`, `wget`, `nc`, `rm`, `chmod`) and shell chaining meta-characters (`;`, `&&`, `|`, `>`, `$()`).
- **Honest Test Execution Parser (`workers/test_parser.py`):** Added strict evaluation requiring exit code `0` and verified assertion output before marking test results as passed.
- **Disposable Execution Runner (`workers/runner.py`):** Built `LocalSandboxRunner` executing commands in workspace context with sub-process isolation (`shell=False`) and execution timeout controls.
- **Autonomous Coding Agent Runtime (`workers/coding_agent.py`):** Implemented multi-step coding runtime that inspects files, generates code patches, applies edits, executes test suites, and runs self-healing diagnostic loops on test failures.
- **Automated Verification:** Added 4 new execution integration tests (`backend/tests/integration/test_m4_execution.py`) including an end-to-end test against a real Python test project. All 29 repository tests passing in 4.52s.

---

## [0.4.0-m3] - 2026-11-13 — Milestone 3: GitHub Integration

### Added
- **GitHub App Cryptographic Authentication (`services/github_app_auth.py`):** Implemented asymmetric RS256 JWT signing for GitHub App authentication and exchange for short-lived 60-minute installation access tokens (`ghs_...`).
- **Repository Access Broker (`services/github_service.py`):** Enforced least-privilege repository isolation.
- **Branch Management & Protected Branch Guard:** Added git branch creation with strict safety checks preventing direct creation or pushing to protected branches (`main`, `master`, `develop`).
- **Pull Request Engine with Evidence Badge:** Implemented Pull Request generator that embeds structured task metadata, diff summaries, and honest test execution results.
- **HMAC Webhook Signature Verification (`api/v1/webhooks.py`):** Added `POST /api/v1/webhooks/github` with constant-time HMAC-SHA256 signature verification.
- **Automated Verification:** Added 5 new GitHub integration tests.

---

## [0.3.0-m2] - 2026-11-13 — Milestone 2: Agent Orchestration

### Added
- **LangGraph State Machine (`orchestrator/state.py`, `workflow.py`):** Implemented typed graph state `TaskGraphState` and compiled `StateGraph`.
- **Human-in-the-Loop Interrupts:** Configured `interrupt_before=["approval_gate"]` with automatic state persistence.
- **Workflow Resilience & Recovery:** Checkpoint persistence allows brand new process instances to re-hydrate interrupted task state from thread IDs.
- **Diagnostic Retry Loop:** Integrated test failure detection that automatically routes to error diagnosis and retries execution.
- **Automated Verification:** Added 5 orchestration integration tests.

---

## [0.2.0-m1] - 2026-11-13 — Milestone 1: Core Foundation

### Added
- **Backend Application Core:** Configured Python 3.12 virtual environment and FastAPI application in `backend/app/main.py`.
- **Database Persistence:** Defined SQLAlchemy 2.0 async models.
- **Security & Authentication:** Implemented Argon2id password hashing, JWT bearer tokens, and Fernet AES-256 encryption.
- **Task Management Engine:** Built Task CRUD service with server-side validated state machine transitions.
- **Deterministic Approvals:** Implemented approval engine with canonical JSON SHA-256 parameter hashing.
- **Next.js 15 Frontend:** Scaffolded responsive mobile-first dashboard skeleton.

---

## [0.1.0-m0] - 2026-11-13 — Milestone 0: Research & Specification

### Added
- Completed technical research across all 11 core domains (`RESEARCH_LOG.md`).
- Established Technology Decision Register (`TECH_STACK.md`) and ADRs (`DECISION_LOG.md`).
- Documented Bifurcated Enclave Architecture (`SYSTEM_ARCHITECTURE.md`) and STRIDE Threat Model (`THREAT_MODEL.md`).
- Established repository skeleton and CI pipeline.
