# JARVIS — Project Roadmap & Milestone Plan

**Document:** `docs/ROADMAP.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Overview & Delivery Philosophy

Jarvis is developed and verified through **12 atomic, independently testable milestones** (Milestone 0 through Milestone 11).
No milestone begins until the preceding milestone passes its acceptance criteria, empirical tests, and independent engineering audit.

```mermaid
flowchart LR
    M0[M0: Architecture] --> M1[M1: Supabase]
    M1 --> M2[M2: Control Plane]
    M2 --> M3[M3: UI Shell & Telegram]
    M3 --> M4[M4: Spec & Planning]
    M4 --> M5[M5: GitHub Integration]
    M5 --> M6[M6: Coding Execution]
    M6 --> M7[M7: Quality & Review]
    M7 --> M8[M8: Projects & Memory]
    M8 --> M9[M9: Approvals & Cost]
    M9 --> M10[M10: Deployment]
    M10 --> M11[M11: Hardening & Release]
```

---

## 2. Milestone Breakdown

### Milestone 0 — Discovery & Architecture *(Current Milestone)*
- **Objective:** Establish the foundational system design, threat models, database schemas, and Git policies.
- **Deliverables:**
  - Comprehensive documentation suite under `docs/` and root.
  - Architecture Decision Records (ADRs).
  - Main-only Git policy confirmation and working tree inspection.
  - Acceptance criteria and Milestone 1 delivery plan.
- **Verification:** Inspection of repository state, complete document review, and owner authorization.

### Milestone 1 — Supabase Foundation
- **Objective:** Provision local and cloud PostgreSQL database layer with Supabase.
- **Deliverables:**
  - Local Supabase CLI and Docker Compose configuration.
  - Initial SQL migrations (`user_profiles`, `projects`, `tasks`, `approvals`, `agent_runs`, `cost_records`, `audit_events`, `memories`).
  - Row-Level Security (RLS) policies and vector extension configuration.
  - Automated TypeScript type generation (`types/supabase.ts`).
  - Verification of managed-to-self-hosted export/import portability.
- **Verification:** `supabase test db` passes; RLS security tests confirm non-owner access denial.

### Milestone 2 — Core Control Plane
- **Objective:** Implement core business logic, relational entities, and durable queue state.
- **Deliverables:**
  - Project, milestone, and task CRUD services.
  - Durable state machine and PostgreSQL advisory lock manager.
  - Cost tracking calculator and INR budget meter.
  - Audit logging middleware.
- **Verification:** Unit and integration tests for state transitions, locking, and cost math.

### Milestone 3 — UI Shell & Telegram Gateway
- **Objective:** Build the responsive cinematic web command centre and mobile Telegram intake.
- **Deliverables:**
  - Next.js App Router layout with custom cinematic theme tokens (`#07111F`, `#0B1728`, cyan accents).
  - Interactive Holographic Orb (idle, thinking, listening, executing states).
  - Collapsible navigation, project cards, and approval drawer.
  - Telegram bot with owner authentication and quick task submission.
- **Verification:** Playwright visual regression tests; Telegram command roundtrip tests.

### Milestone 4 — Specification & Planning Workflow
- **Objective:** Transform natural-language user tasks into structured, dependency-aware plans.
- **Deliverables:**
  - Specifier Agent for scope and acceptance criteria generation.
  - Clarification loop for underspecified requests.
  - Planner Agent for task decomposition and risk scoring.
  - Plan review and approval UI.
- **Verification:** Prompt-to-plan evaluation tests; structured JSON schema validation.

### Milestone 5 — GitHub Integration & Branchless Discipline
- **Objective:** Connect GitHub repository with least-privilege permissions and main-only guardrails.
- **Deliverables:**
  - GitHub App integration and webhook verification.
  - Repository connection and status monitor.
  - Strict branch guard preventing non-`main` checkouts.
  - Remote push approval gate.
- **Verification:** Webhook HMAC tests; pre-push guardrail assertion tests.

### Milestone 6 — Coding Execution Sandbox
- **Objective:** Execute code modifications in isolated GitHub Actions runners using Aider.
- **Deliverables:**
  - GitHub Actions ephemeral runner workflow.
  - Aider CLI adapter with strict file modification boundaries.
  - Ephemeral runner tokens (no master keys exposed).
  - Artifact capture pipeline (logs, diffs, test summaries).
- **Verification:** End-to-end sandbox code generation test; diff capture verification.

### Milestone 7 — Quality, Verification & Self-Review
- **Objective:** Automated testing, diff inspection, secret scanning, and bounded repair.
- **Deliverables:**
  - Automated test runner integration (Vitest, Playwright).
  - Pre-commit secret scanning (Gitleaks / TruffleHog).
  - Reviewer agent for code smell and security analysis.
  - Bounded 3-strike repair state machine.
- **Verification:** Fault injection test verifying that broken tests trigger repairs and halt at strike 3.

### Milestone 8 — Projects, Agents & Memory UI
- **Objective:** Complete project workspaces, agent telemetry, and semantic memory.
- **Deliverables:**
  - Multi-view project workspace (Kanban, list, cards, timeline).
  - Agent network graph and execution timeline.
  - `pgvector` semantic memory RAG search.
  - User memory management and curation interface.
- **Verification:** Vector similarity retrieval accuracy tests; UI interaction tests.

### Milestone 9 — Approvals, Security & Cost Controls
- **Objective:** Centralize governance, budget ceilings, and emergency controls.
- **Deliverables:**
  - Dedicated Approval Centre for pending operations.
  - Daily (₹25) and monthly (₹750) budget circuit breakers.
  - Emergency reserve authorization workflow.
  - Global emergency kill-switch.
- **Verification:** Simulated budget overflow triggering circuit breaker; kill-switch test.

### Milestone 10 — Deployment & Continuous Maintenance
- **Objective:** Production deployment, preview environments, and repo maintenance.
- **Deliverables:**
  - Vercel production and preview deployment pipeline.
  - Supabase Cloud production link.
  - Supabase free-tier inactivity ping automation.
  - Automated maintenance and dependency vulnerability scanner.
- **Verification:** Production smoke test; inactivity ping verification.

### Milestone 11 — Hardening & Final Release
- **Objective:** System-wide security audit, disaster recovery drills, and release sign-off.
- **Deliverables:**
  - Complete disaster recovery drill (`pg_restore` verification).
  - End-to-end user journey validation (Tasks -> Spec -> Code -> Test -> Push).
  - Accessibility (WCAG 2.1 AA) and responsive layout review.
  - Final Master Engineering Audit report.
- **Verification:** 0 P0/P1 audit findings; full disaster recovery pass.
