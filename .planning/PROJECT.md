---
status: SHIPPED
created: 2026-11-15T17:35:00+05:30
updated: 2026-11-27T16:15:00+05:30
milestone: "v10.0 - Hardening, Security Audits & Final Release"
version: "10.0.0"
---

# PROJECT.md — Jarvis Project Context & Specification

## Vision

Jarvis is a secure, persistent personal AI command centre whose primary responsibility is autonomous, high-integrity software development under human control. It turns vague ideas and software-development goals into structured specifications and acceptance criteria, proposes dependency-aware execution plans, carries out approved coding tasks in isolated disposable environments, empirically verifies results via automated testing and diff review, and commits directly to `main` with verifiable evidence.

---

## Current State: Platform Released (v10.0.0)

The initial 10-milestone engineering roadmap is **100% complete**. All 38 phases encompassing 76 plans are fully implemented, verified with 132 test files (821 passing tests), 57 compiled production routes, 0 TypeScript errors, 0 warnings, and certified across all 5 automated production release gates (`npm run release:verify`).

---

## Core Principles

1. **Owner-Controlled Autonomy:** Jarvis acts strictly within explicit permissions. Sensitive operations (paid AI inference, remote pushes, production deployments, destructive actions) require approval.
2. **Mandatory GitHub Branch Policy (Main Only):** The only permitted working branch is `main`. No feature branches, temporary branches, or pull requests. Direct commits on `main` require small, atomic, reversible steps with diff inspection and passing tests.
3. **Plan Before Execution:** Work must possess clear scope, acceptance criteria, dependency graph, and risk assessment before code is generated.
4. **Empirical Verification Over Claims:** Tasks are marked complete only with captured proof (compiler output, test runner output, curl response, diff inspection).
5. **Durable State:** Runs, approvals, tasks, and artifacts survive application, worker, or laptop restarts.
6. **Provider Independence & Cost Discipline:** AI providers (OpenRouter) and coding engines live behind modular adapters. Free models are prioritized; paid inference requires approval.

---

## Budget & Cost Controls

- **Monthly Standard Budget:** INR 750
- **Daily Standard Spending Limit:** INR 25
- **Emergency Reserve:** INR 250 (requires explicit approval)
- **Absolute Monthly Ceiling:** INR 1,000
- **Inference Policy:** Free models prioritized; paid inference strictly gated behind human approval.

---

## Shipped Milestones (100% Complete)

### Milestone 1 / v1.0 — Core Platform Foundation & Architecture (✅ Complete 2026-11-15)
- Next.js 15+ App Router, Supabase 14 core tables with 100% RLS, domain repositories, OpenRouter adapter, budget circuit breakers, and authenticated dashboard shell.

### Milestone 2 / v2.0 — Specification & Planning Workflow (✅ Complete 2026-11-15)
- Specifier Agent, Socratic clarification loop, Planner Agent decomposing tasks into DAGs, visual plan review UI, and approval lifecycle.

### Milestone 3 / v3.0 — Telegram Gateway (✅ Complete 2026-11-15)
- Telegram client with single-owner security guard, remote task intake, and interactive callback approval cards.

### Milestone 4 / v4.0 — GitHub Integration & Branchless Discipline (✅ Complete 2026-11-15)
- GitHub API client, HMAC webhook receiver, remote push approval gate, and continuous branch sync monitor.

### Milestone 5 / v5.0 — Coding Execution Sandbox (✅ Complete 2026-11-16)
- Standard coding agent interface, headless Aider CLI adapter, ephemeral runner sandbox environment, and execution telemetry pipeline.

### Milestone 6 / v6.0 — Quality, Verification & Self-Review (✅ Complete 2026-11-16)
- Multi-stage verification harness, semantic diff inspector & quality gate, entropy & secret scanner, and 3-strike bounded self-repair protocol with automated git rollback.

### Milestone 7 / v7.0 — Projects, Agents & Memory UI (✅ Complete 2026-11-17)
- Project workspace & hierarchy Kanban UI, Agent Operations Console with 4-stage telemetry drill-down, pgvector semantic memory store & agent context retrieval, and Supabase Realtime synchronization engine with resilient 12s fallback polling.

### Milestone 8 / v8.0 — Approvals, Security & Cost Controls (✅ Complete 2026-11-17)
- Unified Approval Centre with HMAC-SHA256 decision engine, metered INR cost ledger with AI inference circuit breakers and emergency reserve authorization, sub-second cross-platform emergency kill switch and subprocess cancellation, and tamper-evident SHA-256 hash-chained audit ledger with automated encrypted backup snapshot runner and zero-loss disaster recovery drill harness.

### Milestone 9 / v9.0 — Deployment & Continuous Maintenance (✅ Complete 2026-11-17)
- Production deployment approval gate with preview URL tracking and rollback triggers, sub-200ms non-blocking system health diagnostics and operational telemetry dashboard, automated 30-day storage pruning runner and continuous main-only branch safety enforcement, and proactive maintenance recommendation engine with 1-click remediation actions across Web and Telegram.

### Milestone 10 / v10.0 — Hardening, Security Audits & Final Release (✅ Complete 2026-11-27)
- End-to-end integration test harness validating the full autonomous development lifecycle across 10 stages (`AutonomousLifecycleHarness`) and 5 failure resilience protocols (`ResilienceHarness`).
- System-wide automated security penetration testing asserting 100% database RLS coverage, timing-safe HMAC signature verification on all webhooks/tokens, path traversal sandbox isolation, and secret scanning enforcement (`docs/SECURITY-AUDIT.md` certifying 0 P0/P1 issues).
- WCAG 2.1 AA accessibility and cross-device responsive layout verification across all 10 core views (`/`, `/projects`, `/agents`, `/approvals`, `/audit`, `/deployments`, `/settings`, `/memory`, `/tasks`), with text contrast up to 16.64:1, $\ge 44 \times 44$px touch targets, and `prefers-reduced-motion` support (`docs/ACCESSIBILITY-AUDIT.md`).
- Master Engineering Audit report (`docs/MASTER_ENGINEERING_AUDIT.md`) and operational runbooks (`EMERGENCY_OPERATIONS.md`, `DISASTER_RECOVERY.md`, `PRODUCTION_RELEASE_GUIDE.md`).
- Automated release readiness verification runner (`scripts/release-verify.ts` / `npm run release:verify`) asserting all 5 production gates pass.
- Release version `10.0.0` packaging with 132 test files (821 tests passed) and 57 clean production routes.

---

## Future Roadmap & Evolution (Post-v10.0)

With the core 10-milestone foundation fully operational, future evolution will focus on:
1. **Multi-Model Orchestration:** Dynamic model tiering based on task complexity (e.g., using lightweight models for planning decomposition, reasoning models for diff inspection).
2. **Autonomous Tool Extensibility:** Dynamic tool discovery and MCP (Model Context Protocol) integration for third-party developer tool chains.
3. **Advanced Performance Benchmarks:** Distributed runner execution clusters for concurrent high-volume tasks.
