---
updated: 2026-11-17T13:07:00+05:30
---

# Project State

## Current Position

**Milestone:** v8.0 - Approvals, Security & Cost Controls (Active)  
**Current Phase:** 27 - Unified Approval Centre & Cryptographic Decision Engine  
**Status:** Ready for Planning  
**Plan:** Milestone 8 initialized. Ready to plan Phase 27 (`/gsd-plan-phase 27`).

## Last Action

Initialized Milestone 8 (v8.0 — Approvals, Security & Cost Controls):
- Scoped requirements in `REQUIREMENTS.md` (`REQ-APP-01`, `REQ-APP-02`, `REQ-COST-01`, `REQ-COST-02`, `REQ-SEC-01`, `REQ-SEC-02`, `REQ-AUD-01`, `REQ-OPS-01`).
- Structured 4 sequential phases in `ROADMAP.md`:
  - Phase 27: Unified Approval Centre & Cryptographic Decision Engine
  - Phase 28: Cost Ledger, Inference Circuit Breakers & Budget Caps
  - Phase 29: Emergency Kill Switch & Subprocess Cancellation Protocol
  - Phase 30: Tamper-Evident Audit Ledger & Backup Recovery Verification
- Updated `PROJECT.md` tracking active milestone goals and security governance.

## Next Steps

1. Run `/gsd-plan-phase 27` to research and plan Phase 27 (Unified Approval Centre & Cryptographic Decision Engine).

## Active Decisions

| Decision | Choice | Made | Affects |
|---|---|---|---|
| Project Workspace Layout | Breadcrumb navigation, milestone hierarchy tree, and interactive Kanban board with status toggle columns | 2026-11-16 | Phase 23, Project UI |
| Kanban Status Transition Rules | Enforce TaskStateMachine.canTransition() server-side and client-side | 2026-11-16 | Phase 23, Task UI |
| Milestone 7 Scope | 4 Phases: Project Workspace (23), Agent Console (24), pgvector Semantic Memory (25), Realtime Sync (26) | 2026-11-16 | Milestone 7 |
| Vector Embedding Provider | OpenRouter 1536-dim embeddings with deterministic offline fallback | 2026-11-16 | Phase 25, pgvector |
| Realtime Strategy | Supabase Realtime postgres_changes with React hooks and resilient fallback polling | 2026-11-16 | Phase 26, Realtime |
| Git Branch Strategy | Strictly `main` only; no feature branches, no PRs | 2026-11-15 | All phases, execution runners, CI/CD |
| Remote Push Policy | Explicit owner approval required before pushing to `origin/main` | 2026-11-15 | All deployment & git sync actions |
| AI Gateway Routing | OpenRouter with strict free-model preference; paid calls blocked pending approval | 2026-11-15 | Phase 4, AI services, orchestrator |
| Database & Auth | Managed-first Supabase with local Docker CLI development and 100% RLS | 2026-11-15 | Phase 2, Phase 3, persistence |
| Frontend Architecture | Next.js 15+ App Router, TypeScript, Tailwind CSS, shadcn/ui, Radix UI | 2026-11-15 | Dashboard and Web UI |

## Blockers

None. Repository branch is locked to `main` and working tree is clean.

## Concerns

None. Verification harness, diff inspector, secret scanner, and test suites are active.
