# Phase 34: Proactive Maintenance Recommendations & Autonomous Advisory — Research & Architecture

## Objective
Establish a proactive diagnostic reasoning analyzer (`REQ-OPS-04`) detecting repeated test regressions, model degradation, budget exhaustion risk, or stale tasks, and providing 1-click remediation actions (`REQ-OPS-05`) accessible via the Web Dashboard, REST API, and Telegram.

---

## 1. Requirements & Invariants

| ID | Specification | Architectural Requirement |
|---|---|---|
| **REQ-OPS-04** | Proactive Maintenance Recommendations Engine | Diagnostic reasoning analyzer evaluating system state across cost/budget, model latency, test reliability, stale tasks, storage hygiene, and branch safety. |
| **REQ-OPS-05** | 1-Click Remediation & Maintenance Actions | Interactive remediation execution allowing the owner to trigger recommended maintenance tasks directly from the dashboard or API. |
| **NFR-SEC-04** | Continuous Branch Safety Invariant | Any branch hygiene violation surfaces as a critical maintenance recommendation with 1-click cleanup. |
| **NFR-REL-03** | Non-Blocking Evaluation | Advisory evaluations must run non-blocking without locking database transactions. |

---

## 2. Technical Findings & Design Decisions

### A. Heuristic Pattern Analyzers (`REQ-OPS-04`)
1. **Cost & Budget Anomalies (`detectCostAnomalies`):**
   - Source: `CostRepository.getSpendSummary(userId)`.
   - Conditions:
     - `todaySpendInr >= dailyLimitInr * 0.8`: Warning recommendation for approaching daily cap.
     - `circuitBreakerStatus !== "nominal"`: Critical/Warning recommendation (circuit breaker tripped or emergency reserve active).
   - Remediation: `unlock_emergency_reserve` or review spend limits.

2. **Model Performance & Availability (`detectModelDegradation`):**
   - Source: `SystemHealthDiagnosticService.getHealthReport()` or AI Gateway probe.
   - Conditions:
     - AI Gateway status is degraded or circuit breaker tripped.
     - Probe latency exceeds 1000ms.
   - Remediation: `reset_circuit_breaker` or switch default provider.

3. **Test Regressions & Execution Reliability (`detectTestRegressions`):**
   - Source: `AgentRunRepository.listRecentRuns(10)`.
   - Conditions:
     - Multiple consecutive run failures (`exit_code !== 0` or status `failed`).
     - Error summaries pointing to recurring test or verification failures.
   - Remediation: `retry_failed_task` or run repair drill.

4. **Stale Work Items & Expiring Approvals (`detectStaleWorkItems`):**
   - Source: `TaskRepository` & `ApprovalRepository`.
   - Conditions:
     - Pending approvals expiring within 2 hours or already expired.
     - In-progress tasks without updates for > 24 hours.
   - Remediation: `expire_stale_approvals` or cancel/restart task.

5. **Storage & Branch Hygiene (`detectHygieneIssues`):**
   - Source: `StoragePruningService` & `auditBranchHygiene`.
   - Conditions:
     - Non-main local branches detected (`NFR-SEC-04`).
     - Ephemeral artifacts older than 30 days pending cleanup.
   - Remediation: `clean_extraneous_branches` or `prune_storage`.

### B. 1-Click Remediation Execution Engine (`REQ-OPS-05`)
- `RemediationExecutor`:
  - Dispatches actions directly to underlying domain services:
    - `prune_storage` -> `StoragePruningService.runFullMaintenance()`
    - `clean_extraneous_branches` -> `cleanExtraneousBranches()`
    - `unlock_emergency_reserve` -> `CostRepository.authorizeEmergencyReserve()`
    - `reset_circuit_breaker` -> `CostRepository.resetCircuitBreakers()`
  - Every remediation action logs a tamper-evident audit record via `AuditLedgerService` (`eventType: "system.remediation_executed"`).

### C. Web UI Recommendations Card & Settings/Dashboard Integration
- `RecommendationsCard` in `src/components/advisory/recommendations-card.tsx`:
  - Renders prioritized cards with severity badges (`critical`: red, `warning`: yellow, `info`: blue).
  - Displays rationale, affected subsystem, and 1-click remediation action button.
  - Interactive execution feedback with loading spinners and success alerts.
  - Mounted prominently on the main Dashboard (`src/app/page.tsx`) for immediate visibility.

### D. Telegram Remote Advisory Gateway (`/advisory`)
- Telegram slash command `/advisory`:
  - Evaluates active recommendations.
  - Formats output in MarkdownV2 with severity icons (🔴 Critical, 🟡 Warning, 🔵 Info), title, description, and suggested action.
  - Integrated into `/start` command menu.

---

## 3. Execution Wave Plan
1. **Wave 1 (`34-01-PLAN.md`):** Diagnostic Reasoning Engine, Remediation Executor & REST APIs
   - `src/lib/advisory/types.ts`
   - `src/lib/advisory/recommendation-engine.ts`
   - `src/lib/advisory/remediation-executor.ts`
   - `src/app/api/advisory/route.ts` & `src/app/api/advisory/remediate/route.ts`
   - Unit and API route tests
2. **Wave 2 (`34-02-PLAN.md`):** Web Dashboard Recommendations Card & Telegram `/advisory` Command
   - `src/components/advisory/recommendations-card.tsx`
   - Dashboard integration in `src/app/page.tsx`
   - Telegram `/advisory` command in `src/lib/telegram/commands.ts`
   - Unit, component, and command tests
