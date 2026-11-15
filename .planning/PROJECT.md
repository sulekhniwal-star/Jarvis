---
status: FINALIZED
created: 2026-11-15T14:43:00+05:30
finalized: 2026-11-15T14:43:00+05:30
milestone: "v1.0 - Core Platform Foundation & Architecture"
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

## Milestone 1 Target: Core Platform Foundation & Architecture

The immediate milestone focuses on delivering the robust foundation:
- Supabase local environment, migration tooling, and Auth integration.
- Database schema for core domain entities (`profiles`, `projects`, `milestones`, `tasks`, `conversations`, `messages`, `approvals`, `agent_runs`, `audit_events`).
- Typed TypeScript database client and repositories with Row-Level Security.
- Next.js authenticated shell with navigation, theme tokens, and dashboard overview layout.
- OpenRouter gateway adapter with free-model fallback and approval gating mock.
- GitHub connection and branch-enforcement validator utility.

---

## Success Criteria

- [ ] Local Supabase development environment running via Docker with automated migrations.
- [ ] RLS policies verified to prevent unauthorized or cross-context access.
- [ ] Next.js dashboard renders authenticated shell with zero console errors and accessible navigation.
- [ ] OpenRouter adapter executes test prompts, tracks token counts, and blocks simulated paid calls when unapproved.
- [ ] Git safety module successfully rejects any branch operation targeting branches other than `main`.
- [ ] All code conforms to conventional commits, passes ESLint and TypeScript compilation with zero errors.
