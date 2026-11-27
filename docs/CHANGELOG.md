# JARVIS — Changelog

All notable changes to the Jarvis project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [10.0.0] — 2026-11-23

### Milestone 10: Hardening, Security Audits & Final Release (Phases 35–38)
- **Phase 35 (End-to-End System Integration & Full Autonomous User Journey):**
  - Created `AutonomousLifecycleHarness` simulating all 10 autonomous lifecycle stages (Intake -> Clarification -> Plan Approval -> Execution -> Verification -> Diff Gate -> Push Gate -> Preview Deployment -> Production Gate -> Health Telemetry).
  - Created `ResilienceHarness` validating five critical failure and recovery scenarios (Self-Repair on verification failure, Pre-Commit Secret Blocking, Kill-Switch Mid-Execution Abort, Webhook Delivery Retry with Exponential Backoff, Degraded Database Read-Only Mode).
  - Validated via 127 test files with 773 passing tests.
- **Phase 36 (System-Wide Security Audit, Penetration Testing & Failsafe Gating):**
  - Implemented timing-safe webhook and token signature verification using crypto constant-time comparison.
  - Implemented strict path traversal containment rules (`PATH_TRAVERSAL_DETECTED`) preventing directory breakout in diff inspector.
  - Built comprehensive `SecurityAuditSuite` executing automated checks across database RLS, boundary validation, and secret entropy.
  - Authored `docs/SECURITY-AUDIT.md` certifying 0 P0 and 0 P1 vulnerabilities.
  - Verified with 129 test files and 799 passing tests.
- **Phase 37 (Accessibility, Responsive UI Optimization & Production Ergonomics):**
  - Added dedicated `/tasks` backlog route and view component resolving top-level navigation gaps.
  - Injected WCAG 2.1 AA semantic ARIA landmarks, `aria-current="page"` indicators, visible focus rings, and $\ge 44 \times 44$px touch targets across desktop, tablet, and mobile navigation components.
  - Added CSS `@media (prefers-reduced-motion: reduce)` rules for motion-sensitive ergonomics.
  - Created `AccessibilityAuditor` and authored `docs/ACCESSIBILITY-AUDIT.md` certifying WCAG 2.1 Level AA compliance.
  - Verified with 131 test files and 818 passing tests.
- **Phase 38 (Master Engineering Documentation, Runbooks & Final Release Packaging):**
  - Authored operational runbooks: `docs/runbooks/EMERGENCY_OPERATIONS.md`, `docs/runbooks/DISASTER_RECOVERY.md`, and `docs/runbooks/PRODUCTION_RELEASE_GUIDE.md`.
  - Created automated release verification runner `scripts/release-verify.ts` and registered `npm run release:verify`.
  - Authored `docs/MASTER_ENGINEERING_AUDIT.md` containing full architectural retrospective and requirements traceability across all 38 phases.
  - Packaged platform version `10.0.0` with 0 TypeScript errors and 0 build warnings.

---

## [9.0.0] — 2026-11-17

### Milestone 9: Deployment & Continuous Maintenance (Phases 31–34)
- **Phase 31 (Production Deployment Gating, Preview URL Tracking & Rollbacks):**
  - Added deployment state machine, Vercel preview URL parsing, and 1-click instant rollback engine (`DeploymentManager`).
- **Phase 32 (System Health Diagnostics & Telemetry Dashboard):**
  - Implemented `SystemHealthDiagnosticService` (<200ms non-blocking probes) across database, redis, disk, agent runners, and memory store.
- **Phase 33 (Automated Maintenance & Continuous Branch Guard):**
  - Created automated 30-day log & artifact pruner (`MaintenancePruner`) and `ContinuousBranchGuard` asserting strict `main`-only branch discipline.
- **Phase 34 (Proactive Maintenance Recommendations & 1-Click Remediation):**
  - Created recommendation engine diagnosing vacuum needs, disk pressure, and rate-limit risks with 1-click execution across Web & Telegram.

---

## [8.0.0] — 2026-11-17

