# Changelog

All notable changes to Project Jarvis are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-m1] - 2026-11-13 — Milestone 1: Core Foundation

### Added
- **Backend Application Core:** Configured Python 3.12 virtual environment and FastAPI application in `backend/app/main.py`.
- **Database Persistence:** Defined SQLAlchemy 2.0 async models (`User`, `Project`, `Task`, `TaskStep`, `Execution`, `Approval`, `AuditEvent`) in `backend/app/models/`.
- **Security & Authentication:** Implemented Argon2id password hashing, JWT bearer tokens, and Fernet AES-256 encryption in `backend/app/core/security.py` and `backend/app/services/auth_service.py`.
- **Task Management Engine:** Built Task CRUD service with server-side validated state machine transitions, cancellation, and automated plan breakdown in `backend/app/services/task_service.py`.
- **Deterministic Approvals:** Implemented approval engine with canonical JSON SHA-256 parameter hashing in `backend/app/services/approval_service.py`.
- **Audit Logging with Redaction:** Built append-only audit event service with automated secret scrubbing in `backend/app/services/audit_service.py`.
- **Provider Abstraction:** Implemented `AIProvider` base interface and offline `MockAIProvider` in `backend/app/providers/`.
- **REST API Endpoints:** Wired `/api/v1/health`, `/api/v1/auth`, `/api/v1/tasks`, and `/api/v1/approvals`.
- **Next.js 15 Frontend:** Scaffolded responsive mobile-first dashboard skeleton in `frontend/` with Task Intake, Task Queue, and Emergency Kill-Switch.
- **Automated Test Suite:** Created 15 passing automated unit, integration, and security tests (`backend/tests/`).

---

## [0.1.0-m0] - 2026-11-13 — Milestone 0: Research & Specification

### Added
- Completed technical research across all 11 core domains (`RESEARCH_LOG.md`).
- Established Technology Decision Register with detailed rationales, limitations, and alternatives (`TECH_STACK.md`).
- Created Architecture Decision Records ADR-001 through ADR-012 (`DECISION_LOG.md`).
- Documented Bifurcated Enclave Architecture, trust boundaries, failure handling, and state machine (`SYSTEM_ARCHITECTURE.md`).
- Formalized STRIDE threat analysis and OWASP Top 10 for LLMs security controls (`THREAT_MODEL.md`).
- Updated system Security Policy with mandatory sandbox boundaries and redaction rules (`SECURITY_POLICY.md`).
- Inspected local development environment on Windows 11 host.
- Established repository directory layout.
- Added comprehensive `.env.example` template.
- Added Pytest baseline fixtures and architectural unit tests.
- Added GitHub Actions CI pipeline (`.github/workflows/ci.yml`).
