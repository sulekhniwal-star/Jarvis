# JARVIS — Project Progress Tracker

**Current Milestone:** Milestone 0 — Discovery, Architecture & Baseline Verification  
**Active Branch:** `main`  
**Latest Commit:** `012d176` (`origin/main` in sync)

---

## Milestone Status Overview

| Milestone | Scope | Codebase Presence | Verification Status | Notes |
|---|---|---|---|---|
| **M0** | Discovery & Architecture | Docs present; state files restored | **In Progress (Review)** | Baseline verified; awaiting owner review |
| **M1** | Supabase Foundation | Migrations & types present | Needs live DB/Docker check | `supabase/migrations/` (5 files) |
| **M2** | Core Control Plane | Repositories, state machines, costs | Unit tests pass | Covered in Vitest suite |
| **M3** | UI Shell & Telegram | App Router UI + Telegram gateway | Unit tests pass; ESLint fails | 14 ESLint errors in UI/hooks/ops |
| **M4** | Spec & Planning | Specifier, clarifier, planner | Unit tests pass | Covered in Vitest suite |
| **M5** | GitHub Integration | Webhook, client, push-gate, guard | Unit tests pass | 6 stale remote branches on `origin` |
| **M6** | Coding Execution | Aider adapter, sandbox, GHA workflow | Unit tests pass | No Python worker implemented yet |
| **M7** | Quality & Self-Review | Harness, diff, secret scan, 3-strike | Unit tests pass | ESLint errors must be resolved |
| **M8** | Projects, Agents & Memory | Kanban, console, pgvector RAG | Unit tests pass | `match_memories` RPC migration exists |
| **M9** | Approvals, Security & Cost | Approval centre, INR breakers, kill | Unit tests pass | ₹25/day, ₹750/mo configured |
| **M10** | Deployment & Maintenance | Deploy gate, health, pruner, advisory | Unit tests pass | `storage-pruner.ts` has 1 ESLint error |
| **M11** | Hardening & Release | Security suite, DR drill, runbooks | Needs re-audit | `docs/audits/` to be created |

---

## Session Log

### 2026-11-27 — Milestone 0 Re-Baseline & Discovery
- Verified Git state: local `main` at `012d176`, clean working tree, `origin/main` fetched and in sync.
- Ran empirical baseline checks:
  - `npx tsc --noEmit`: 0 errors.
  - `pnpm test`: 132/132 files, 821/821 tests passed.
  - `pnpm lint`: Failed (14 errors, 65 warnings).
  - `pnpm build`: Blocked in sandbox (`EPERM` on `.next` mkdir).
- Verified current official documentation & pricing (Supabase, OpenRouter, GitHub Actions, Vercel).
- Restored `CURRENT_STATE.md`, `PROGRESS.md`, `docs/CHANGELOG.md`, and updated `docs/RESEARCH_LOG.md` and `docs/RISKS_AND_ISSUES.md`.
