---
milestone: "v7.0 - Projects, Agents & Memory UI"
updated: 2026-11-16T16:30:00+05:30
---

# REQUIREMENTS.md — Jarvis Requirements Specification (v7.0)

## Overview

Requirements derived from `PRD.md` (§7.2, §7.3, §7.11, §7.12, §8.4), `UI_DESIGN_SYSTEM.md`, and `docs/ROADMAP.md` covering **Milestone 7 (Projects, Agents & Memory UI)**.

---

## Milestone 7 Functional Requirements

| ID | Requirement | Source | Phase | Status |
|---|---|---|---|---|
| **REQ-UI-PROJ-01** | **Project Workspace & Hierarchy Navigation:** Dedicated `/projects` index and `/projects/[id]` detail workspace displaying project metadata, milestone hierarchy, completion velocity, and active task counters. | PRD §7.2, §7.4 | 23 | Complete |
| **REQ-UI-PROJ-02** | **Interactive Kanban Board & Task Controls:** Interactive Kanban board with status columns (`backlog`, `in_progress`, `blocked`, `completed`), status transition controls, and task detail drawer displaying linked specifications, plans, and execution runs. | PRD §7.2, §7.4 | 23 | Complete |
| **REQ-UI-AGENT-01** | **Agent Operations Console:** Dedicated `/agents` dashboard listing durable agent runs across all projects with status filtering (`pending`, `running`, `completed`, `failed`, `rolled_back`), model tags, and duration/cost metrics. | PRD §7.2, §7.6, §7.12 | 24 | Complete |
| **REQ-UI-AGENT-02** | **Run Telemetry & Artifact Inspector:** Drill-down view (`/agents/runs/[id]`) with step-by-step execution timeline, tabbed stdout/stderr log viewer, git diff viewer with quality score badges, and artifact inspection drawer. | PRD §7.6, §7.12 | 24 | Complete |
| **REQ-MEM-01** | **pgvector Semantic Memory Repository:** Typed `MemoryRepository` integrating with `public.memories` using 1536-dim vector embeddings via OpenRouter (with deterministic local fallback) across 4 categories: `user_preference`, `project_decision`, `architecture_pattern`, `historical_error`. | PRD §7.11, §8.4 | 25 | Complete |
| **REQ-MEM-02** | **Memory Retrieval & Agent Context Injection:** Vector similarity search querying memories by cosine distance and injecting top-K relevant past architectural patterns and historical errors into `SpecifierAgent` and `PlannerAgent`. | PRD §7.5, §7.11 | 25 | Complete |
| **REQ-MEM-03** | **Memory Curation & Management UI:** Web interface to browse, filter by category/project, search semantically, manually create, and delete memories with full provenance and timestamp tracking. | PRD §7.11 | 25 | Complete |
| **REQ-RT-01** | **Real-Time State Synchronization Engine:** Supabase Realtime client hooks subscribing to postgres changes on `tasks`, `agent_runs`, `projects`, and `approvals`, ensuring instant optimistic UI updates with automatic reconnection and fallback polling. | PRD §7.2, §7.3 | 26 | Complete |

---

## Non-Functional Requirements & Governance

| ID | Requirement | Category | Phase | Status |
|---|---|---|---|---|
| **NFR-SEC-01** | **Main-Only Branch Lock:** Zero non-main branches created or checked out across all operations and tooling. | Security / Governance | All | Enforced |
| **NFR-SEC-02** | **Zero Secret Leakage:** No API tokens, private credentials, or high-entropy secrets exposed in UI components or browser bundles. | Security | All | Enforced |
| **NFR-SEC-03** | **Owner Isolation & RLS:** 100% of queries against projects, tasks, runs, and memories enforce `user_id = auth.uid()` via Row-Level Security. | Security | All | Enforced |
| **NFR-REL-01** | **Resilient Realtime Fallback:** If WebSocket connection drops, UI seamlessly falls back to gentle background polling without user disruption or duplicate events. | Reliability | 26 | Complete |
| **NFR-PERF-01** | **Performant Vector Queries:** Semantic memory similarity searches execute in <150ms using HNSW cosine index. | Performance | 25 | Complete |
| **NFR-PERF-02** | **Fast Workspace Load:** Project workspace and agent console pages achieve Initial Contentful Paint under 1.5s. | Performance | 23, 24 | Pending |

---

## Traceability Matrix

| Requirement | Phase | Target Plans | Verification Test | Status |
|---|---|---|---|---|
| REQ-UI-PROJ-01, REQ-UI-PROJ-02 | Phase 23 | Plan 23.1, Plan 23.2 | Component rendering tests, Kanban status transition tests, project workspace integration tests | Complete |
| REQ-UI-AGENT-01, REQ-UI-AGENT-02 | Phase 24 | Plan 24.1, Plan 24.2 | Agent console rendering tests, step timeline tests, diff viewer tests, log streaming tests | Complete |
| REQ-MEM-01, REQ-MEM-02, REQ-MEM-03 | Phase 25 | Plan 25.1, Plan 25.2 | Vector embedding tests, cosine similarity retrieval tests, agent prompt injection tests, memory UI tests | Complete |
| REQ-RT-01, NFR-REL-01 | Phase 26 | Plan 26.1, Plan 26.2 | Supabase Realtime subscription mock tests, hook re-render tests, disconnect fallback tests | Complete |

---

## Status Definitions

| Status | Meaning |
|---|---|
| **Pending** | Specification accepted; work not yet started |
| **In Progress** | Active implementation in current phase |
| **Complete** | Implemented and empirically verified with passing tests |
| **Blocked** | Pre-requisites or technical impediments encountered |
| **Deferred** | Explicitly rescheduled for future milestones |
