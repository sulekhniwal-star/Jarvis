---
status: ACTIVE
created: 2026-11-15T17:35:00+05:30
updated: 2026-11-15T23:45:00+05:30
milestone: "v5.0 - Coding Execution Sandbox"
---

# PROJECT.md — Jarvis Project Context & Specification

## Vision

Jarvis is a secure, persistent personal AI command centre whose primary responsibility is autonomous, high-integrity software development under human control. It turns vague ideas and software-development goals into structured specifications and acceptance criteria, proposes dependency-aware execution plans, carries out approved coding tasks in isolated disposable environments, empirically verifies results via automated testing and diff review, and commits directly to `main` with verifiable evidence.

---

## Core Principles

1. **Owner-Controlled Autonomy:** Jarvis acts strictly within explicit permissions. Sensitive operations (paid AI inference, remote pushes, production deployments, destructive actions) require approval.
2. **Mandatory GitHub Branch Policy (Main Only):** The only permitted working branch is `main`. No feature branches, temporary branches, or pull requests. Direct commits on `main` require small, atomic, reversible steps with diff inspection and passing tests.
3. **Plan Before Execution:** Work must possess clear scope, acceptance criteria, dependency graph, and risk assessment before code is generated.
4. **Empirical Verification Over Claims:** Tasks are marked complete only with captured proof (compiler output, test runner output, curl response, diff inspection).
5. **Durable State:** Runs, approvals, tasks, and artifacts survive application, worker, or laptop restarts.
6. **Provider Independence & Cost Discipline:** AI providers (OpenRouter) and coding engines (Aider candidate) live behind modular adapters. Free models are prioritized; paid inference requires approval.

---

## Goals

1. **Autonomous Software Development Workflow (Core Focus):**
   - Ingest user goals via conversational web UI and Telegram.
   - Decompose into structured requirements with formal acceptance criteria.
   - Plan execution into atomic tasks with wave-based dependency ordering.
   - Execute coding changes in isolated disposable runners.
   - Run linter, type-check, test suite, and diff review.
   - Make atomic commits to `main`.
2. **Durable Control Plane & Multi-Interface Architecture:**
   - Single-owner authenticated dashboard (Next.js App Router, Tailwind CSS, shadcn/ui).
   - Unified persistent state in managed PostgreSQL via Supabase (Auth, RLS, Storage, Realtime, pgvector).
   - Telegram bot interface providing parity for intake, approvals, and status tracking.
3. **Approval Centre & Audit Ledger:**
   - Durable approvals with cryptographic binding to action, scope, and parameters.
   - Full audit trail recording actor, action, timestamp, and run correlation.
   - Usage ledger tracking token counts, latency, and estimated/actual costs.

---

## Non-Goals (Strictly Out of Scope for MVP)

- **No Multi-Branching:** Creating or checking out feature branches, PR branches, or development branches is prohibited.
- **No Unapproved Paid Inference:** Paid model calls without explicit owner sign-off are blocked.
- **No Production Deploys without Human Confirmation:** Deployments remain strictly approval-gated.
- **No Autonomous Messaging/Email:** No unsolicited email dispatch, phone automation, or personal WhatsApp scraping.
- **No Multi-Tenant SaaS Overhaul:** Single-owner-first architecture. No multi-tenant billing or public organization tiers.
- **No Enterprise PM Overhead:** Solo developer + AI paradigm. No sprint ceremonies, RACI matrices, or bloated bureaucracy.

---

## Target User & Operational Environment

- **Primary User:** Solo owner/operator.
- **Host Development Environment:** Windows 11, 16 GB RAM, local Docker Desktop for Supabase CLI.
- **Cloud Architecture:** Managed Supabase (PostgreSQL, Auth, Storage), Next.js on Vercel or Node runtime, OpenRouter AI Gateway, GitHub App integration with ephemeral runners. Cloud services operate independently without requiring the host laptop to remain online.

---

## Budget & Cost Controls

- **Monthly Standard Budget:** INR 750
- **Daily Standard Spending Limit:** INR 25
- **Emergency Reserve:** INR 250 (requires explicit approval)
- **Absolute Monthly Ceiling:** INR 1,000
- **Inference Policy:** Free models prioritized; paid inference strictly gated behind human approval.

---

## Technical Stack & Decisions

| Layer | Technology | Choice Rationale |
|---|---|---|
| **Frontend Shell** | Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui | Modern, responsive, accessible, component-driven dashboard adhering to `UI_DESIGN_SYSTEM.md`. |
| **Database & Auth** | Supabase (PostgreSQL, Auth, RLS, Storage, pgvector) | Managed-first, reproducible locally with Supabase CLI/Docker, strong RLS security boundaries, portable migrations. |
| **Backend & Orchestrator** | TypeScript modular services | Clean separation of domain logic, state machines, and adapter interfaces. |
| **AI Gateway** | OpenRouter Adapter | Provider-agnostic gateway prioritizing free models, gating paid inference, tracking token usage and cost. |
| **Git / Repo Policy** | GitHub App, Main-only branch policy | Scoped permissions, status inspection, strict prevention of non-main branches or force pushes. |
| **Execution Environment** | Ephemeral Docker containers / GitHub Actions runners | Isolated execution for coding agents (Aider candidate), ephemeral filesystem, network-bounded. |
| **Auxiliary Channel** | Telegram Bot API | Secure remote status notifications, approval responses, and task submission. |

---

## Completed Milestones

