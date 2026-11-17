---
milestone: "v8.0 - Approvals, Security & Cost Controls"
version: "8.0.0"
updated: 2026-11-17T13:07:00+05:30
---

# ROADMAP.md — Jarvis Project Roadmap

> **Current Milestone:** v8.0 - Approvals, Security & Cost Controls (Active)  
> **Current Phase:** 28 - Cost Ledger, Inference Circuit Breakers & Budget Caps  
> **Status:** Phase 27 Complete; Ready for Planning Phase 28 (`/gsd-plan-phase 28`)

---

## Must-Haves (Milestone 8 Baseline)

- [x] Unified Approval Centre (`/approvals`) displaying pending, approved, rejected, and expired requests with risk tier, expiry counters, and diff inspection links (`REQ-APP-01`).
- [x] Cryptographic HMAC-SHA256 signature verification for approval decisions across Web UI and Telegram inline buttons (`REQ-APP-02`).
- [ ] Metered Cost Ledger and usage accounting tracking tokens, latency, and costs in INR (`REQ-COST-01`).
- [ ] Server-side AI Inference Circuit Breakers enforcing daily (INR 25) and monthly (INR 750) caps with emergency reserve authorization (`REQ-COST-02`, `NFR-REL-02`).
- [ ] Global Emergency Kill Switch operable via Web dashboard and Telegram `/kill` command, halting all active agent subprocesses within <1s (`REQ-SEC-01`, `REQ-SEC-02`, `NFR-PERF-03`).
- [ ] Tamper-evident hash-chained audit event ledger (`audit_events`) providing cryptographically verifiable operation history (`REQ-AUD-01`).
- [ ] Automated database backup snapshot runner with encryption, checksum verification, and recovery drill test suite (`REQ-OPS-01`).

---

## Completed Milestones

