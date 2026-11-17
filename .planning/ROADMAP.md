---
milestone: "v9.0 - Deployment & Continuous Maintenance"
version: "9.0.0"
updated: 2026-11-17T14:22:00+05:30
---

# ROADMAP.md — Jarvis Project Roadmap

> **Current Milestone:** v9.0 - Deployment & Continuous Maintenance (Active)  
> **Current Phase:** 34 - Proactive Maintenance Recommendations & Autonomous Advisory  
> **Status:** Phase 33 Complete; Ready for Planning Phase 34 (`/gsd-plan-phase 34`)

---

## Must-Haves (Milestone 9 Baseline)

- [x] Production deployment approval gate strictly blocking live promotions until explicit HMAC-authorized approval is granted via Web or Telegram (`REQ-DEP-01`).
- [x] Multi-environment deployment runner managing preview deployments, tracking deployment state, preview URL binding, and instant rollback capability (`REQ-DEP-02`).
- [x] Diagnostic system health probe endpoint `/api/health` monitoring Supabase database latency, AI gateway availability, background task queue depth, and memory/disk metrics (< 200ms latency) (`REQ-OPS-02`, `NFR-REL-03`).
- [x] Live System Health widget and operational telemetry dashboard in Web UI and Telegram `/health` command (`REQ-OPS-02`).
- [x] Automated storage pruning and retention worker rotating ephemeral build logs older than 30 days, expiring stale pending approvals, and compacting caches (`REQ-OPS-03`).
- [x] Continuous branch safety audit runner automatically detecting and blocking non-main branch operations across CI/CD and local environments (`NFR-SEC-04`).
- [ ] Proactive maintenance recommendations engine detecting repeated test failures, high-latency models, budget exhaustion risk, or stale tasks, surfacing actionable maintenance recommendations in Dashboard and Telegram (`REQ-OPS-04`).
- [ ] 1-click remediation actions allowing the owner to trigger recommended maintenance tasks directly from the dashboard (`REQ-OPS-05`).

---

## Completed Milestones

