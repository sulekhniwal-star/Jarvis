# Product Requirements Document (PRD): Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Principal Software Architect & Product Manager  
**Date:** November 14, 2026  

---

## 1. Executive Summary

**Jarvis** is a persistent, cloud-based personal AI operating system whose primary objective is autonomous, end-to-end software development and engineering lifecycle management. Designed as an autonomous yet strictly governed engineering partner, Jarvis accepts ambiguous human requirements, distills them into formal engineering specifications, decomposes projects into milestones and tasks, executes code generation and testing within isolated sandboxes, manages pull requests, reviews code quality, retains persistent architectural memory, and enforces strict financial and operational boundaries.

Jarvis bridges remote interaction channels (Telegram Bot and Next.js Web Dashboard) to a unified backend state hosted on Supabase (PostgreSQL), with headless coding runners dispatched on ephemeral GitHub-hosted environments.

---

## 2. Problem Statement & Value Proposition

### 2.1 The Problem
Building software typically requires substantial manual orchestration: translating ideas to specs, configuring environments, writing boilerplate, executing tests, resolving build failures, managing pull requests, and maintaining existing repositories. Existing coding assistants are tethered to active IDE sessions on local laptops, lack persistent long-term memory across sessions, cannot operate autonomously when the developer's laptop is offline, lack hard financial governance, and pose significant security risks if untrusted code executes with privileged credentials.

### 2.2 The Solution
Jarvis provides an autonomous, cloud-native control plane that:
1. **Operates Persistently:** Functions independently in the cloud 24/7 without requiring a laptop to stay awake.
2. **Maintains Strict Autonomy Boundaries:** Autonomous execution is bounded within safe sandboxes; destructive, financial, or production-impacting actions strictly require human approval.
3. **Guarantees Zero Secret Leakage:** Enforces a rigid security perimeter separating unprivileged code execution from privileged release pipelines.
4. **Enforces Hard Financial Caps:** Implements a central budget engine capping monthly spend at INR 750 (max INR 1,000 with explicit emergency reserve approval) and daily spend at INR 25, defaulting to verified free AI models.
5. **Provides Unified Remote Control:** Seamlessly synchronizes state across Telegram and modern web dashboard.

---

## 3. User Personas

### 3.1 Primary Persona: The Solo Builder / Lead Architect ("Alex")
- **Profile:** Software engineer, founder, and technical architect managing multiple active codebases.
- **Workflow:** Submits tasks on the go via Telegram ("Fix memory leak in auth service", "Build a customer feedback dashboard in Next.js"), reviews architectural proposals on mobile, inspects pull requests, and approves production promotions from a desktop dashboard.
- **Needs:** High autonomy for routine coding and testing, complete transparency regarding costs and token usage, zero risk of runaway billing, and reliable offline background execution.

---

## 4. Product Objectives & Functional Requirements

### 4.1 Feature Matrix (Staged Staging)