- [x] **[Milestone 7: v7.0 — Projects, Agents & Memory UI](file:///f:/Javis/.planning/milestones/v7.0-ROADMAP.md)** (Phases 23–26, Complete 2026-11-17) — Project workspace & hierarchy Kanban UI, Agent Operations Console with 4-stage telemetry drill-down, pgvector semantic memory store & agent context retrieval, and Supabase Realtime synchronization engine with resilient 12s fallback polling.
- [x] **[Milestone 6: v6.0 — Quality, Verification & Self-Review](file:///f:/Javis/.planning/milestones/v6.0-ROADMAP.md)** (Phases 19–22, Complete 2026-11-16) — Multi-stage verification harness, semantic diff inspector & quality gate, entropy & secret scanner, and 3-strike bounded self-repair protocol with automated git rollback.
- [x] **Milestone 5: v5.0 — Coding Execution Sandbox** (Phases 15–18, Complete 2026-11-16) — Standard coding agent interface, headless Aider CLI adapter, ephemeral GitHub Actions runner environment, and execution telemetry pipeline.
- [x] **Milestone 4: v4.0 — GitHub Integration & Branchless Discipline** (Phases 12–14, Complete 2026-11-15) — GitHub API client, HMAC webhook receiver, remote push approval gate, and repository sync monitor.
- [x] **Milestone 3: v3.0 — Telegram Gateway** (Phases 9–11, Complete 2026-11-15) — Telegram client, single-owner security guard, remote task intake, and interactive approval cards.
- [x] **Milestone 2: v2.0 — Specification & Planning Workflow** (Phases 6–8, Complete 2026-11-15) — Specifier agent, Socratic clarification loop, planner agent, and visual plan review UI.
- [x] **Milestone 1: v1.0 — Core Platform Foundation & Architecture** (Phases 1–5, Complete 2026-11-15) — Next.js 15+ App Router, Supabase 14 tables with 100% RLS, domain repositories, OpenRouter AI gateway, and dashboard shell.

---

## Phases for Milestone 8: Approvals, Security & Cost Controls

### Phase 27: Unified Approval Centre & Cryptographic Decision Engine
**Status:** Complete (2026-11-17)  
**Objective:** Construct dedicated `/approvals` management portal, server-side HMAC-SHA256 signature verification for approval decisions, and dual-channel parity between Web UI and Telegram inline buttons (`REQ-APP-01`, `REQ-APP-02`).  
**Depends on:** Phase 26 (Milestone 7)  
**Requirements:** REQ-APP-01, REQ-APP-02  

**Plans:**
- [x] Plan 27.1: Cryptographic approval token generator, HMAC signature validation service, and decision API routes (`POST /api/approvals/[id]/decision`).
- [x] Plan 27.2: Dedicated `/approvals` web portal with status filtering, countdown timers, risk badges, and contextual inspection links.

---

### Phase 28: Cost Ledger, Inference Circuit Breakers & Budget Caps
**Status:** ⏳ Pending  
**Objective:** Implement `CostRepository` metered usage ledger in INR, AI Gateway circuit breaker blocking paid model calls before invocation when daily (INR 25) or monthly (INR 750) caps are reached, and emergency reserve authorization workflows (`REQ-COST-01`, `REQ-COST-02`, `NFR-REL-02`).  
**Depends on:** Phase 27  
**Requirements:** REQ-COST-01, REQ-COST-02, NFR-REL-02  

**Plans:**
- [ ] Plan 28.1: `CostRepository` data access, token usage tracking, and daily/monthly spending aggregations.
- [ ] Plan 28.2: Pre-inference circuit breaker middleware for `AIGateway`, emergency reserve approval gating, and dashboard budget widget.

---

### Phase 29: Emergency Kill Switch & Subprocess Cancellation Protocol
**Status:** ⏳ Pending  
**Objective:** Build global emergency stop API (`POST /api/emergency/kill`) and Telegram `/kill` command, implementing recursive process-tree termination (`SIGINT`/`SIGTERM`/`SIGKILL`), task cancellation state propagation, and outstanding approval revocation within <1.0 second (`REQ-SEC-01`, `REQ-SEC-02`, `NFR-PERF-03`).  
**Depends on:** Phase 28  
**Requirements:** REQ-SEC-01, REQ-SEC-02, NFR-PERF-03  

**Plans:**
- [ ] Plan 29.1: Process-tree termination harness, active runner signal dispatcher, and emergency cancellation service.
- [ ] Plan 29.2: Web Topbar Emergency Stop button, Telegram `/kill` and `/stop` commands, and real-time state cascade.

---

### Phase 30: Tamper-Evident Audit Ledger & Backup Recovery Verification
**Status:** ⏳ Pending  
**Objective:** Build append-only cryptographic hash-chained audit logger in `audit_events`, dedicated audit ledger explorer UI, automated pg_dump database snapshot script, and automated disaster recovery drill test suite (`REQ-AUD-01`, `REQ-OPS-01`).  
**Depends on:** Phase 29  
**Requirements:** REQ-AUD-01, REQ-OPS-01  

**Plans:**
- [ ] Plan 30.1: Cryptographic hash-chained audit logger, verification API route, and `/audit` activity viewer.
- [ ] Plan 30.2: Automated backup snapshot script with checksum verification and end-to-end disaster recovery drill test.

---

## Future Milestones Overview (from PRD §12 & docs/ROADMAP.md)

- **Milestone 9:** Deployment & Continuous Maintenance (Production deployment gating, health monitors).
- **Milestone 10:** Hardening, Security Audits & Release.

---

## Progress Summary

| Phase | Description | Status | Plans | Complete |
|---|---|---|---|---|
| 1 | Environment & Project Foundation | ✅ | 2/2 | 100% |
| 2 | Database & Auth Infrastructure | ✅ | 2/2 | 100% |
| 3 | Core Domain Models & Repositories | ✅ | 2/2 | 100% |
| 4 | Provider Adapters & AI Gateway | ✅ | 2/2 | 100% |
| 5 | Authenticated UI Shell & Dashboard | ✅ | 2/2 | 100% |
| 6 | Task Intake & Specification Engine | ✅ | 2/2 | 100% |
| 7 | Execution Planning Engine | ✅ | 2/2 | 100% |
| 8 | Plan Review UI & Approval Gate | ✅ | 2/2 | 100% |
| 9 | Telegram Core Client & Security Guard | ✅ | 2/2 | 100% |
| 10 | Telegram Remote Task Intake & Status | ✅ | 2/2 | 100% |
| 11 | Telegram Approval Cards & Decision Webhook | ✅ | 2/2 | 100% |
| 12 | GitHub Client, Auth & Webhooks | ✅ | 2/2 | 100% |
| 13 | Remote Push Approval Gate & Branchless Guard | ✅ | 2/2 | 100% |
| 14 | Repository Sync Monitor & Dual-Channel Status | ✅ | 2/2 | 100% |
| 15 | Coding Agent Interface & Engine Contract | ✅ | 2/2 | 100% |
| 16 | Headless Aider CLI Adapter | ✅ | 2/2 | 100% |
| 17 | Ephemeral Sandbox Runner Environment | ✅ | 2/2 | 100% |
| 18 | Execution Telemetry & Artifact Pipeline | ✅ | 2/2 | 100% |
| 19 | Automated Verification Framework | ✅ | 2/2 | 100% |
| 20 | Automated Diff Inspector & Quality Gate | ✅ | 2/2 | 100% |
| 21 | Pre-Commit Entropy & Secret Scanner | ✅ | 2/2 | 100% |
| 22 | Autonomous Self-Review & Bounded Repair | ✅ | 2/2 | 100% |
| 23 | Project Workspace & Hierarchy UI | ✅ | 2/2 | 100% |
| 24 | Agent Operations Console & Telemetry Viewer | ✅ | 2/2 | 100% |
| 25 | pgvector Semantic Memory Store & Context | ✅ | 2/2 | 100% |
| 26 | Real-Time State Synchronization Engine | ✅ | 2/2 | 100% |
| 27 | Unified Approval Centre & Decision Engine | ⏳ | 0/2 | 0% |
| 28 | Cost Ledger & Inference Circuit Breakers | ⏳ | 0/2 | 0% |
| 29 | Emergency Kill Switch & Cancellation | ⏳ | 0/2 | 0% |
| 30 | Tamper-Evident Audit Ledger & Backup Recovery | ⏳ | 0/2 | 0% |
