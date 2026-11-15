---
milestone: "v1.0 - Core Platform Foundation & Architecture"
version: "1.0.0"
updated: 2026-11-15T14:43:00+05:30
---

# ROADMAP.md — Jarvis Project Roadmap

> **Current Phase:** 1 - Environment & Project Foundation
> **Status:** Planning

## Must-Haves (Milestone 1 Baseline)

- [ ] Complete Next.js 15+ App Router baseline configured with TypeScript, Tailwind CSS, and test harness.
- [ ] Automated Git branch safety guard enforcing `main`-only commits and rejecting non-main branch actions.
- [ ] Reproducible Supabase Docker environment with automated migrations and 100% RLS coverage.
- [ ] Data access layer for Projects, Tasks, Milestones, Conversations, Approvals, and Durable Agent Runs.
- [ ] OpenRouter AI Gateway adapter with free-model fallback and strict paid-inference approval gating.
- [ ] Responsive, accessible, authenticated UI shell and dashboard matching `UI_DESIGN_SYSTEM.md`.

---

## Phases for Milestone 1: Core Platform Foundation & Architecture

### Phase 1: Environment & Project Foundation
**Status:** ⬜ Not Started  
**Objective:** Establish reproducible codebase scaffold, build configuration, test framework, and Git safety invariants.  
**Requirements:** REQ-ENV-01, REQ-ENV-02, NFR-SEC-01, NFR-SEC-02  

**Plans:**
- [ ] Plan 1.1: Next.js 15+ App Router initialization, TypeScript config, Tailwind CSS tokens, and Vitest test suite.
- [ ] Plan 1.2: Git safety guard utility enforcing strict `main`-only policy and commit diff inspection tools.

---

### Phase 2: Database & Authentication Infrastructure
**Status:** ⬜ Not Started  
**Objective:** Deploy local Supabase development environment, apply core relational migrations, enforce RLS policies, and wire Supabase Auth.  
**Depends on:** Phase 1  
**Requirements:** REQ-DB-01, REQ-DB-02, REQ-DB-03, REQ-DB-04, REQ-AUTH-01, NFR-SEC-03  

**Plans:**
- [ ] Plan 2.1: Supabase local configuration, migration scripts for core entities (`profiles`, `projects`, `tasks`, etc.), and RLS policies.
- [ ] Plan 2.2: Supabase client factories (server & browser), automated TypeScript type generation, and Auth route handlers.

---

### Phase 3: Core Domain Models & Repositories
**Status:** ⬜ Not Started  
**Objective:** Build typed data access layer, state machines for Tasks, Approvals, and Durable Agent Runs with event logging.  
**Depends on:** Phase 2  
**Requirements:** REQ-REPO-01, REQ-REPO-02, REQ-REPO-03, REQ-REPO-04, NFR-REL-01  

**Plans:**
- [ ] Plan 3.1: Repository implementations for Projects, Milestones, Tasks, and Conversations with input validation.
- [ ] Plan 3.2: Approval service with immutable decision records and Agent Run durable state machine.

---

### Phase 4: Provider Adapters & AI Gateway
**Status:** ⬜ Not Started  
**Objective:** Implement modular AI Gateway with OpenRouter client, free-model failover, paid-inference approval gate, and token usage ledger.  
**Depends on:** Phase 3  
**Requirements:** REQ-AI-01, REQ-AI-02, REQ-AI-03, REQ-AI-04, NFR-COST-01  

**Plans:**
- [ ] Plan 4.1: OpenRouter API adapter supporting streaming, structured JSON output, and model routing.
- [ ] Plan 4.2: Free-model prioritization policy, paid-inference approval verification gate, and usage ledger service.

---

### Phase 5: Authenticated UI Shell & Dashboard Foundation
**Status:** ⬜ Not Started  
**Objective:** Construct responsive, accessible navigation shell, AI Core overview widget, project cards, and approval alerts.  
**Depends on:** Phase 4  
**Requirements:** REQ-UI-01, REQ-UI-02, REQ-UI-03, REQ-UI-04, NFR-PERF-01  

**Plans:**
- [ ] Plan 5.1: Navigation shell (desktop sidebar, mobile drawer, topbar) with Jarvis cinematic dark styling and accessibility compliance.
- [ ] Plan 5.2: Dashboard overview page integrating real-time agent status, project summary, pending approvals list, and state handling.

---

## Future Milestones Overview (from PRD §12)

- **Milestone 2 (M4):** Specification & Planning Engine (Acceptance criteria generator, dependency graph builder).
- **Milestone 3 (M5 & M6):** Isolated Coding Execution & GitHub Integration (Docker runner, Aider adapter, test runner).
- **Milestone 4 (M7):** Bounded Repair, Automated Diff Review & Security Scans.
- **Milestone 5 (M8 & M9):** Rich Project Views, Approval Centre & Budget Controls.
- **Milestone 6 (M10):** Telegram Bot Integration & Cloud Worker Deployment.
- **Milestone 7 (M11):** Production Hardening, Security Audits, and Disaster Recovery.

---

## Progress Summary

| Phase | Description | Status | Plans | Complete |
|---|---|---|---|---|
| 1 | Environment & Project Foundation | ⬜ | 0/2 | — |
| 2 | Database & Auth Infrastructure | ⬜ | 0/2 | — |
| 3 | Core Domain Models & Repositories | ⬜ | 0/2 | — |
| 4 | Provider Adapters & AI Gateway | ⬜ | 0/2 | — |
| 5 | Authenticated UI Shell & Dashboard | ⬜ | 0/2 | — |

---

## Timeline

| Phase | Started | Completed | Duration |
|---|---|---|---|
| Phase 1 | — | — | — |
| Phase 2 | — | — | — |
| Phase 3 | — | — | — |
| Phase 4 | — | — | — |
| Phase 5 | — | — | — |