### Milestone 8: Approvals, Security & Cost Controls (Phases 27–30)
- **Phase 27 (Unified Approval Centre & Telegram Remote Decision Engine):**
  - Built tamper-evident HMAC-SHA256 signed approval token generator and unified card UI for web and Telegram.
- **Phase 28 (Strict INR Cost Control, OpenRouter Metering & Inference Budgeting):**
  - Built `CostTracker` and automated circuit breaker enforcing hard INR limits, tiered warning thresholds, and emergency reserve approvals.
- **Phase 29 (Sub-Second Emergency Kill Switch & Subprocess Cancellation):**
  - Implemented `EmergencyKillSwitchService` executing global execution locks, database transaction aborts, and OS process tree termination (`taskkill` / `SIGKILL`) in <1,000ms.
- **Phase 30 (Audit Ledger Immutability, Encrypted Backups & Disaster Recovery Drills):**
  - Built SHA-256 hash-chained immutable audit ledger, automated AES-256-GCM encrypted backup snapshot runner (`BackupSnapshotService`), and automated disaster recovery drill simulator.

---

## [7.0.0] — 2026-11-17

### Milestone 7: Projects, Agents & Memory UI (Phases 23–26)
- **Phase 23 (Project Workspace & Hierarchy Kanban UI):**
  - Built responsive multi-stage task Kanban board with optimistic drag-and-drop state transitions.
- **Phase 24 (Agent Operations Console & Telemetry Drill-Down):**
  - Created Agent Operations Console tracking live active agent runtimes, token telemetry, error rates, and step logs.
- **Phase 25 (pgvector Semantic Memory Store & Context Retrieval):**
  - Implemented semantic memory indexing with pgvector embeddings, cosine similarity queries, and agent context augmentation.
- **Phase 26 (Supabase Realtime Synchronization Engine):**
  - Implemented Supabase Realtime WebSocket subscription manager with automatic 12-second HTTP polling fallback for offline/degraded networks.

---

## [6.0.0] — 2026-11-16

### Milestone 6: Quality, Verification & Self-Review (Phases 19–22)
- **Phase 19 (Multi-Stage Verification Harness):**
  - Automated typechecking, linting, unit testing, and integration verification pipelines.
- **Phase 20 (Semantic Diff Inspector & Quality Gate):**
  - Automated diff analysis preventing out-of-scope code modifications, unauthorized dependency additions, and boundary leaks.
- **Phase 21 (Entropy & Secret Scanner):**
  - High-entropy regex and Shannon entropy scanner blocking accidental commits of API keys, JWT secrets, and private credentials.
- **Phase 22 (Bounded Self-Repair Protocol):**
  - Implemented 3-strike self-healing loop for test failures with automatic git rollback upon exhaustion.

---

## [5.0.0] — 2026-11-16

### Milestone 5: Coding Execution Sandbox (Phases 15–18)
- Standard coding agent interface, headless Aider CLI adapter, ephemeral runner sandbox environment, and execution telemetry pipeline.

---

## [4.0.0] — 2026-11-15

### Milestone 4: GitHub Integration & Branchless Discipline (Phases 12–14)
- GitHub REST/GraphQL client, HMAC webhook receiver, remote push approval gate, and continuous branch sync monitor.

---

## [3.0.0] — 2026-11-15

### Milestone 3: Telegram Gateway (Phases 9–11)
- Telegram bot client, single-owner security guard, remote task intake, and interactive mobile approval cards.

---

## [2.0.0] — 2026-11-15

### Milestone 2: Specification & Planning Workflow (Phases 6–8)
- Specifier agent, Socratic clarification loop, planner agent, and visual plan review UI.

---

## [1.0.0] — 2026-11-15

### Milestone 1: Core Platform Foundation & Architecture (Phases 1–5)
- Next.js 15+ App Router, Supabase 14 relational tables with 100% RLS coverage, domain repositories, OpenRouter AI gateway, and dashboard shell.

---

## [0.1.0] — 2026-11-15

### Added
- Milestone 0 Discovery & Architecture Baseline specifications and ADRs (ADR-001 through ADR-009).