- [x] **[Milestone 8: v8.0 — Approvals, Security & Cost Controls](file:///f:/Javis/.planning/milestones/v8.0-ROADMAP.md)** (Phases 27–30, Complete 2026-11-17) — Unified Approval Centre with HMAC-SHA256 decision engine, metered INR cost ledger with AI inference circuit breakers and emergency reserve authorization, sub-second cross-platform emergency kill switch and subprocess cancellation, and tamper-evident SHA-256 hash-chained audit ledger with automated encrypted backup snapshot runner and zero-loss disaster recovery drill harness.
- [x] **[Milestone 7: v7.0 — Projects, Agents & Memory UI](file:///f:/Javis/.planning/milestones/v7.0-ROADMAP.md)** (Phases 23–26, Complete 2026-11-17) — Project workspace & hierarchy Kanban UI, Agent Operations Console with 4-stage telemetry drill-down, pgvector semantic memory store & agent context retrieval, and Supabase Realtime synchronization engine with resilient 12s fallback polling.
- [x] **[Milestone 6: v6.0 — Quality, Verification & Self-Review](file:///f:/Javis/.planning/milestones/v6.0-ROADMAP.md)** (Phases 19–22, Complete 2026-11-16) — Multi-stage verification harness, semantic diff inspector & quality gate, entropy & secret scanner, and 3-strike bounded self-repair protocol with automated git rollback.
- [x] **Milestone 5: v5.0 — Coding Execution Sandbox** (Phases 15–18, Complete 2026-11-16) — Standard coding agent interface, headless Aider CLI adapter, ephemeral GitHub Actions runner environment, and execution telemetry pipeline.
- [x] **Milestone 4: v4.0 — GitHub Integration & Branchless Discipline** (Phases 12–14, Complete 2026-11-15) — GitHub API client, HMAC webhook receiver, remote push approval gate, and repository sync monitor.
- [x] **Milestone 3: v3.0 — Telegram Gateway** (Phases 9–11, Complete 2026-11-15) — Telegram client, single-owner security guard, remote task intake, and interactive approval cards.
- [x] **Milestone 2: v2.0 — Specification & Planning Workflow** (Phases 6–8, Complete 2026-11-15) — Specifier agent, Socratic clarification loop, planner agent, and visual plan review UI.
- [x] **Milestone 1: v1.0 — Core Platform Foundation & Architecture** (Phases 1–5, Complete 2026-11-15) — Next.js 15+ App Router, Supabase 14 tables with 100% RLS, domain repositories, OpenRouter AI gateway, and dashboard shell.

---

## Phases for Milestone 9: Deployment & Continuous Maintenance

### Phase 31: Production Deployment Gate & Multi-Environment Pipeline
**Status:** ✅ Complete (2026-11-17)  
**Objective:** Construct `DeploymentManager` supporting preview and production environments, enforcing explicit human owner approval for production deployments across Web UI and Telegram, preview URL tracking, and rollback state management (`REQ-DEP-01`, `REQ-DEP-02`).  
**Depends on:** Phase 30 (Milestone 8)  
**Requirements:** REQ-DEP-01, REQ-DEP-02  

**Plans:**
- [x] Plan 31.1: `DeploymentManager` core service, deployment repository, preview URL tracking, and production promotion gate.
- [x] Plan 31.2: Web UI Deployment management view, Telegram deployment notification & approval cards, and rollback triggers.

---

### Phase 32: System Health Diagnostics & Liveness Telemetry
**Status:** ✅ Complete (2026-11-17)  
**Objective:** Implement comprehensive diagnostic health probe `/api/health` monitoring Supabase database latency, AI gateway availability, background task queue depth, and memory/disk metrics (< 200ms latency), accompanied by live dashboard telemetry widgets and Telegram `/health` command (`REQ-OPS-02`, `NFR-REL-03`).  
**Depends on:** Phase 31  
**Requirements:** REQ-OPS-02, NFR-REL-03  

**Plans:**
- [x] Plan 32.1: Diagnostic health probe engine (`/api/health`), subsystem probes (database, AI gateway, queue, memory), and sub-200ms benchmark.
- [x] Plan 32.2: Live `SystemHealthWidget` dashboard card, Telegram `/health` diagnostic command, and status alert badges.

---

### Phase 33: Automated Maintenance, Storage Pruning & Branch Hygiene
**Status:** ✅ Complete (2026-11-17)  
**Objective:** Build automated maintenance runner rotating ephemeral build logs (> 30 days), purging expired unapproved requests, compacting cache stores, and continuously validating Git branch safety across CI/CD and local environments (`REQ-OPS-03`, `NFR-SEC-04`).  
**Depends on:** Phase 32  
**Requirements:** REQ-OPS-03, NFR-SEC-04  

**Plans:**
- [x] Plan 33.1: Automated storage pruning service, artifact retention rotation, stale approval expiration with audit ledger tracking, REST route, and CLI runner.
- [x] Plan 33.2: Continuous branch safety enforcement engine, Settings maintenance control card, and Telegram `/prune` command.

---

### Phase 34: Proactive Maintenance Recommendations & Autonomous Advisory
**Status:** ⏳ Pending  
**Objective:** Construct diagnostic reasoning analyzer detecting repeated test regressions, model degradation, budget exhaustion risk, or stale tasks, surfacing actionable maintenance recommendations in the Web Dashboard and Telegram with 1-click remediation actions (`REQ-OPS-04`, `REQ-OPS-05`).  
**Depends on:** Phase 33  
**Requirements:** REQ-OPS-04, REQ-OPS-05  

**Plans:**
- [ ] Plan 34.1: Recommendation engine, heuristic pattern detectors (cost, model latency, test failures), and recommendation repository.
- [ ] Plan 34.2: Web Dashboard Recommendations card with 1-click remediation actions and Telegram alert digest.

---

## Future Milestones Overview (from PRD §12 & docs/ROADMAP.md)

- **Milestone 10:** Hardening, Security Audits & Final Release.

---

## Progress Summary

| Phase | Description | Status | Plans | Complete |
|---|---|---|---|---|
| 1–30 | Milestones 1 through 8 (Foundation through Approvals & Security) | ✅ | 60/60 | 100% |
| 31 | Production Deployment Gate & Multi-Environment Pipeline | ✅ | 2/2 | 100% |
| 32 | System Health Diagnostics & Liveness Telemetry | ✅ | 2/2 | 100% |
| 33 | Automated Maintenance, Storage Pruning & Branch Hygiene | ✅ | 2/2 | 100% |
| 34 | Proactive Maintenance Recommendations & Autonomous Advisory | ⏳ | 0/2 | 0% |