### Milestone 0 / v1.0 — Core Platform Foundation & Architecture (✅ Complete 2026-11-15)
- **Phase 1: Environment & Project Foundation:** Next.js 15+ App Router, Tailwind CSS tokens, Vitest test harness, and Git safety guard.
- **Phase 2: Database & Authentication Infrastructure:** Supabase 14 core tables, 100% RLS policies, SSR client factories, and Auth route handlers.
- **Phase 3: Core Domain Models & Repositories:** Typed repositories for Projects, Milestones, Tasks, Conversations, Approvals, Runs, and domain state machines.
- **Phase 4: Provider Adapters & AI Gateway:** OpenRouter adapter, free model failover hierarchy, paid inference approval gate, and budget circuit breakers (₹25/day, ₹750/mo).
- **Phase 5: Authenticated UI Shell & Dashboard Foundation:** Responsive AppShell, navigation docks, AI Core status widget, approvals counter, active projects grid, and state handling.

### Milestone 2 / v2.0 — Specification & Planning Workflow (✅ Complete 2026-11-15)
- **Phase 6: Task Intake & Specification Engine:** Specifier Agent extracting scope, exclusions, acceptance criteria, and interactive clarification loop for underspecified requests.
- **Phase 7: Execution Planning Engine:** Planner Agent decomposing specifications into atomic steps, dependency DAGs, risk scoring, and required approval calculation.
- **Phase 8: Plan Review UI & Approval Gate:** Visual plan review interface, DAG viewer, risk banner, double-submission protected decision controls, and approval lifecycle API.

---

### Milestone 3 / v3.0 — Telegram Gateway (✅ Complete 2026-11-15)
- **Phase 9: Telegram Core Client & Security Guard:** Type-safe Telegram Bot API client wrapper, MarkdownV2 escaping utilities, single-owner security guard (`OWNER_TELEGRAM_ID`), webhook secret verification, App Router route handler (`/api/telegram/webhook`), dev polling runner, and base command router (`/start`, `/status`, `/budget`, `/projects`).
- **Phase 10: Telegram Remote Task Intake & Status Reporting:** Free-text task intake forwarding into Specification Engine (`SpecifierAgent`), conversational Socratic clarification loop, `/cancel` command, and real-time status reporting.
- **Phase 11: Telegram Interactive Approval Cards & Decision Webhook:** Rich interactive cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`), callback query handler updating durable `public.approvals` and task state machine, in-place message editing, and CLI fallback commands (`/approve`, `/reject`).

---

### Milestone 4 / v4.0 — GitHub Integration & Branchless Discipline (✅ Complete 2026-11-15)
- **Phase 12: GitHub API Client, Authentication & Webhook Receiver:** Strongly-typed GitHub API client (`GitHubClient`), authentication via Personal Access Token / GitHub App, and App Router webhook route (`/api/github/webhook`) with timing-safe HMAC SHA-256 signature verification (`X-Hub-Signature-256`) and branchless enforcement.
- **Phase 13: Remote Git Push Approval Gate & Branchless Safety Guard:** Pre-push validation engine (`validatePrePush`) enforcing clean tree and zero secrets in outgoing diffs, `PushGateService` requiring human approval in `ApprovalRepository`, `/api/git/push` route, and real-time Telegram inline card push execution.
- **Phase 14: Repository Synchronization Monitor & Dual-Channel Status:** `RepoSyncMonitor` computing ahead/behind divergence between local `main` HEAD and remote `origin/main`, `/api/git/sync` route, Web Dashboard sync card (`GitSyncStatusCard`), and Telegram `/status` & `/projects` sync reporting.

---

## Active Milestone: Milestone 5 — Coding Execution Sandbox (v5.0)

This milestone builds the isolated, ephemeral execution harness where approved coding tasks are generated, modified, and tested using headless coding agents under strict security and file-boundary constraints (`docs/CODING_AGENT_INTERFACE.md`):
- **Phase 15: Coding Agent Interface & Execution Engine Contract:** TypeScript interfaces (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`), engine registry, and context synthesis from approved execution plans.
- **Phase 16: Headless Aider CLI Adapter & Configuration Synthesizer:** Batch mode execution wrapper, file boundary constraints, OpenRouter model mapping, commit and diff extraction, and bounded repair loop (3-strike rule).
- **Phase 17: Ephemeral Sandbox Runner Environment:** GitHub Actions workflow dispatcher (`workflow_dispatch`), ephemeral credential scoping, and local development runner fallback.
- **Phase 18: Execution Telemetry, Artifact Capture & Run State Machine Integration:** Captures stdout/stderr logs, git diffs, test summaries, updates database `agent_runs` and `tasks` state machines, and broadcasts real-time execution status to Web Dashboard and Telegram.

## Success Criteria

- [x] Local Supabase development environment running via Docker with automated migrations.
- [x] RLS policies verified to prevent unauthorized or cross-context access.
- [x] Next.js dashboard renders authenticated shell with zero console errors and accessible navigation.
- [x] OpenRouter adapter executes test prompts, tracks token counts, and blocks simulated paid calls when unapproved.
- [x] Git safety module successfully rejects any branch operation targeting branches other than `main`.
- [x] All code conforms to conventional commits, passes ESLint and TypeScript compilation with zero errors.
- [x] Telegram Bot Gateway ingests natural language prompts, conducts clarification loops, and delivers interactive approval cards.
- [x] GitHub webhook endpoint verifies HMAC signatures and logs events with zero security breaches.
- [x] Remote push approval gate strictly blocks pushing to `origin/main` until human owner authorizes.
- [x] Repository synchronization monitor accurately tracks commit divergence between local and remote `main`.
- [ ] Coding agent interface abstracts execution engines with uniform input context and output artifacts.
- [ ] Headless Aider adapter executes task prompts within strict file-modification boundaries in batch mode.
- [ ] Ephemeral sandbox runner isolates execution with zero exposure of master credentials or persistent host state.
- [ ] Execution telemetry pipeline records complete build/test logs, diff patches, and transitions `agent_runs` state.
