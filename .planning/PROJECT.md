---
status: ACTIVE
created: 2026-11-15T17:35:00+05:30
updated: 2026-11-15T22:10:00+05:30
milestone: "v3.0 - Telegram Gateway"
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

## Active Milestone: Milestone 3 — Telegram Gateway (v3.0)

The current milestone delivers remote mobile intake and real-time approval cards via Telegram Bot API:
- **Phase 9: Telegram Core Client & Security Guard:** Telegram API client wrapper, owner allow-list guard (`OWNER_TELEGRAM_ID`), webhook secret verification, App Router route handler (`/api/telegram/webhook`), dev polling runner, and base command router (`/start`, `/status`, `/budget`, `/projects`).
- **Phase 10: Telegram Remote Task Intake & Status Reporting:** Free-text task intake forwarding into Specification Engine (`SpecifierAgent`), clarification message delivery, and real-time status reporting.
- **Phase 11: Telegram Interactive Approval Cards & Decision Webhook:** Rich interactive cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`), callback query handler updating durable `public.approvals` and task state machine, and in-place message editing.

## Success Criteria

- [ ] Local Supabase development environment running via Docker with automated migrations.
- [ ] RLS policies verified to prevent unauthorized or cross-context access.
- [ ] Next.js dashboard renders authenticated shell with zero console errors and accessible navigation.
- [ ] OpenRouter adapter executes test prompts, tracks token counts, and blocks simulated paid calls when unapproved.
- [ ] Git safety module successfully rejects any branch operation targeting branches other than `main`.
- [ ] All code conforms to conventional commits, passes ESLint and TypeScript compilation with zero errors.
