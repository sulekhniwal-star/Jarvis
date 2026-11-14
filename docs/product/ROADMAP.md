# Product & Engineering Roadmap: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Principal Software Architect & Product Manager  
**Date:** November 14, 2026  

---

## 1. Roadmap Overview & Sequencing

Jarvis follows a staged delivery model. Application coding begins only after architectural foundations, threat modeling, and technical specifications are approved in **Milestone 0**.

```
[ M0: Architecture & Governance ] ──► [ M1: Supabase Foundation ]
                                             │
                                             ▼
[ M3: Telegram & Web Interface ]  ◄── [ M2: Control Plane & Core ]
         │
         ▼
[ M4: Spec & Planning Agents ]   ──► [ M5: GitHub App Integration ]
                                             │
                                             ▼
[ M7: Automated QA & Healing ]   ◄── [ M6: Coding Execution Engine ]
         │
         ▼
[ M8: Multi-Project & Memory ]   ──► [ M9: Safety & Financial Controls ]
                                             │
                                             ▼
[ M11: MVP Release & Audit ]     ◄── [ M10: Deployment & Maintenance ]
```

---

## 2. MVP Milestones Breakdown

### Milestone 0: Architecture & Governance (CURRENT)
- [x] Comprehensive technical research against latest official docs.
- [x] Author all 24 required architectural, product, and security specifications.
- [x] Establish Architecture Decision Records (ADRs).
- [x] Scaffold monorepo structure and validation tooling.

### Milestone 1: Supabase Foundation
- Initialize Supabase local environment via Docker Desktop and Supabase CLI.
- Implement baseline migrations (users, projects, tasks, RLS policies).
- Configure private Supabase Storage buckets for build artifacts.
- Generate TypeScript database types.

### Milestone 2: Jarvis Control Plane
- Implement domain entities and state machines in `@jarvis/core`.
- Build task transition engine with optimistic concurrency control.
- Configure `pgmq` native background queues and workers.
- Implement basic audit logging.

### Milestone 3: Telegram & Web Interface
- Configure Telegram Bot API webhook with constant-time secret verification.
- Implement Telegram commands (`/task`, `/status`, `/approve`, `/kill`).
- Build Next.js Dashboard with Supabase Auth, project views, and live task feeds.

### Milestone 4: Specification & Planning Agents
- Implement `SpecAgent` for extracting requirements and acceptance criteria.
- Implement `PlanAgent` for DAG task decomposition and dependency tracking.
- Add human approval triggers for high-impact plans.

### Milestone 5: GitHub Integration
- Register GitHub App and configure asymmetric RSA JWT authentication.
- Implement short-lived installation access token generation (`ghs_...`).
- Build repository connection manager and webhook signature listener.

### Milestone 6: Coding Execution Engine
- Implement GitHub Actions `workflow_dispatch` runner pipeline.
- Build Docker isolated execution environment.
- Implement `AiderCliAdapter` for headless code generation.
- Integrate OpenRouter model gateway with `:free` tier routing.

### Milestone 7: Automated Quality Assurance & Self-Healing
- Build automated test runner for TypeScript (`vitest`) and Python (`pytest`).
- Implement static analysis (`semgrep`) and linter checks (`eslint`).
- Implement bounded fix loop (max 3 routine, max 5 complex retries).

### Milestone 8: Project Management & Memory
- Implement multi-project dashboard views and prioritization.
- Build long-term memory engine using `pgvector` HNSW index.
- Implement full-text search fallback and memory correction/deletion APIs.

### Milestone 9: Safety & Financial Management
- Implement central `PermissionEngine` and approval ticket workflow.
- Build `BudgetManager` enforcing INR 25/day and INR 750/month caps.
- Implement hardware/software Emergency Kill Switch.
- Record telemetry from OpenRouter `/api/v1/generation`.

### Milestone 10: Deployment & Repository Maintenance
- Implement automated preview deployments for supported web projects.
- Build production release gating requiring two-factor human approval.
- Implement automated repository health auditing and tech-debt scanning.

### Milestone 11: MVP Quality, Security Review & Release
- End-to-end task execution drill (Telegram prompt -> Plan -> Aider -> PR).
- Comprehensive security review and penetration audit.
- Failure recovery testing (runner termination, network drop).
- Documentation finalization and release tagging.

---

## 3. Future Releases (Post-MVP)

- **Phase 2 (Opportunity & Opportunity Scoring):** Automated scraping for market opportunities, tech trends, competitor analysis, and Weekly Top 3 idea digests.
- **Phase 3 (Omnichannel Personal Assistance):** Official WhatsApp Business API integration, real-time voice interface, email parsing, calendar management, and career application assistance.
- **Phase 4 (Enterprise / Self-Hosted Production):** Production-grade migration to self-hosted Kubernetes / Docker Compose Supabase cluster.
