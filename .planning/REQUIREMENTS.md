# REQUIREMENTS.md — Milestone 9: Deployment & Continuous Maintenance (v9.0)

**Milestone:** v9.0 Deployment & Continuous Maintenance  
**Status:** Scoped & Active  
**Created:** 2026-11-17  

---

## 1. Milestone 9 Functional Requirements

| ID | Title & Description | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-DEP-01** | **Production Deployment Approval Gate:** Production deployments strictly require explicit human owner approval via Web `/approvals` or Telegram inline buttons. Automated promotions are blocked until signed authorization is verified. | PRD §7.10 | 31 | Complete |
| **REQ-DEP-02** | **Multi-Environment Deployment Pipeline & Preview URLs:** Deployment manager supporting preview deployments, tracking deployment state, preview URL binding, and instant rollback capability. | PRD §7.10 | 31 | Complete |
| **REQ-OPS-02** | **Diagnostic System Health & Liveness Probe:** Comprehensive diagnostic health check endpoint `/api/health` monitoring Supabase database latency, AI gateway availability, background task queue depth, and process registry status. | PRD §7.13 | 32 | Pending |
| **REQ-OPS-03** | **Automated Storage Pruning & Retention Runner:** Scheduled maintenance worker that rotates ephemeral build logs older than 30 days, expires stale pending approvals, and cleans temporary artifacts. | PRD §7.13 | 33 | Pending |
| **REQ-OPS-04** | **Proactive Maintenance Recommendations Engine:** Diagnostic reasoning analyzer detecting repeated test failures, high-latency models, budget exhaustion risk, or stale tasks, surfacing actionable maintenance recommendations in Dashboard and Telegram. | PRD §7.13 | 34 | Pending |
| **REQ-OPS-05** | **1-Click Remediation & Maintenance Actions:** Interactive remediation execution allowing the owner to trigger recommended maintenance tasks directly from the dashboard. | PRD §7.13 | 34 | Pending |

---

## 2. Milestone 9 Non-Functional Requirements & Governance

| ID | Title & Description | Category | Phase | Status |
|---|---|---|---|---|
| **NFR-REL-03** | **Diagnostic Telemetry & Liveness Overhead:** Health probe endpoints execute in < 200ms without imposing lock contention on active database transactions. | Reliability / Performance | 32 | Pending |
| **NFR-SEC-04** | **Continuous Branch Safety Enforcement:** Automated git guard CI/CD verification ensuring zero non-main branch mutations across remote and local operations. | Security / Governance | 33 | Pending |

---

## 3. Requirements Traceability Matrix

| Requirement IDs | Phase | Target Plans | Verification Mechanism | Status |
|---|---|---|---|---|
| REQ-DEP-01, REQ-DEP-02 | Phase 31 | Plan 31.1, Plan 31.2 | Deployment gate tests, preview URL tracking, rollback tests | Complete |
| REQ-OPS-02, NFR-REL-03 | Phase 32 | Plan 32.1, Plan 32.2 | Health probe latency benchmark, diagnostic endpoint tests, Telegram `/health` | Pending |
| REQ-OPS-03, NFR-SEC-04 | Phase 33 | Plan 33.1, Plan 33.2 | Log pruning tests, approval expiry tests, continuous branch safety tests | Pending |
| REQ-OPS-04, REQ-OPS-05 | Phase 34 | Plan 34.1, Plan 34.2 | Diagnostic analyzer tests, 1-click remediation execution, alert digest tests | Pending |
