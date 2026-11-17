---
status: ACTIVE
created: 2026-11-15T17:35:00+05:30
updated: 2026-11-17T13:05:00+05:30
milestone: "v8.0 - Approvals, Security & Cost Controls"
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
| **Verification & Self-Review** | VerificationHarness, DiffInspector, SecretScanner, BoundedRepairRunner | 4-stage automated gate enforcing lint, tsc, tests, builds, zero secrets, and 3-strike safe rollback. |

---

## Completed Milestones

### Milestone 1 / v1.0 — Core Platform Foundation & Architecture (✅ Complete 2026-11-15)
- **Phase 1: Environment & Project Foundation:** Next.js 15+ App Router, Tailwind CSS tokens, Vitest test harness, and Git safety guard.
- **Phase 2: Database & Authentication Infrastructure:** Supabase 14 core tables, 100% RLS policies, SSR client factories, and Auth route handlers.
- **Phase 3: Core Domain Models & Repositories:** Typed repositories for Projects, Milestones, Tasks, Conversations, Approvals, Runs, and domain state machines.
- **Phase 4: Provider Adapters & AI Gateway:** OpenRouter adapter, free model failover hierarchy, paid inference approval gate, and budget circuit breakers (₹25/day, ₹750/mo).
- **Phase 5: Authenticated UI Shell & Dashboard Foundation:** Responsive AppShell, navigation docks, AI Core status widget, approvals counter, active projects grid, and state handling.

### Milestone 2 / v2.0 — Specification & Planning Workflow (✅ Complete 2026-11-15)
- **Phase 6: Task Intake & Specification Engine:** Specifier Agent extracting scope, exclusions, acceptance criteria, and interactive clarification loop for underspecified requests.
- **Phase 7: Execution Planning Engine:** Planner Agent decomposing specifications into atomic steps, dependency DAGs, risk scoring, and required approval calculation.
- **Phase 8: Plan Review UI & Approval Gate:** Visual plan review interface, DAG viewer, risk banner, double-submission protected decision controls, and approval lifecycle API.

### Milestone 3 / v3.0 — Telegram Gateway (✅ Complete 2026-11-15)
- **Phase 9: Telegram Core Client & Security Guard:** Type-safe Telegram Bot API client wrapper, MarkdownV2 escaping utilities, single-owner security guard (`OWNER_TELEGRAM_ID`), webhook secret verification, App Router route handler (`/api/telegram/webhook`), dev polling runner, and base command router (`/start`, `/status`, `/budget`, `/projects`).
- **Phase 10: Telegram Remote Task Intake & Status Reporting:** Free-text task intake forwarding into Specification Engine (`SpecifierAgent`), conversational Socratic clarification loop, `/cancel` command, and real-time status reporting.
- **Phase 11: Telegram Interactive Approval Cards & Decision Webhook:** Rich interactive cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`), callback query handler updating durable `public.approvals` and task state machine, in-place message editing, and CLI fallback commands (`/approve`, `/reject`).

### Milestone 4 / v4.0 — GitHub Integration & Branchless Discipline (✅ Complete 2026-11-15)
- **Phase 12: GitHub API Client, Authentication & Webhook Receiver:** Strongly-typed GitHub API client (`GitHubClient`), authentication via Personal Access Token / GitHub App, and App Router webhook route (`/api/github/webhook`) with timing-safe HMAC SHA-256 signature verification (`X-Hub-Signature-256`) and branchless enforcement.
- **Phase 13: Remote Git Push Approval Gate & Branchless Safety Guard:** Pre-push validation engine (`validatePrePush`) enforcing clean tree and zero secrets in outgoing diffs, `PushGateService` requiring human approval in `ApprovalRepository`, `/api/git/push` route, and real-time Telegram inline card push execution.
- **Phase 14: Repository Synchronization Monitor & Dual-Channel Status:** `RepoSyncMonitor` computing ahead/behind divergence between local `main` HEAD and remote `origin/main`, `/api/git/sync` route, Web Dashboard sync card (`GitSyncStatusCard`), and Telegram `/status` & `/projects` sync reporting.

### Milestone 5 / v5.0 — Coding Execution Sandbox (✅ Complete 2026-11-16)
- **Phase 15: Coding Agent Interface & Execution Engine Contract:** TypeScript interfaces (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`), engine registry, mock engine, and context synthesis with path traversal defense (`NFR-SEC-01`, `NFR-SEC-02`).
- **Phase 16: Headless Aider CLI Adapter & Configuration Synthesizer:** Batch mode execution wrapper, file modification boundaries, OpenRouter model mapping, commit and diff extraction, and 3-strike bounded repair protocol.
- **Phase 17: Ephemeral Sandbox Runner Environment:** GitHub Actions workflow dispatcher (`workflow_dispatch`), ephemeral credential scoping, isolated local scratchpad fallback, and unified `SandboxOrchestrator`.
- **Phase 18: Execution Telemetry, Artifact Capture & Run State Machine Integration:** Telemetry coordinator, SHA-256 artifact hashing and credential sanitization, database state synchronization, Next.js App Router API, and Web Dashboard `AgentRunsCard`.

