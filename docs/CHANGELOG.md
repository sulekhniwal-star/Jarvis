# Changelog: Jarvis Autonomous Personal AI

All notable changes to the Jarvis project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Authored all 24 required design, security, product, and operational design documents.
  - Formulated formal Architecture Decision Records (ADR-001 through ADR-006).
  - Scaffolded monorepo folder layout.
