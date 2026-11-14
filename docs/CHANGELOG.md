# Changelog: Jarvis Autonomous Personal AI

All notable changes to the Jarvis project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-11-14

### Added
- **Milestone 3 – Telegram and Web Interface:**
  - Built `@jarvis/telegram-integration` package:
    - Timing-attack-resistant webhook secret verification (`crypto.timingSafeEqual`) on `X-Telegram-Bot-Api-Secret-Token`.
    - Whitelisting of authorized administrator chat ID (`ADMIN_TELEGRAM_CHAT_ID`).
    - Full Telegram Bot API client supporting message delivery, editing, and callback query answers.
    - Interactive inline keyboards for 1-click `[Approve]` and `[Reject]` action decisions.
    - Command router supporting `/task`, `/status`, `/projects`, `/budget`, `/approve`, `/reject`, `/abort`, and emergency kill switch `/kill`.
  - Built `@jarvis/dashboard` Next.js 15 App Router web application:
    - Dark-mode dashboard built with Tailwind CSS and responsive design.
    - Executive Overview page with live daily & monthly financial usage meters vs. caps (INR 25 / INR 750), emergency reserve status, active tasks list, and pending action approvals banner.
    - Task Queue page with status filtering (`ALL`, `INTAKE`, `PLANNING`, `RUNNING`, `COMPLETED`, `ESCALATED`).
    - Task Intake Form (`/tasks/new`) with target project binding, title, requirement prompt, and priority selection.
    - Comprehensive Task Detail Inspector (`/tasks/[id]`) with specification contract viewer, plan viewer, runner execution telemetry, and interactive state controls (Dispatch/Run, Cancel, Emergency Abort).
    - Registered Projects Overview (`/projects`) with GitHub repository details and default branch configuration.
    - Dedicated Approvals Center (`/approvals`) for human operator review of gated actions.
    - Administrator login portal (`/login`) integrated with Supabase Auth.
    - RESTful Route Handlers: `/api/webhooks/telegram`, `/api/tasks`, `/api/tasks/[id]/transition`, and `/api/approvals`.
  - Authored and verified automated test suites across all packages, achieving 30/30 tests passed (100% PASS) and a clean Next.js production build.

---

## [0.3.0] - 2026-11-14

### Added
- **Milestone 2 – Jarvis Control Plane:**
  - Implemented 9 domain repositories in `@jarvis/database/src/repositories/` (`UserRepository`, `ProjectRepository`, `MilestoneRepository`, `TaskRepository`, `AgentRunRepository`, `ApprovalRepository`, `BudgetRepository`, `AuditRepository`, `QueueRepository`).
  - Added optimistic locking support in `TaskRepository` with atomic `version = version + 1` increments to prevent race conditions.
  - Implemented Finite State Machine in `@jarvis/core` with transition matrices, validation guards, and `TaskStateTransitionError` across all 13 task states.
  - Built `@jarvis/permission-engine` with immutable policy matrix gating 9 critical actions (`PROD_DEPLOY`, `SPEND_FUNDS`, `PAID_AI_INFERENCE`, etc.), approval ticket generation, and resolution handlers.
  - Built `@jarvis/budget-manager` with pre-flight inference cost evaluation, daily cap (INR 25.00/day) and monthly cap (INR 750.00/mo) checking, and zero-cost `:free` model bypass.
  - Built `@jarvis/agent-orchestrator` with `TaskCoordinator` (intake, state transitions, dispatch, abort) and `QueueWorker` (asynchronous `pgmq` queue poller).

---

## [0.2.0] - 2026-11-14

### Added
- **Milestone 1 – Supabase Foundation:**
  - Initialized pnpm workspace monorepo layout with Turborepo pipeline configuration (`pnpm-workspace.yaml`, `turbo.json`, `package.json`).
  - Created local Supabase development configuration (`supabase/config.toml`) and seed fixtures (`supabase/seed.sql`).
  - Authored versioned PostgreSQL migrations in `supabase/migrations/`:
    - `20261114000001_initial_schema.sql`: 9 core relational tables, `pgvector`, `pgmq`, indexes, and updated_at triggers.
    - `20261114000002_rls_policies.sql`: Strict Row Level Security policies with `TO authenticated`, ownership checks, immutable ledger revokes, and `v_project_summary` security invoker view.
    - `20261114000003_storage_buckets.sql`: Private `task-artifacts` storage bucket with folder-level owner RLS policies.
    - `20261114000004_queues.sql`: Initialized `jarvis_task_queue` and `jarvis_agent_run_queue` native queues via `pgmq`.
  - Created `@jarvis/database`, `@jarvis/shared-contracts`, and `@jarvis/core` packages.

---

## [0.1.0] - 2026-11-14

### Added
- **Milestone 0 – Architecture & Governance Foundation:**
  - Initialized comprehensive architectural blueprint and system specifications.
  - Authored all 24 required design, security, product, and operational design documents.
  - Formulated formal Architecture Decision Records (ADR-001 through ADR-006).
  - Scaffolded production monorepo folder layout.