### Milestone 6 / v6.0 — Quality, Verification & Self-Review (✅ Complete 2026-11-16)
- **Phase 19: Automated Verification Framework & Test Runner Harness:** Standardized multi-stage verification pipeline running Vitest, ESLint, TypeScript compiler (`tsc --noEmit`), and Next.js production builds with pluggable custom test command support and structured test artifact generation (`REQ-VR-01`).
- **Phase 20: Automated Diff Inspector & Quality Gate:** Semantic diff inspection analyzing file modifications, detecting unapproved file boundary escapes, AST-based regression analysis, and code churn/quality scoring (`REQ-VR-02`).
- **Phase 21: Pre-Commit Entropy & Secret Scanner:** Deep Shannon entropy analysis and regex pattern matching blocking master credentials, private keys, and tokens in proposed changes, with explicit human approval bypass workflows and pre-push gating (`REQ-VR-03`).
- **Phase 22: Autonomous Self-Review & Bounded Repair Loop:** Automated diagnostic reasoning on failure outputs, targeted repair prompt synthesis, 3-strike bounded retry execution, and automated rollback with Telegram alerts upon exhaustion (`REQ-VR-04`).

---

### Milestone 7 / v7.0 — Projects, Agents & Memory UI (✅ Complete 2026-11-17)
- **Phase 23: Project Workspace & Hierarchy UI:** Dedicated `/projects` index and `/projects/[id]` detail workspace displaying project metadata, milestone hierarchy, completion velocity, and interactive Kanban board with status toggle columns and task detail drawer (`REQ-UI-PROJ-01`, `REQ-UI-PROJ-02`).
- **Phase 24: Agent Operations Console & Telemetry Viewer:** Dedicated `/agents` dashboard and `/agents/runs/[id]` drill-down console displaying durable agent execution history, step execution timeline, tabbed stdout/stderr logs, git diff viewer with quality score badges, and artifact drawer (`REQ-UI-AGENT-01`, `REQ-UI-AGENT-02`).
- **Phase 25: pgvector Semantic Memory Store & Context Retrieval:** Typed `MemoryRepository` connected to `public.memories` using 1536-dimensional vector embeddings via OpenRouter (with deterministic local fallback), cosine similarity retrieval for agent context injection, and an interactive memory curation web interface (`REQ-MEM-01`, `REQ-MEM-02`, `REQ-MEM-03`, `NFR-PERF-01`).
- **Phase 26: Real-Time State Synchronization Engine:** Supabase Realtime client hooks and channel subscriptions across `tasks`, `agent_runs`, `projects`, and `approvals`, providing instant optimistic UI updates and resilient 12-second background fallback polling upon disconnection (`REQ-RT-01`, `NFR-REL-01`).

---

### Milestone 8 / v8.0 — Approvals, Security & Cost Controls (✅ Complete 2026-11-17)
- **Phase 27: Unified Approval Centre & Cryptographic Decision Engine:** Dedicated `/approvals` portal displaying pending, approved, rejected, and expired requests with risk tier badges, countdown timers, and diff inspection links, backed by server-side HMAC-SHA256 signature verification for approval decisions across Web UI and Telegram inline buttons (`REQ-APP-01`, `REQ-APP-02`).
- **Phase 28: Cost Ledger, Inference Circuit Breakers & Budget Caps:** Typed `CostRepository` tracking prompt/completion tokens and INR spend, pre-inference circuit breaker middleware enforcing daily (₹25) and monthly (₹750) caps with emergency reserve authorization (₹250), hard stop ceiling (₹1,000), and failsafe blocking during database degradation (`REQ-COST-01`, `REQ-COST-02`, `NFR-REL-02`).
- **Phase 29: Emergency Kill Switch & Subprocess Cancellation Protocol:** Global emergency stop operable via Web Topbar button and Telegram `/kill` command, terminating entire process trees via asynchronous cross-platform signal dispatching (`taskkill /T /F` on Windows, `SIGKILL` on POSIX) and cascading DB updates in sub-second time (< 1000ms) (`REQ-SEC-01`, `REQ-SEC-02`, `NFR-PERF-03`).
- **Phase 30: Tamper-Evident Audit Ledger & Backup Recovery Verification:** Append-only cryptographic SHA-256 hash chaining in `audit_events` with on-demand mathematical chain verification, `/audit` portal with live `AuditChainBadge`, and automated encrypted (AES-256-GCM) backup snapshot runner with zero-loss disaster recovery drill test suite (`REQ-AUD-01`, `REQ-OPS-01`).

---

## Active Milestone: Milestone 9 — Deployment & Continuous Maintenance (v9.0)

This milestone establishes production deployment gating, continuous health monitoring, performance telemetry, and automated operational maintenance.

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
- [x] Coding agent interface abstracts execution engines with uniform input context and output artifacts.
- [x] Headless Aider adapter executes task prompts within strict file-modification boundaries in batch mode.
- [x] Ephemeral sandbox runner isolates execution with zero exposure of master credentials or persistent host state.
- [x] Execution telemetry pipeline records complete build/test logs, diff patches, and transitions `agent_runs` state.
- [x] Automated verification runner executes lint, typecheck, unit tests, and production build with structured JSON reports.
- [x] Diff inspector enforces strict file boundary modification rules and catches unintended regressions.
- [x] Secret scanner blocks commits containing high-entropy tokens or credentials unless explicitly approved by owner.
- [x] Bounded repair engine automatically fixes failing tests within 3 iterations or triggers safe rollback with Telegram alert.
- [x] Project Workspace UI displays real-time milestone progress, task DAGs, and specification details.
- [x] Agent Console provides live inspection of active runs, streaming step outputs, and diff artifacts.
- [x] Semantic memory returns relevant architectural context and past fixes for incoming user requests.
- [x] Real-time state synchronization engine propagates database mutations across UI and Telegram.
- [x] Unified Approval Centre provides cryptographic HMAC decision validation and dual-channel parity.
- [x] Cost ledger and circuit breakers enforce strict daily and monthly budget ceilings in INR.
- [x] Emergency kill switch terminates all active subprocess trees and cascades cancellations in sub-second time.
- [x] Append-only audit ledger provides cryptographic hash-chain tamper detection and automated zero-loss backup recovery.
