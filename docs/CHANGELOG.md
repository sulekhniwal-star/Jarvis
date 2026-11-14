# Changelog: Jarvis Autonomous Personal AI

All notable changes to the Jarvis project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Authored comprehensive unit and integration test suites using native Node test runner (`node --test`), achieving 100% test pass across all workspace packages.

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
  - Created `@jarvis/database` package containing strict TypeScript types (`types.ts`) and Supabase client factory (`client.ts`).
  - Created `@jarvis/shared-contracts` package with Zod validation schemas for tasks, approvals, budget entries, and queues.
  - Created `@jarvis/core` package with financial constants (INR 25/day, INR 750/mo), retry limits, and domain error hierarchy.
  - Implemented and passed automated test suites for type verification, Zod schema validation, and SQL migration security auditing.

---

## [0.1.0] - 2026-11-14

### Added
- **Milestone 0 – Architecture & Governance Foundation:**
  - Initialized comprehensive architectural blueprint and system specifications.
  - Documented complete product requirements (`PRODUCT_REQUIREMENTS.md`) and non-functional constraints.
  - Established system architecture with Mermaid sequence and dataflow diagrams (`SYSTEM_ARCHITECTURE.md`).
  - Authored technology stack rationale and selection criteria (`TECH_STACK.md`).
  - Formulated complete relational schema with strict RLS policies (`DATABASE_SCHEMA.md`).
  - Defined REST, webhook, and runner API contracts (`API_SPECIFICATION.md`).
  - Established specialized multi-agent cognitive architecture (`AGENT_DESIGN.md`).
  - Authored abstract coding agent adapter specification and Aider CLI integration (`CODING_AGENT_INTERFACE.md`).
  - Specified distributed DAG workflow engine with `pgmq` native queuing (`WORKFLOW_ENGINE.md`).
  - Conducted STRIDE threat analysis and credential isolation model (`SECURITY_THREAT_MODEL.md`).
  - Defined bounded autonomy matrix and Central Permission Engine (`PERMISSION_POLICY.md`).
  - Formulated strict financial controls (INR 25/day, INR 750/mo) and telemetry tracking (`BUDGET_AND_COST_CONTROL.md`).
  - Designed long-term vector memory architecture with `pgvector` HNSW indexing (`MEMORY_ARCHITECTURE.md`).
  - Specified least-privilege GitHub App integration and runner dispatch (`GITHUB_INTEGRATION.md`).
  - Defined Telegram Bot webhook and interactive inline button contracts (`TELEGRAM_INTEGRATION.md`).
  - Outlined multi-tier hosting topology on Vercel, Supabase, and GitHub Actions (`DEPLOYMENT_STRATEGY.md`).
  - Documented automated testing pyramid and telemetry recording requirements (`TEST_STRATEGY.md`).
  - Authored backup, disaster recovery, and quarter restoration procedures (`BACKUP_AND_RECOVERY.md`).
  - Established staged product roadmap across 11 MVP milestones (`ROADMAP.md`).
  - Created ADRs 001 through 006 capturing foundational architectural decisions.
  - Scaffolded production monorepo folder layout.
