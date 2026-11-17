---
updated: 2026-11-17T13:07:00+05:30
---

# Project State

## Current Position

**Milestone:** v8.0 - Approvals, Security & Cost Controls (Active)  
**Current Phase:** 28 - Cost Ledger, Inference Circuit Breakers & Budget Caps  
**Status:** Ready for Planning  
**Plan:** Phase 27 completed and verified (93 test files, 580 tests passed, 38 routes compiled). Ready to plan Phase 28 (`/gsd-plan-phase 28`).

## Last Action

Executed and verified Phase 27 (Unified Approval Centre & Cryptographic Decision Engine):
- Implemented cryptographic HMAC-SHA256 approval token engine with timing-safe comparison (`crypto.timingSafeEqual`) and parameter canonicalization (`src/lib/approvals/approval-token.ts`).
- Extended `ApprovalRepository` with multi-status querying, search, pagination, and aggregate status metrics.
- Developed REST API routes (`/api/approvals`, `/api/approvals/[id]`, `/api/approvals/[id]/decision`) with state machine validation and cryptographic token verification.
- Built Human Approvals portal (`/approvals`, `ApprovalsPortalView`, `ApprovalRequestCard`, `ApprovalActionBadge`, `DecisionModal`) featuring live countdown timers, risk tier pills, and Supabase Realtime synchronization.
- Verified with 33 unit and component tests (100% pass) and production build (38 routes).

## Next Steps

1. Run `/gsd-plan-phase 28` to plan Phase 28 (Cost Ledger, Inference Circuit Breakers & Budget Caps).

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
