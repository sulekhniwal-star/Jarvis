# Changelog

All notable changes to Project Jarvis are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-m0] - 2026-11-13 — Milestone 0: Research & Specification

### Added
- Completed technical research across all 11 core domains (`RESEARCH_LOG.md`).
- Established Technology Decision Register with detailed rationales, limitations, and alternatives (`TECH_STACK.md`).
- Created Architecture Decision Records ADR-001 through ADR-012 (`DECISION_LOG.md`).
- Documented Bifurcated Enclave Architecture, trust boundaries, failure handling, and state machine (`SYSTEM_ARCHITECTURE.md`).
- Formalized STRIDE threat analysis and OWASP Top 10 for LLMs security controls (`THREAT_MODEL.md`).
- Updated system Security Policy with mandatory sandbox boundaries and redaction rules (`SECURITY_POLICY.md`).
- Inspected local development environment on Windows 11 host (Node.js v24.22.1, npm 11.19.1, Git 2.45.1, winget v1.30; documented missing Python/Docker).
- Established clean repository directory layout for backend, frontend, docker, scripts, and GitHub workflows.
- Added comprehensive `.env.example` template covering all application security and integration settings.
- Added `backend/pyproject.toml` specification for Python 3.12, FastAPI, Pydantic v2, and LangGraph.
- Added Pytest baseline fixtures and architectural unit tests (`backend/tests/`).
- Added GitHub Actions CI pipeline (`.github/workflows/ci.yml`).
- Updated `TASK_BOARD.md` to mark Milestone 0 complete and queue Milestone 1 tasks.
