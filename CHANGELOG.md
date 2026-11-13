# Changelog

All notable changes to Project Jarvis are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0-m3] - 2026-11-13 — Milestone 3: GitHub Integration

### Added
- **GitHub App Cryptographic Authentication (`services/github_app_auth.py`):** Implemented asymmetric RS256 JWT signing for GitHub App authentication and exchange for short-lived 60-minute installation access tokens (`ghs_...`).
- **Repository Access Broker (`services/github_service.py`):** Enforced least-privilege repository isolation; tasks are cryptographically and logically blocked from interacting with unapproved repositories.
- **Branch Management & Protected Branch Guard:** Added git branch creation with strict safety checks preventing direct creation or pushing to protected branches (`main`, `master`, `develop`).
- **Pull Request Engine with Evidence Badge:** Implemented Pull Request generator that embeds structured task metadata, diff summaries, and honest test execution results (status badges, exit codes, output logs) with explicit human review disclaimers.
- **HMAC Webhook Signature Verification (`api/v1/webhooks.py`):** Added `POST /api/v1/webhooks/github` with constant-time HMAC-SHA256 signature verification (`X-Hub-Signature-256`) and audit logging.
- **Automated Verification:** Added 5 new GitHub integration tests (`backend/tests/integration/test_m3_github.py`). All 25 repository tests passing in 3.12s.

---

## [0.3.0-m2] - 2026-11-13 — Milestone 2: Agent Orchestration

### Added
- **LangGraph State Machine (`orchestrator/state.py`, `workflow.py`):** Implemented typed graph state `TaskGraphState` and compiled `StateGraph` connecting intake, planning, approval gating, code execution, test verification, diagnostic retry, and PR generation.
- **Human-in-the-Loop Interrupts:** Configured `interrupt_before=["approval_gate"]` with automatic state persistence.
- **Workflow Resilience & Recovery:** Checkpoint persistence allows brand new process instances to re-hydrate interrupted task state from thread IDs.
- **Diagnostic Retry Loop:** Integrated test failure detection that automatically routes to error diagnosis and retries execution.
- **Automated Verification:** Added 5 orchestration integration tests.

---

## [0.2.0-m1] - 2026-11-13 — Milestone 1: Core Foundation

### Added
- **Backend Application Core:** Configured Python 3.12 virtual environment and FastAPI application in `backend/app/main.py`.
- **Database Persistence:** Defined SQLAlchemy 2.0 async models (`User`, `Project`, `Task`, `TaskStep`, `Execution`, `Approval`, `AuditEvent`).
- **Security & Authentication:** Implemented Argon2id password hashing, JWT bearer tokens, and Fernet AES-256 encryption.
- **Task Management Engine:** Built Task CRUD service with server-side validated state machine transitions.
- **Deterministic Approvals:** Implemented approval engine with canonical JSON SHA-256 parameter hashing.
- **Audit Logging with Redaction:** Built append-only audit event service with automated secret scrubbing.
- **Provider Abstraction:** Implemented `AIProvider` base interface and offline `MockAIProvider`.
- **REST API Endpoints:** Wired `/api/v1/health`, `/api/v1/auth`, `/api/v1/tasks`, and `/api/v1/approvals`.
- **Next.js 15 Frontend:** Scaffolded responsive mobile-first dashboard skeleton.

---

## [0.1.0-m0] - 2026-11-13 — Milestone 0: Research & Specification

### Added
- Completed technical research across all 11 core domains (`RESEARCH_LOG.md`).
- Established Technology Decision Register (`TECH_STACK.md`) and ADRs (`DECISION_LOG.md`).
- Documented Bifurcated Enclave Architecture (`SYSTEM_ARCHITECTURE.md`) and STRIDE Threat Model (`THREAT_MODEL.md`).
- Established repository skeleton and CI pipeline.
