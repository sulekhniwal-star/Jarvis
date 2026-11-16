---
milestone: "v7.0 - Projects, Agents & Memory UI"
version: "7.0.0"
updated: 2026-11-16T16:32:00+05:30
---

# ROADMAP.md — Jarvis Project Roadmap

> **Current Milestone:** v7.0 - Projects, Agents & Memory UI (Active)  
> **Current Phase:** 23 - Project Workspace & Hierarchy UI  
> **Status:** Ready for Planning (`/gsd-plan-phase 23`)

---

## Must-Haves (Milestone 7 Baseline)

- [ ] Dedicated Project Workspace pages (`/projects`, `/projects/[id]`) with milestone hierarchy, completion velocity, and interactive Kanban board with status columns (`backlog`, `in_progress`, `blocked`, `completed`).
- [ ] Dedicated Agent Operations Console (`/agents`, `/agents/runs/[id]`) with live execution timeline, tabbed stdout/stderr logs, git diff viewer with quality scores, and artifact inspection drawer.
- [ ] pgvector Semantic Memory Store (`MemoryRepository`, `public.memories`) using OpenRouter 1536-dim embeddings with deterministic offline fallback and top-K similarity context injection for `SpecifierAgent` and `PlannerAgent`.
- [ ] Memory Curation & Management Web Interface to browse, search semantically, create, edit, and delete memories with full provenance.
- [ ] Real-time State Synchronization Engine subscribing to Supabase Realtime postgres changes for `tasks`, `agent_runs`, `projects`, and `approvals` with resilient fallback polling.

---

## Completed Milestones

- [x] **[Milestone 6: v6.0 — Quality, Verification & Self-Review](file:///f:/Javis/.planning/milestones/v6.0-ROADMAP.md)** (Phases 19–22, Complete 2026-11-16) — Multi-stage verification harness, semantic diff inspector & quality gate, entropy & secret scanner, and 3-strike bounded self-repair protocol with automated git rollback.
- [x] **Milestone 5: v5.0 — Coding Execution Sandbox** (Phases 15–18, Complete 2026-11-16) — Standard coding agent interface, headless Aider CLI adapter, ephemeral GitHub Actions runner environment, and execution telemetry pipeline.
- [x] **Milestone 4: v4.0 — GitHub Integration & Branchless Discipline** (Phases 12–14, Complete 2026-11-15) — GitHub API client, HMAC webhook receiver, remote push approval gate, and repository sync monitor.
- [x] **Milestone 3: v3.0 — Telegram Gateway** (Phases 9–11, Complete 2026-11-15) — Telegram client, single-owner security guard, remote task intake, and interactive approval cards.
- [x] **Milestone 2: v2.0 — Specification & Planning Workflow** (Phases 6–8, Complete 2026-11-15) — Specifier agent, Socratic clarification loop, planner agent, and visual plan review UI.
- [x] **Milestone 1: v1.0 — Core Platform Foundation & Architecture** (Phases 1–5, Complete 2026-11-15) — Next.js 15+ App Router, Supabase 14 tables with 100% RLS, domain repositories, OpenRouter AI gateway, and dashboard shell.

---

## Phases for Milestone 7: Projects, Agents & Memory UI

### Phase 23: Project Workspace & Hierarchy UI
**Status:** ⏳ Pending  
**Objective:** Construct dedicated `/projects` index and `/projects/[id]` detail workspace featuring project metadata, milestone hierarchy drill-down, progress metrics, and an interactive Kanban board with status toggle columns and task detail drawer (`REQ-UI-PROJ-01`, `REQ-UI-PROJ-02`).  
**Depends on:** Phase 22 (Milestone 6)  
**Requirements:** REQ-UI-PROJ-01, REQ-UI-PROJ-02  

**Plans:**
- [ ] Plan 23.1: Project workspace routes (`/projects`, `/projects/[id]`), breadcrumbs, milestone hierarchy tree, and project metadata header.
- [ ] Plan 23.2: Interactive Kanban task board with status columns (`backlog`, `in_progress`, `blocked`, `completed`), status transition controls, and task detail drawer linking specs/plans/runs.

---

### Phase 24: Agent Operations Console & Telemetry Viewer
**Status:** ⏳ Pending  
**Objective:** Build dedicated `/agents` dashboard and `/agents/runs/[id]` drill-down console displaying durable agent execution history, step execution timeline, tabbed stdout/stderr logs, git diff viewer with quality score badges, and artifact drawer (`REQ-UI-AGENT-01`, `REQ-UI-AGENT-02`).  
**Depends on:** Phase 23  
**Requirements:** REQ-UI-AGENT-01, REQ-UI-AGENT-02  

**Plans:**
- [ ] Plan 24.1: Agent operations dashboard (`/agents`) with status filtering, duration/cost metrics, and recent runs table.
- [ ] Plan 24.2: Run telemetry drill-down (`/agents/runs/[id]`) with execution timeline, tabbed log viewer, git diff viewer, and artifact drawer.

---

### Phase 25: pgvector Semantic Memory Store & Context Retrieval
**Status:** ⏳ Pending  
**Objective:** Implement typed `MemoryRepository` connected to `public.memories` using 1536-dimensional vector embeddings via OpenRouter (with deterministic local fallback), cosine similarity retrieval for agent context injection, and an interactive memory curation web interface (`REQ-MEM-01`, `REQ-MEM-02`, `REQ-MEM-03`, `NFR-PERF-01`).  
**Depends on:** Phase 24  
**Requirements:** REQ-MEM-01, REQ-MEM-02, REQ-MEM-03, NFR-PERF-01  

**Plans:**
- [ ] Plan 25.1: `MemoryRepository` data access layer, OpenRouter embedding generator with deterministic local fallback, and top-K similarity search service.
- [ ] Plan 25.2: Memory context injection for `SpecifierAgent` and `PlannerAgent`, plus interactive memory curation web UI (`/memory`).

---

### Phase 26: Real-Time State Synchronization Engine
**Status:** ⏳ Pending  
**Objective:** Implement Supabase Realtime client hooks and channel subscriptions across `tasks`, `agent_runs`, `projects`, and `approvals`, providing instant optimistic UI updates and resilient fallback polling upon disconnection (`REQ-RT-01`, `NFR-REL-01`).  
**Depends on:** Phase 25  
**Requirements:** REQ-RT-01, NFR-REL-01  

**Plans:**
- [ ] Plan 26.1: Supabase Realtime connection manager, channel subscription hooks, and optimistic UI state synchronizers.
- [ ] Plan 26.2: Reconnect resilience, fallback polling mechanisms, and end-to-end integration tests for real-time dashboard updates.

---

## Future Milestones Overview (from PRD §12 & docs/ROADMAP.md)

- **Milestone 8:** Approvals, Security & Cost Controls (Emergency kill switch, budget circuit breakers, backup/recovery drills).
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
| 23 | Project Workspace & Hierarchy UI | ⏳ | 0/2 | 0% |
| 24 | Agent Operations Console & Telemetry Viewer | ⏳ | 0/2 | 0% |
| 25 | pgvector Semantic Memory Store & Context | ⏳ | 0/2 | 0% |
| 26 | Real-Time State Synchronization Engine | ⏳ | 0/2 | 0% |
