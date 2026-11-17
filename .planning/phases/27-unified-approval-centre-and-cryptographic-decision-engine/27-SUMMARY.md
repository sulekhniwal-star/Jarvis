---
phase: 27
name: "Unified Approval Centre & Cryptographic Decision Engine"
milestone: "v8.0 - Approvals, Security & Cost Controls"
status: Complete
date: 2026-11-17
plans_executed:
  - "27-01"
  - "27-02"
requirements_satisfied:
  - "REQ-APP-01"
  - "REQ-APP-02"
test_status:
  suite_files_passed: 93
  total_tests_passed: 580
  pass_rate: "100%"
build_status:
  routes_compiled: 38
  errors: 0
  warnings: 0
---

# Phase 27 Summary: Unified Approval Centre & Cryptographic Decision Engine

## 1. Executive Summary

Phase 27 delivers the **Unified Approval Centre & Cryptographic Decision Engine**, inaugurating **Milestone 8 (v8.0 — Approvals, Security & Cost Controls)**. It establishes an end-to-end, tamper-proof human governance architecture for high-risk operations including Git remote pushes, production deployments, paid AI inference model invocations, destructive database mutations, and external communications.

Every approval request generates a cryptographically signed HMAC-SHA256 token binding the entity ID, action type, target resource, user ID, and expiration timestamp. When decisions are executed—whether via the newly built web Human Approvals portal (`/approvals`) or the Telegram bot—signatures are validated in constant time using `crypto.timingSafeEqual`, preventing tampering and replay attacks. Expired or resolved requests are rejected with strict state machine verification.

This phase directly fulfills:
- **`REQ-APP-01` (Unified Approval Centre)**: Centralized approvals dashboard displaying pending and historical authorization requests with live countdown expiration timers, risk tier pills, action-specific visual badges, search/filter controls, and Supabase Realtime synchronization.
- **`REQ-APP-02` (Cryptographic Decision Engine)**: HMAC-SHA256 signed action tokens with constant-time verification, parameter binding, state machine expiration and resolution checks, and dual-channel parity between Web decisions and Telegram bot callbacks.

---

## 2. Implemented Components & API Integrations

### 2.1 Cryptographic Token Engine & Repositories (`27-01-PLAN.md`)
- **`src/lib/approvals/approval-token.ts`:**
  - `buildCanonicalString(payload)`: Constructs canonical representation `${id}:${actionType}:${targetResource}:${userId}:${expiresAt}`.
  - `generateApprovalToken(payload, customSecret?)`: Generates HMAC-SHA256 digest and formats as `${id}.${signature}`.
  - `extractTokenId(token)`: Safely extracts UUID from composite token string.
  - `verifyApprovalToken(token, expected, customSecret?)`: Validates token identity, expiration timestamp, recomputed signature length, and timing-safe equality with `crypto.timingSafeEqual`.
- **`src/lib/repositories/approval-repository.ts`:**
  - Extended `ApprovalRepository` with `listApprovals(userId, filters)` supporting multi-status filtering (`all`, `pending`, `approved`, `rejected`, `expired`), action type filtering, search query matching, and pagination.
  - Added `getApprovalMetrics(userId)` computing live totals for all request statuses.
- **REST API Endpoints:**
  - `GET /api/approvals`: Returns filtered approvals list with generated cryptographic tokens and aggregate metrics.
  - `POST /api/approvals`: Validates input payload with Zod, creates pending approval record, and issues token.
  - `GET /api/approvals/[id]`: Retrieves single approval request enriched with linked task and project metadata.
  - `POST /api/approvals/[id]/decision`: Validates decision (`approved` | `rejected`), checks expiration timestamp, asserts pending status, verifies HMAC-SHA256 cryptographic signature, and updates state machine.

### 2.2 Approvals Portal UI & Reactive Components (`27-02-PLAN.md`)
- **`src/components/approvals/approval-action-badge.tsx`:**
  - Visual badges with distinct styling and Lucide icons across all five action types:
    - `git_remote_push`: Blue badge with `GitCommit` icon.
    - `production_deploy`: Purple badge with `Rocket` icon.
    - `paid_ai_inference`: Amber badge with `Coins` icon.
    - `destructive_db_mutation`: Rose badge with `Database` icon.
    - `external_message`: Cyan badge with `Send` icon.
- **`src/components/approvals/approval-request-card.tsx`:**
  - Displays action badge, risk tier pill (`Critical Risk`, `High Risk`, `Medium Risk`, `Low Risk`), target resource in monospace, and linked task/project context.
  - Live second-by-second countdown timer with warning colors and pulse animation when `< 5m` remain.
  - Interactive "Approve" (emerald) and "Reject" (rose) actions for pending requests.
  - Displays decision reason and timestamp when already resolved.
- **`src/components/approvals/decision-modal.tsx`:**
  - Accessible confirmation dialog with keyboard navigation (Escape to dismiss).
  - Displays operation summary and critical risk warning notice.
  - Optional reason/audit notes textarea.
  - Submits to `/api/approvals/[id]/decision` sending cryptographic token in payload and `x-approval-token` header.
- **`src/components/approvals/approvals-portal-view.tsx`:**
  - Metrics cards banner: Total Requests, Pending (with active pulse badge), Approved, Rejected, and Expired.
  - Status tabs (`All`, `Pending`, `Approved`, `Rejected`, `Expired`) with live count pills.
  - Action type filter dropdown and search input.
  - Responsive card grid with empty state fallback.
  - Connected to Supabase Realtime CDC events for live updates without manual page refreshes.
- **`src/app/approvals/page.tsx`:**
  - Next.js App Router dynamic page wrapped in `AppShell` with server-side prefetching and `ErrorBoundary`.

---

## 3. Empirical Verification

### 3.1 Unit & Component Tests
- `tests/unit/approvals/approval-token.test.ts` (9 tests passed):
  - Token generation, canonical formatting, signature tampering detection, parameter alteration detection, expiration rejection, and timing-safe comparison.
- `tests/unit/repositories/approval-repository.test.ts` (4 tests passed):
  - Listing with status/action filters, search query matching, and metrics calculations.
- `tests/unit/api/approvals-routes.test.ts` (6 tests passed):
  - Route handlers for `GET/POST /api/approvals`, `GET /api/approvals/[id]`, and `POST /api/approvals/[id]/decision` with cryptographic verification.
- `tests/unit/components/approvals-portal.test.tsx` (14 tests passed):
  - Badge rendering across all action types, card countdown formatting and urgency flags, Approve/Reject interactions, decision modal submission, status tab filtering, action dropdown filtering, search input filtering, and empty states.

### 3.2 Regression Suite & Production Build
- **Full Vitest Suite:** 93 test files, 580 tests passed, 0 failures (100% green).
- **Next.js Production Build:** 38 routes compiled successfully with 0 errors and 0 warnings.
- **TypeScript Typecheck:** 100% clean across all routes and components.
