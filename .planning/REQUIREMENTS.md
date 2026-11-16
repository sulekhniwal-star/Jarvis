---
milestone: "v6.0 - Quality, Verification & Self-Review"
updated: 2026-11-16T12:26:00+05:30
---

# REQUIREMENTS.md — Jarvis Requirements Specification

## Overview

Requirements derived from `PRD.md`, `ANTIGRAVITY_FRESH_PROJECT_PROMPT.md`, `docs/CODING_AGENT_INTERFACE.md`, `docs/TELEGRAM_INTEGRATION.md`, and `docs/ROADMAP.md` covering Milestone 1 (Foundation, Complete), Milestone 2 (Specification & Planning Workflow, Complete), Milestone 3 (Telegram Gateway, Complete), Milestone 4 (GitHub Integration & Branchless Discipline, Complete), Milestone 5 (Coding Execution Sandbox, Complete), and Milestone 6 (Quality, Verification & Self-Review, Active).

---

## Milestone 6 Functional Requirements (Quality, Verification & Self-Review — Active)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-VR-01** | **Automated Verification Runner & Test Harness:** Multi-stage test executor running linting, typechecking (`tsc --noEmit`), test runner (`vitest`/`jest`), and production build with custom command overrides and structured JSON test summaries. | PRD §7.6, §7.7 | 19 | Pending |
| **REQ-VR-02** | **Automated Diff Inspector & Quality Gate:** Semantic diff inspector verifying proposed modifications stay within declared file boundaries, checking for unintended file deletions or AST regressions, and calculating diff metrics. | PRD §7.7, §7.9 | 20 | Pending |
| **REQ-VR-03** | **Pre-Commit Entropy & Secret Scanner:** High-entropy detector and credential pattern scanner preventing passwords, service-role keys, tokens, or credentials from being committed, backed by explicit owner approval override cards. | PRD §7.7, NFR-SEC-02 | 21 | Pending |
| **REQ-VR-04** | **Autonomous Self-Review & Bounded Repair Protocol:** Diagnostic analysis on test/compiler errors generating targeted corrective instructions for coding engines, bounded by a strict 3-strike budget with automated safe rollback and Telegram alerts. | PRD §7.6, §7.9 | 22 | Pending |

---

## Milestone 5 Functional Requirements (Coding Execution Sandbox — Complete)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-EX-01** | **Standard Coding Agent Interface:** Provider-agnostic TypeScript contract (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`) decoupling orchestration from coding CLI engines. | docs/CODING_AGENT_INTERFACE.md §2 | 15 | Complete |
| **REQ-EX-02** | **Headless Aider CLI Adapter:** Automated execution engine wrapping Aider in batch, non-interactive mode with file modification boundaries, OpenRouter provider mapping, and 3-strike bounded repair. | docs/CODING_AGENT_INTERFACE.md §3, §5 | 16 | Complete |
| **REQ-EX-03** | **Ephemeral Sandbox Runner:** Isolated execution environment (GitHub Actions workflow dispatcher & local Docker runner fallback) ensuring zero exposure of master credentials or persistent host state. | docs/CODING_AGENT_INTERFACE.md §4 | 17 | Complete |
| **REQ-EX-04** | **Execution Telemetry & Artifact Pipeline:** Pipeline capturing diff patches, test summaries, and build logs, persisting state transitions in `public.agent_runs`, and updating Web Dashboard and Telegram. | docs/CODING_AGENT_INTERFACE.md §2, PRD §7.6 | 18 | Complete |

---

## Milestone 4 Functional Requirements (GitHub Integration & Branchless Discipline — Complete)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-GH-01** | **GitHub API Client:** Type-safe GitHub API client supporting repository status checks, commit SHA retrieval, tree diff inspection, and GitHub App / PAT authentication. | PRD §7.7, §7.11 | 12 | Complete |
| **REQ-GH-02** | **GitHub Webhook Ingestion & HMAC Verification:** Secure App Router route handler (`/api/github/webhook`) with HMAC SHA-256 signature verification (`X-Hub-Signature-256`) and event routing. | PRD §7.7 | 12 | Complete |
| **REQ-GH-03** | **Remote Git Push Approval Gate & Branchless Safety Guard:** Automated gate verifying working trees are clean, tests are passing, and git operations target only `main`. Strictly blocks `git push origin main` until approved in `ApprovalRepository`. | Prompt §1, PRD §7.7, §7.9 | 13 | Complete |
| **REQ-GH-04** | **Repository Synchronization Monitor:** Service tracking commit divergence between local `main` HEAD and remote `origin/main`, surfacing ahead/behind counts in Web Dashboard and Telegram (`/status`, `/projects`). | PRD §7.7, §7.11 | 14 | Complete |

