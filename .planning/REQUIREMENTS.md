---
milestone: "v8.0 - Approvals, Security & Cost Controls"
updated: 2026-11-17T13:06:00+05:30
---

# REQUIREMENTS.md — Jarvis Requirements Specification (v8.0)

## Overview

Requirements derived from `PRD.md` (§7.8, §7.9, §7.10, §7.12, §8.5, §12) and `ROADMAP.md` covering **Milestone 8 (Approvals, Security & Cost Controls)**.

---

## Milestone 8 Functional Requirements

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-APP-01** | **Unified Approval Centre & UI:** Dedicated `/approvals` management portal displaying pending, approved, rejected, and expired requests with action badges, resource targets, risk tier, expiry countdown, and contextual diff/plan inspection links. | PRD §7.9, §12 | 27 | Pending |
| **REQ-APP-02** | **Cryptographic Token Verification & Dual-Channel Parity:** Server-side HMAC-SHA256 signature verification for approval decisions across Web UI and Telegram inline buttons, ensuring approval cannot be forged, replayed, or reused for modified targets. | PRD §7.9 | 27 | Pending |
| **REQ-COST-01** | **Cost Ledger & Metered Spend Accounting:** `CostRepository` tracking token counts, inference latency, provider-reported costs, and currency conversions in INR across all agent and user interactions. | PRD §7.10 | 28 | Pending |
| **REQ-COST-02** | **Budget Thresholds & Automated Circuit Breaker:** Server-side circuit breaker blocking paid AI inference when daily (INR 25) or monthly (INR 750) caps are breached, with separate owner authorization required for the emergency reserve (INR 250) and hard monthly stop (INR 1,000). | PRD §7.8, §7.10 | 28 | Pending |
| **REQ-SEC-01** | **Emergency Stop / Kill Switch:** Global emergency kill switch operable via Web dashboard button and Telegram `/kill` command, halting all active agent subprocesses, cancelling pending runs, and revoking outstanding approvals immediately. | PRD §7.6, §7.12 | 29 | Pending |
| **REQ-SEC-02** | **Subprocess & Runner Cancellation Protocol:** Process-tree signal dispatching (`SIGINT`/`SIGTERM`/`SIGKILL`) and Docker/sandbox container teardown ensuring no background process continues mutating files or consuming compute after cancellation. | PRD §7.6 | 29 | Pending |
| **REQ-AUD-01** | **Tamper-Evident Hash-Chained Audit Ledger:** Append-only audit logger in `audit_events` with SHA-256 hash chaining linking each event to the previous event hash, providing verifiable tamper detection for sensitive operations. | PRD §7.12 | 30 | Pending |
| **REQ-OPS-01** | **Automated Backup & Disaster Recovery Verification:** Automated database snapshot creation script with encryption and checksum verification, accompanied by an automated restoration drill test validating data integrity without corruption. | PRD §12 | 30 | Pending |

---

## Non-Functional Requirements & Governance

| ID | Requirement | Category | Phase | Status |
|---|---|---|---|---|
| **NFR-SEC-01** | **Main-Only Branch Lock:** Zero non-main branches created or checked out across all operations, repair loops, and tooling. | Security / Governance | All | Enforced |
| **NFR-SEC-02** | **Zero Secret Leakage:** High-entropy credentials, tokens, and private keys strictly prevented from being exposed in audit logs, API responses, or browser bundles. | Security | All | Enforced |
| **NFR-SEC-03** | **Owner Isolation & RLS:** 100% of queries against approvals, cost records, audit events, tasks, and runs enforce `user_id = auth.uid()` via Row-Level Security. | Security | All | Enforced |
| **NFR-REL-02** | **Failsafe Circuit Breaking:** If the cost tracking service or database is unavailable, paid AI model calls default to BLOCKED rather than proceeding unmetered. | Reliability | 28 | Pending |
| **NFR-PERF-03** | **Sub-Second Kill Switch Response:** Emergency kill switch halts local processes and marks runs cancelled within <1.0 second of initiation. | Performance | 29 | Pending |

---

## Traceability Matrix

| Requirement | Phase | Target Plans | Verification Test | Status |
|---|---|---|---|---|
| REQ-APP-01, REQ-APP-02 | Phase 27 | Plan 27.1, Plan 27.2 | Approval token HMAC verification tests, expiration tests, dual-channel approval tests, `/approvals` UI tests | Pending |
| REQ-COST-01, REQ-COST-02, NFR-REL-02 | Phase 28 | Plan 28.1, Plan 28.2 | Cost ledger accounting tests, circuit breaker threshold tests, emergency reserve authorization tests | Pending |
| REQ-SEC-01, REQ-SEC-02, NFR-PERF-03 | Phase 29 | Plan 29.1, Plan 29.2 | Kill switch handler tests, subprocess tree termination tests, Telegram `/kill` command tests | Pending |
| REQ-AUD-01, REQ-OPS-01 | Phase 30 | Plan 30.1, Plan 30.2 | Hash-chain integrity verification tests, backup dump/restore roundtrip test | Pending |
