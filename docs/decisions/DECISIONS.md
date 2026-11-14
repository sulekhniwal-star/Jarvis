# Architecture Decisions: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Living Registry  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Principal Software Architect  
**Date:** November 14, 2026  

---

## 1. Overview & ADR Governance

Every significant structural, security, data, or platform decision in Jarvis is evaluated, debated, and formally recorded as an Architecture Decision Record (ADR) under `docs/decisions/`.

Decisions must not be reversed without authoring a new superseding ADR approved by the lead architect.

---

## 2. ADR Master Index

| ADR ID | Title | Status | Date | Primary Impact Area |
|---|---|---|---|---|
| [ADR-001](file:///f:/Javis/docs/decisions/ADR-001-monorepo-pnpm-turborepo.md) | Monorepo Structure with pnpm and Turborepo | **ACCEPTED** | 2026-11-14 | Codebase Organization & Build Pipelines |
| [ADR-002](file:///f:/Javis/docs/decisions/ADR-002-supabase-and-pgvector-pgmq.md) | Managed & Self-Hosted Supabase with pgvector and pgmq | **ACCEPTED** | 2026-11-14 | Persistence, Message Queues & Vector Memory |
| [ADR-003](file:///f:/Javis/docs/decisions/ADR-003-openrouter-as-ai-gateway.md) | OpenRouter as Primary Unified AI Gateway | **ACCEPTED** | 2026-11-14 | AI Model Discovery, Free Tiers & Cost Telemetry |
| [ADR-004](file:///f:/Javis/docs/decisions/ADR-004-coding-agent-isolated-github-actions.md) | Isolated Ephemeral GitHub Actions Compute with Aider | **ACCEPTED** | 2026-11-14 | Coding Execution & Sandboxing |
| [ADR-005](file:///f:/Javis/docs/decisions/ADR-005-central-permission-and-budget-engine.md) | Central Permission Engine & Hard Financial Caps | **ACCEPTED** | 2026-11-14 | Security Governance & Financial Protection |
| [ADR-006](file:///f:/Javis/docs/decisions/ADR-006-unified-telegram-and-dashboard-state.md) | Unified State Synchronization across Telegram and Web | **ACCEPTED** | 2026-11-14 | User Interfaces & Real-Time Coordination |

---

## 3. Decision Summaries

### ADR-001: Monorepo with pnpm & Turborepo
- **Context:** Multiple applications (Dashboard, Workers) and shared packages (Core, Contracts, DB).
- **Decision:** Use pnpm workspaces with Turborepo for task dependency graphing and caching.
- **Consequences:** Ensures single-version policy across shared contracts; eliminates phantom dependencies.

### ADR-002: Supabase with pgvector & pgmq
- **Context:** Need relational storage, background job queues, and semantic memory without proliferating separate paid infrastructure (e.g., Redis, Pinecone).
- **Decision:** Consolidate on PostgreSQL in Supabase utilizing native `pgvector` for embeddings and `pgmq` for transactional job queues.
- **Consequences:** Zero external message broker cost; fully portable to self-hosted Docker Compose.

### ADR-003: OpenRouter as AI Gateway
- **Context:** Need access to competitive open-weights models (free tier) and commercial LLMs without managing multiple provider billing contracts.
- **Decision:** Use OpenRouter API with dynamic model discovery and `/api/v1/generation` telemetry.
- **Consequences:** Direct access to free model tier (`openrouter/free`); hard-enforced daily/monthly budget caps.

### ADR-004: Ephemeral GitHub Actions Compute with Aider
- **Context:** Autonomous code generation must run in an isolated environment without access to master secrets.
- **Decision:** Dispatch runs via GitHub Actions `workflow_dispatch` to temporary `ubuntu-latest` VMs running Aider CLI inside Docker.
- **Consequences:** Untrusted code execution is cryptographically and physically isolated from Jarvis master credentials.

### ADR-005: Central Permission Engine & Budget Caps
- **Context:** Risk of runaway autonomy, accidental destructive actions, or cloud billing spikes.
- **Decision:** Central Permission Engine gates all high-risk actions behind human approval; Budget Manager strictly enforces INR 25/day and INR 750/month.
- **Consequences:** Zero risk of uncontrolled debt; human retains ultimate governance over production and finances.

### ADR-006: Unified State Synchronization
- **Context:** Operator commands and receives alerts via Telegram and Web Dashboard interchangeably.
- **Decision:** Both frontends share the identical PostgreSQL backend state; state changes propagate via Supabase Realtime and Telegram webhooks.
- **Consequences:** No divergence between mobile and web views.