---

## Milestone 3 Functional Requirements (Telegram Gateway — Complete)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-TG-01** | **Telegram Bot Client:** Type-safe Telegram Bot API client supporting message delivery, MarkdownV2 escaping, inline keyboard markup, and error handling. | PRD §7.13, docs/TELEGRAM | 9 | Complete |
| **REQ-TG-02** | **Owner Allow-List & Webhook Security:** Security guard verifying sender numeric ID matches `OWNER_TELEGRAM_ID` and checking `X-Telegram-Bot-Api-Secret-Token` header. | PRD §7.13, Prompt §2 | 9 | Complete |
| **REQ-TG-03** | **Dual-Mode Update Ingestion & Command Routing:** Next.js App Router route handler (`/api/telegram/webhook`) and local polling script routing `/start`, `/status`, `/budget`, and `/projects`. | PRD §7.13 | 9 | Complete |
| **REQ-TG-04** | **Remote Task Intake & Clarification Loop:** Free-text task submission forwarding to `SpecifierAgent`, with bidirectional delivery of Socratic questions and owner answers. | PRD §7.5, §7.13 | 10 | Complete |
| **REQ-TG-05** | **Interactive Approval Cards & Decision Webhook:** Rich MarkdownV2 notification cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`), callback query handling, durable approval updates, and in-place card editing. | PRD §7.9, §7.13 | 11 | Complete |

---

## Milestone 2 Functional Requirements (Specification & Planning Workflow — Complete)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-SPEC-01** | **Specifier Agent:** Analyzes natural language prompts to extract structured scope, exclusions, raw prompt history, and testable acceptance criteria. | PRD §7.5, Workflow §2 | 6 | Complete |
| **REQ-SPEC-02** | **Clarification Loop:** Socratic clarification engine detecting ambiguity and prompting user with targeted questions before plan generation. | PRD §7.5, Prompt §2 | 6 | Complete |
| **REQ-SPEC-03** | **Specification Repository:** Strongly-typed CRUD and versioning for specifications in `public.specifications`. | PRD §7.5, §8.4 | 6 | Complete |
| **REQ-PLAN-01** | **Planner Agent:** Decomposes specifications into atomic execution steps with wave-based dependency ordering and rollback procedures. | PRD §7.5, Workflow §3 | 7 | Complete |
| **REQ-PLAN-02** | **Risk Assessment & Approval Gate Detection:** Evaluates proposed steps against security policies and flags actions requiring human approval. | PRD §7.5, §7.9 | 7 | Complete |
| **REQ-PLAN-03** | **Plan Repository:** Strongly-typed CRUD, dependency DAG storage, and versioning for plans in `public.plans`. | PRD §7.5, §8.4 | 7 | Complete |
| **REQ-PLAN-04** | **Visual Plan Review UI:** Interactive plan review interface displaying steps, dependencies, risk breakdown, and one-click Plan Approval or revision request controls. | PRD §7.5, UI Spec | 8 | Complete |

---

## Milestone 1 Functional Requirements (Foundation — Complete)

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-ENV-01** | Repository tooling initialization with Next.js 15+, TypeScript, Tailwind CSS, ESLint, Prettier, and Vitest test harness. | PRD §8.1 | 1 | Complete |
| **REQ-ENV-02** | Git safety guard utility enforcing the mandatory `main`-only policy and blocking creation or checkout of other branches. | Prompt §1, PRD §7.7 | 1 | Complete |
| **REQ-DB-01** | Local Supabase Docker development environment with reproducible migration scripts. | PRD §8.1, §12 (M1) | 2 | Complete |
| **REQ-DB-02** | Core database schema defining `profiles`, `projects`, `milestones`, `tasks`, `conversations`, `messages`, `approvals`, `agent_runs`, `audit_events`. | PRD §8.4 | 2 | Complete |
| **REQ-DB-03** | Row-Level Security (RLS) policies ensuring all records are strictly owner-scoped via `auth.uid()`. | PRD §7.1, §9.1 | 2 | Complete |
| **REQ-DB-04** | Typed database client generation with automated type verification. | PRD §8.1 | 2 | Complete |
| **REQ-AUTH-01** | Secure authentication handling via Supabase Auth (Sign-in, Session management, Sign-out, Protected Routes). | PRD §7.1 | 2 | Complete |
| **REQ-REPO-01** | Repository data access layer (Repositories) for CRUD operations on Projects, Milestones, and Tasks with validation. | PRD §7.4 | 3 | Complete |
| **REQ-REPO-02** | Persistent Conversation and Message management with support for structured payloads (plans, code diffs, logs). | PRD §7.3 | 3 | Complete |
| **REQ-REPO-03** | Durable Approval record service with strict state transition validation (Pending, Approved, Rejected, Expired). | PRD §7.9 | 3 | Complete |
| **REQ-REPO-04** | Durable Agent Run state machine and event logger persisting timestamps, status transitions, logs, and artifacts. | PRD §7.6 | 3 | Complete |
| **REQ-AI-01** | Provider-independent AI Gateway interface with OpenRouter implementation. | PRD §7.8 | 4 | Complete |
| **REQ-AI-02** | Free-tier model prioritization and automatic fallback within allowed free models (`llama-3.3-70b`, `gemini-2.0-flash-exp`). | Prompt §3, PRD §7.8 | 4 | Complete |
| **REQ-AI-03** | Approval enforcement gate blocking any paid inference or unapproved model dispatch. | PRD §7.8, §7.9 | 4 | Complete |
| **REQ-AI-04** | AI usage ledger service recording model, purpose, token count, latency, and estimated cost. | PRD §7.8, §7.10 | 4 | Complete |
| **REQ-UI-01** | Authenticated application shell featuring responsive navigation, status bar, and Jarvis cinematic theme tokens. | PRD §7.2, UI Spec | 5 | Complete |
| **REQ-UI-02** | Dashboard overview page with AI Core status widget, Active Projects summary, and Pending Approvals counter. | PRD §7.2, Screen Inv | 5 | Complete |
| **REQ-UI-03** | Accessible design implementation including keyboard focus states, high-contrast text, and reduced-motion support. | PRD §7.2, UI Design | 5 | Complete |
| **REQ-UI-04** | Robust UI state handling for loading skeletons, empty states, error boundaries, and permission denial. | PRD §7.2 | 5 | Complete |

---

## Non-Functional Requirements

| ID | Requirement | Category | Phase | Status |
|---|---|---|---|---|
| **NFR-SEC-01** | **Main-Only Branch Lock:** No tool, agent, or script may create or check out a non-`main` branch or perform force-pushes. | Security / Governance | All | Complete |
| **NFR-SEC-02** | **Zero Secret Leakage:** No API keys, service-role tokens, or private credentials committed or surfaced to browser bundles. | Security | All | Complete |
| **NFR-SEC-03** | **Row-Level Security Coverage:** 100% of owner-specific tables have active RLS policies tested against cross-user reads/writes. | Security | 2 | Complete |
| **NFR-SEC-04** | **Owner Telegram Isolation:** 100% of unauthorized Telegram updates (mismatched `from.id`) rejected with zero data leakage or execution. | Security | 9 | Complete |
| **NFR-REL-01** | **Durable Persistence:** All agent runs, approvals, and tasks survive application/worker restarts and refresh without data loss. | Reliability | 2, 3 | Complete |
| **NFR-REL-02** | **Deterministic Schema Validation:** Structured JSON payloads for specifications and plans validated against strict schemas. | Reliability | 6, 7 | Complete |
| **NFR-COST-01** | **Strict Cost Ceiling:** Zero paid inference or external cloud expenditure without explicit owner approval. | Cost Control | 4 | Complete |
| **NFR-PERF-01** | **Responsive Dashboard:** Initial shell page load under 1.5s on desktop and mobile environments. | Performance | 5 | Complete |

---

## Constraints

| ID | Constraint | Source | Impact |
|---|---|---|---|
| **CON-01** | Git branch is locked strictly to `main`. No PRs, feature branches, or temporary branches. | Prompt §1 | All git operations, CI/CD, and coding runners. |
| **CON-02** | Single-owner architecture. No multi-tenant enterprise billing or organizational trees. | PRD §4.1 | Schema simplicity, permission model. |
| **CON-03** | Local host development on Windows 11 (16GB RAM) with Docker Desktop. | PRD §4.2 | Resource-efficient container configs and scripts. |
| **CON-04** | Free-tier AI model preference via OpenRouter. | Prompt §3, PRD §7.8 | Adapter configuration, error handling, rate limiting. |
| **CON-05** | Telegram Bot Token & Webhook Secret kept strictly server-side; zero browser bundle exposure. | PRD §7.13 | Next.js API route / worker architecture. |

---

## Traceability Matrix

| Requirement | Phase | Target Plans | Verification Test | Status |
|---|---|---|---|---|
| REQ-ENV-01, REQ-ENV-02, NFR-SEC-01 | Phase 1 | Plan 1.1, Plan 1.2 | `npm run build`, `npm test`, Git branch guard unit tests | Complete |
| REQ-DB-01, REQ-DB-02, REQ-DB-03, REQ-DB-04, REQ-AUTH-01, NFR-SEC-02, NFR-SEC-03 | Phase 2 | Plan 2.1, Plan 2.2 | Supabase migration apply, RLS automated test suite | Complete |
| REQ-REPO-01, REQ-REPO-02, REQ-REPO-03, REQ-REPO-04, NFR-REL-01 | Phase 3 | Plan 3.1, Plan 3.2 | Repository unit tests, state machine transition test | Complete |
| REQ-AI-01, REQ-AI-02, REQ-AI-03, REQ-AI-04, NFR-COST-01 | Phase 4 | Plan 4.1, Plan 4.2 | Gateway mock tests, paid-model blocking test, ledger audit | Complete |
| REQ-UI-01, REQ-UI-02, REQ-UI-03, REQ-UI-04, NFR-PERF-01 | Phase 5 | Plan 5.1, Plan 5.2 | Component rendering tests, responsiveness & accessibility audit | Complete |
| REQ-SPEC-01, REQ-SPEC-02, REQ-SPEC-03, NFR-REL-02 | Phase 6 | Plan 6.1, Plan 6.2 | Specifier Agent unit tests, ambiguity scoring tests | Complete |
| REQ-PLAN-01, REQ-PLAN-02, REQ-PLAN-03, NFR-REL-02 | Phase 7 | Plan 7.1, Plan 7.2 | Planner Agent unit tests, DAG dependency ordering tests | Complete |
| REQ-PLAN-04 | Phase 8 | Plan 8.1, Plan 8.2 | Plan Review UI rendering tests, approval decision flow | Complete |
| REQ-TG-01, REQ-TG-02, REQ-TG-03, NFR-SEC-04 | Phase 9 | Plan 9.1, Plan 9.2 | TelegramClient tests, security guard tests, webhook route tests | Complete |
| REQ-TG-04 | Phase 10 | Plan 10.1, Plan 10.2 | Free-text intake tests, clarification flow tests | Complete |
| REQ-TG-05 | Phase 11 | Plan 11.1, Plan 11.2 | Approval card rendering tests, callback decision handler tests | Complete |
| REQ-GH-01, REQ-GH-02 | Phase 12 | Plan 12.1, Plan 12.2 | GitHub API client tests, HMAC webhook verification tests | Complete |
| REQ-GH-03, NFR-SEC-01 | Phase 13 | Plan 13.1, Plan 13.2 | Remote push gate tests, branchless safety guard tests | Complete |
| REQ-GH-04 | Phase 14 | Plan 14.1, Plan 14.2 | Commit sync comparison tests, status card rendering tests | Complete |
| REQ-EX-01 | Phase 15 | Plan 15.1, Plan 15.2 | Standard Coding Agent Interface and Context Synthesizer tests | Complete |
| REQ-EX-02 | Phase 16 | Plan 16.1, Plan 16.2 | Aider CLI batch adapter, boundary constraint and repair tests | Complete |
| REQ-EX-03 | Phase 17 | Plan 17.1, Plan 17.2 | Ephemeral Sandbox Runner and Workflow Dispatch tests | Complete |
| REQ-EX-04 | Phase 18 | Plan 18.1, Plan 18.2 | Telemetry capture, artifact extraction and run state tests | Pending |

---

## Status Definitions

| Status | Meaning |
|---|---|
| **Pending** | Specification accepted; work not yet started |
| **In Progress** | Active implementation in current phase |
| **Complete** | Implemented and empirically verified with passing tests |
| **Blocked** | Pre-requisites or technical impediments encountered |
| **Deferred** | Explicitly rescheduled for future milestones |
