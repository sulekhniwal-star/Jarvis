---
phase: 28
name: "Cost Ledger, Inference Circuit Breakers & Budget Caps"
milestone: "v8.0 - Approvals, Security & Cost Controls"
status: Complete
date: 2026-11-17
plans_executed:
  - "28-01"
  - "28-02"
requirements_satisfied:
  - "REQ-COST-01"
  - "REQ-COST-02"
  - "NFR-REL-02"
test_status:
  suite_files_passed: 97
  total_tests_passed: 613
  pass_rate: "100%"
build_status:
  routes_compiled: 42
  errors: 0
  warnings: 0
---

# Phase 28 Summary: Cost Ledger, Inference Circuit Breakers & Budget Caps

## 1. Executive Summary

Phase 28 establishes **comprehensive financial guardrails, metered usage accounting, and automated circuit breaking** for Jarvis (`REQ-COST-01`, `REQ-COST-02`, `NFR-REL-02`). It enforces strict financial invariants specified in `docs/BUDGET_AND_COST_CONTROL.md`: a daily spending ceiling of **₹25.00 INR**, an 80% daily advisory warning at **₹20.00 INR**, a normal monthly budget of **₹750.00 INR**, an explicit owner-authorized emergency reserve of **₹250.00 INR**, and an inviolable hard stop ceiling of **₹1,000.00 INR**.

Furthermore, under `NFR-REL-02`, the circuit breaker implements **failsafe circuit breaking**: if the database or cost ledger becomes unavailable, paid AI model calls default to `BLOCKED` (`FailsafeCircuitBreakerError`), preventing unmetered inference leakage. Free models remain unconditionally available, allowing reasoning, planning, and task breakdown to proceed uninterrupted without financial cost.

The system is fully accessible through the newly built `/settings` route, featuring live progress metrics, visual circuit breaker state indicators, emergency reserve authorization modals, and a granular usage ledger table.

---

## 2. Implemented Components & API Integrations

### 2.1 Backend Ledger & Failsafe Circuit Breaker (`28-01-PLAN.md`)
- **`src/lib/repositories/cost-repository.ts`:**
  - `recordUsage(userId, data)`: Ingests model invocations into `cost_records` tracking prompt tokens, completion tokens, total tokens, provider, model name, inference cost in INR, estimation status, and linked `run_id`.
  - `listCostRecords(userId, filters)`: Paginated querying with filtering by model, provider, run ID, and date ranges.
  - `getDailySpendInr(userId, date?)`: Computes daily spend across UTC days.
  - `getMonthlySpendInr(userId, date?)`: Computes monthly spend across calendar months.
  - `unlockEmergencyReserve(userId, reason?)`: Persists emergency reserve authorization in `user_profiles.preferences` for the active calendar month.
  - `getSpendSummary(userId)`: Computes real-time totals, limits, emergency reserve status, circuit breaker status (`nominal` | `tripped_daily` | `tripped_monthly` | `emergency_unlocked` | `hard_locked`), recent records, and model spend breakdown.
- **`src/lib/ai/circuit-breaker.ts`:**
  - `InferenceCircuitBreaker`:
    - Evaluates inference requests against daily and monthly ceilings before provider dispatch.
    - Free model exemption: Free models bypass financial ceilings (`isFree: true`, cost: ₹0.00).
    - Failsafe Rule (`NFR-REL-02`): Database/service failures trigger `FailsafeCircuitBreakerError` (`FAILSAFE_BLOCKED`).
    - Daily limit guard (₹25.00): Throws `DailyBudgetExceededError`.
    - Monthly budget guard (₹750.00): Throws `MonthlyBudgetExceededError` unless emergency reserve is active.
    - Hard ceiling guard (₹1,000.00): Throws `HardCeilingExceededError`.
    - 80% daily advisory: Emits warning at ₹20.00 projected spend.
- **`src/lib/ai/gateway.ts`:**
  - Integrated `InferenceCircuitBreaker` into `verifyPaidModelApproval` pre-inference checks.
- **REST API Endpoints:**
  - `GET /api/costs`: Returns paginated cost ledger records with filters.
  - `POST /api/costs`: Ingests and records usage records.
  - `GET /api/costs/summary`: Returns real-time financial metrics, limits, circuit breaker state, and model distribution.
  - `POST /api/costs/emergency-reserve`: Unlocks the ₹250.00 emergency reserve for the active billing cycle.

### 2.2 Frontend UI & Settings Route (`28-02-PLAN.md`)
- **`src/components/cost/cost-metrics-banner.tsx`:**
  - Financial Guardrails cards displaying Today's Spend (vs ₹25 limit), Monthly Spend (vs ₹750 limit), Emergency Reserve status (₹250), and Inviolable Hard Ceiling (₹1,000) with color-coded progress bars.
- **`src/components/cost/circuit-breaker-card.tsx`:**
  - Visual status card representing `Nominal` (emerald), `Tripped Daily` (amber), `Tripped Monthly` (rose), `Emergency Reserve Active` (purple), and `Hard Locked` (dark rose) states with quick unlock action.
- **`src/components/cost/emergency-reserve-modal.tsx`:**
  - Accessible confirmation dialog detailing emergency reserve terms and submitting authorization requests.
- **`src/components/cost/cost-ledger-table.tsx`:**
  - Granular table of past inferences with model filter dropdown, search input, token breakdown, and exact/estimated cost tags.
- **`src/components/cost/cost-management-view.tsx`:**
  - Master container orchestrating banner, circuit breaker card, model breakdown cards, ledger table, and live polling refresh.
- **`src/app/settings/page.tsx`:**
  - App Router page wrapped in `AppShell` with server-side prefetching and error boundary.

---

## 3. Empirical Verification

### 3.1 Unit & Component Tests
- `tests/unit/repositories/cost-repository.test.ts` (6 tests passed):
  - Token and INR recording, daily/monthly spend aggregation, emergency reserve preferences querying, emergency reserve unlocking, and spend summary generation with model breakdown.
- `tests/unit/ai/circuit-breaker.test.ts` (9 tests passed):
  - Free model bypass, failsafe blocking on missing repository or DB outage (`NFR-REL-02`), normal paid inference pass, 80% daily advisory emission, daily limit tripping, monthly limit tripping, emergency reserve expansion, and hard ceiling enforcement.
- `tests/unit/api/costs-routes.test.ts` (6 tests passed):
  - `GET/POST /api/costs`, `GET /api/costs/summary`, and `POST /api/costs/emergency-reserve` route handlers.
- `tests/unit/components/cost-settings.test.tsx` (12 tests passed):
  - Metrics banner figures and progress, circuit breaker visual states, reserve modal opening and submission, table filtering by model and text search, and master view composition.

### 3.2 Regression Suite & Production Build
- **Full Vitest Suite:** 97 test files, 613 tests passed, 0 failures (100% green).
- **Next.js Production Build:** 42 routes compiled successfully with 0 errors and 0 warnings.
- **TypeScript Typecheck:** 100% clean across all routes and components.