| ID | Feature Capability | MVP Milestone | Future Release | Description |
|---|---|---|---|---|
| FR-01 | Remote Task Intake | M3 | - | Accept software tasks via Telegram messages and Web Dashboard. |
| FR-02 | Requirement Decomposition | M4 | - | Convert vague requests into detailed user stories, assumptions, and acceptance criteria. |
| FR-03 | Milestone & Task Planning | M4 | - | Break specs into DAGs (Directed Acyclic Graphs) of testable tasks. |
| FR-04 | Isolated Coding Execution | M6 | - | Dispatch headless coding agents (Aider) into ephemeral Docker containers on GitHub Actions. |
| FR-05 | Automated QA & Self-Healing | M7 | - | Run unit, lint, type, and security tests; execute bounded fix loops (max 3 routine, max 5 complex). |
| FR-06 | Pull Request Management | M5, M6 | - | Create isolated task branches, commit changes, and submit PRs with automated summaries. |
| FR-07 | Multi-Project Management | M2, M8 | - | Organize and switch between distinct software projects with segregated state. |
| FR-08 | Existing Code Maintenance | M10 | - | Ingest existing repositories, run health audits, identify tech debt, and submit fixes. |
| FR-09 | Preview Deployment & Approval | M10 | - | Generate ephemeral preview environments and stage production release approval gates. |
| FR-10 | Long-Term Memory & RAG | M8 | - | Store architectural decisions, coding preferences, and codebase patterns in pgvector. |
| FR-11 | Budget & Financial Guardrails | M2, M9 | - | Hard enforce INR 750/mo and INR 25/day caps; track token counts and API billing. |
| FR-12 | Central Permission Engine | M2, M9 | - | Block high-impact actions pending signed human approvals via Telegram/Web. |
| FR-13 | Emergency Kill Switch | M2, M9 | - | Instantly abort running agent workflows and revoke temporary tokens upon signal. |
| FR-14 | Idea Discovery & Opportunity Engine | - | Phase 2 | Autonomous market scraping, tech opportunity scoring, and Weekly Top 3 reports. |
| FR-15 | Voice & Assistant Integrations | - | Phase 2 | Realtime voice conversations, calendar scheduling, email parsing, WhatsApp integration. |
| FR-16 | Career & Job Agent | - | Phase 2 | Resume-driven job matching, application tracking, portfolio maintenance. |

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Security & Sandboxing (CRITICAL)
- **NFR-SEC-01 (Untrusted Data Isolation):** All external inputs (GitHub issues, PR descriptions, web pages) must be sanitized and treated as adversarial payloads.
- **NFR-SEC-02 (Credential Segregation):** Coding runners must NEVER hold Supabase service-role keys, GitHub App private keys, or OpenRouter master tokens. Runners receive only single-purpose, short-lived, rate-limited tokens.
- **NFR-SEC-03 (Branch Protection):** Production and mainline branches (`main`, `master`, `production`) must be cryptographically protected; agents can only write to dedicated `jarvis/*` task branches.
- **NFR-SEC-04 (Database Security):** PostgreSQL Row Level Security (RLS) must be enabled on every table in the public schema with `TO authenticated` ownership checks.

### 5.2 Performance & Reliability
- **NFR-REL-01 (Offline Persistence):** System state, tasks, and queues reside in PostgreSQL; tasks continue uninterrupted regardless of local developer device state.
- **NFR-REL-02 (Idempotent Execution):** All task state transitions and queue workers must be idempotent to guarantee recovery from network drops or runner terminations.
- **NFR-REL-03 (Response Latency):** Telegram command acknowledgments must return within 2,000 ms.

### 5.3 Cost & Financial Governance
- **NFR-COST-01 (Hard Budget Ceiling):** System must hard-block any outbound paid API call if daily consumption exceeds INR 25 or monthly consumption exceeds INR 750 (INR 1,000 max with approved emergency reserve).
- **NFR-COST-02 (Model Pricing Telemetry):** Every request must record prompt tokens, completion tokens, reasoning tokens, and charged or estimated cost in database audit tables.

### 5.4 Usability & Portability
- **NFR-PORT-01 (Supabase Portability):** Architecture must run identically on managed Supabase and self-hosted Docker Compose Supabase.
- **NFR-UI-01 (State Parity):** Every state change in the system must reflect synchronously across Telegram and the Next.js Dashboard.

---

## 6. Acceptance Criteria for MVP Completion

1. A user can send a feature request via Telegram: `/task Build a JWT authentication middleware in TypeScript`.
2. Jarvis asks clarifying questions if requirements are ambiguous; updates are captured in the project specification.
3. The specification and plan are presented with an estimated token/cost profile.
4. Upon user approval, Jarvis creates a dedicated branch `jarvis/task-auth-jwt` in the connected GitHub repository.
5. GitHub Actions runner executes Aider in a secure Docker container, generates the code, and runs unit tests and linter.
6. If tests fail, Jarvis triggers a bounded self-healing loop (up to 3 retries) within budget.
7. Upon successful test verification, a Pull Request is opened with full logs, test results, and token costs.
8. A notification is sent to Telegram with a summary and a direct link to the Web Dashboard and GitHub PR.
9. No human action or laptop uptime was required during execution steps 4 through 8.
10. All budget and security policies remained strictly enforced throughout the cycle.
