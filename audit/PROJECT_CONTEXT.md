# Project Jarvis — Context, Discovery & Operational Baseline

**Document Version:** 1.0.0  
**Status:** Verified & Active  
**Author:** Multidisciplinary Engineering & Product Organization (Antigravity Protocol)  
**Date:** 2026-11-14  

---

## 1. Executive Overview & Problem Definition

### 1.1 What the Project Does
**Project Jarvis** is a cloud-coordinated, personal AI engineering platform and autonomous Software Development Life Cycle (SDLC) assistant. It accepts natural-language software engineering assignments, performs architectural and documentation research, develops structured decomposition plans, executes code modifications within isolated and sandboxed environments, executes automated test suites, performs diagnostic retry loops, and prepares verified GitHub Pull Requests for human review.

### 1.2 Core Problem Solved
Modern software development requires continuous maintenance, dependency upgrades, issue resolution, boilerplate implementation, test writing, and cross-repository improvements across developer fleet portfolios. Solo developers and small engineering teams face significant context-switching overhead and cognitive fatigue when managing multiple projects simultaneously. Jarvis solves this by acting as a tirelessly vigilant, secure, bounded co-pilot that performs autonomous implementation while strictly preserving human authority over production and high-consequence operations.

### 1.3 Target Audience & Primary Persona
- **Primary User:** Solo software engineer, technical founder, or lead architect managing multiple codebases across GitHub.
- **Operating Context:** Mobile-first triage via Telegram Bot and cybernetic web dashboard (Stark Industries HUD); desktop control plane via FastAPI REST API and Git CLI.

---

## 2. Business & Operational Objectives

1. **Autonomous SDLC Velocity:** Accelerate routine development tasks (bug fixing, test generation, feature scaffolding, dependency maintenance) from hours to minutes.
2. **Deterministic Human Authority:** The model proposes actions; deterministic software systems enforce boundaries. Merging code, deploying to production, spending capital, or destructive actions strictly require explicit owner approval.
3. **Zero-Cost / Free-Tier First:** Maximize the use of free-tier infrastructure (GitHub Actions, Supabase, Render, local compute, OpenRouter free models / Google Gemini Flash) with hard spending caps and ₹0 automatic financial commitment by default.
4. **Data Isolation & Privacy:** Repository code, database snapshots, credentials, and conversation memories are strictly quarantined. Untrusted inputs (code repositories, web scrapes, webhook payloads) are treated as untrusted data, never privileged instructions (Indirect Prompt Injection defense).

---

## 3. Current Development Stage & Verified Baseline

- **Current Stage:** v1.0 MVP Implemented, Verified, and Operationally Active.
- **Verified Automated Test Suite:** 46 passing automated tests covering core authentication, task state machine, LangGraph orchestration, GitHub App integration, sandboxed filesystem execution, Telegram intake, security boundaries, and self-improvement gates.
- **Verified Frontend Build:** Next.js 15.5+ TypeScript build passing (`tsc --noEmit` clean, static page generation passing).
- **Verified Operational Planes:**
  - Control Plane: FastAPI 0.115+, SQLAlchemy 2.0 Async, Pydantic v2.
  - Execution Plane: Isolated local sandbox (`LocalSandboxRunner`), path traversal validation (`SandboxedFilesystem`), command tokenization policy (`CommandPolicy`).
  - Presentation Plane: Next.js 15 React 19 cybernetic HUD dashboard and Telegram Bot long-polling daemon.

---

## 4. Discovered Assumptions, Constraints & Unknowns

### 4.1 Assumptions
1. The developer maintains a primary single-tenant GitHub profile/organization (`sulekhniwal-star`) where fleet repositories reside.
2. External AI providers may experience intermittent latency or rate-limiting; fallback mechanisms (mock provider, exponential backoff, OpenRouter routing) are required.
3. In local Windows development environments, async event loop socket bindings require explicit network sandbox bypass permissions for loopback IPC.

### 4.2 Constraints
1. **Financial Hard Ceiling:** ₹0 auto-spend budget. Paid model calls must be gated and explicitly toggled by the owner.
2. **Execution Quarantining:** Subprocess command execution must only invoke allowlisted tools (`python`, `pytest`, `git`, `npm`, `pnpm`, `ruff`, `mypy`) with hard execution timeouts (default 60s).
3. **Branch Protection:** Jarvis is cryptographically and logically forbidden from pushing directly to `main` or `master` branches. All changes must be delivered via Pull Requests on `jarvis/*` branches.

### 4.3 Identified Unknowns & Technical Gaps
1. **State Persistence on Restart:** System operational mode (`OPERATIONAL` vs `LOCKED`) was tracked in-memory, presenting a state reset risk upon server reboot.
2. **LangGraph Node Coupling:** Orchestration nodes in Milestone 2 were initially tested with deterministic mock diffs; tighter runtime binding with the Milestone 4 Sandbox Runner provides deeper end-to-end realism.
3. **Test Suite Hashing Overhead:** Argon2id hashing in per-test autouse fixtures consumed ~18 seconds per test run; pre-computing fixture hashes drastically accelerates test iteration.

