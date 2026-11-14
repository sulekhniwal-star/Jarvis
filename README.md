# Jarvis – Autonomous Personal AI Software-Building System

> **Persistent, cloud-based personal AI operating system for autonomous software development and engineering lifecycle management.**

---

## 1. Project Overview

**Jarvis** is designed to accept software tasks through Telegram, web dashboard, and GitHub, distill vague requirements into specifications, plan projects into milestones and tasks, execute code generation using isolated coding agents, run tests and security checks, conduct self-healing loops, manage multiple codebases, prepare preview deployments, and maintain long-term architectural memory—all within strict financial caps and a central permission engine.

---

## 2. Milestone 0: Architecture & Governance Specifications

Before writing application code, Jarvis establishes a rigorous, comprehensive architectural and governance foundation. All 24 core specifications are documented and organized within dedicated category directories under `docs/`:

### Categorized Documentation Directories
- **[docs/product/](file:///f:/Javis/docs/product/README.md):** Product strategy, functional requirements, user personas, and roadmaps.
- **[docs/architecture/](file:///f:/Javis/docs/architecture/README.md):** System architecture, database schema, APIs, multi-agent design, coding adapters, and workflow engine.
- **[docs/security/](file:///f:/Javis/docs/security/README.md):** STRIDE threat model, credential isolation, permission policies, and budget controls.
- **[docs/operations/](file:///f:/Javis/docs/operations/README.md):** Deployment topology, backup/recovery, current state, research log, and risk registers.
- **[docs/testing/](file:///f:/Javis/docs/testing/README.md):** Testing strategy, security analysis, and task telemetry specifications.
- **[docs/decisions/](file:///f:/Javis/docs/decisions/README.md):** Formal Architecture Decision Records (ADRs 001 - 006).

### Master Specification Index

| # | Category | Specification Document | Direct Link |
|---|---|---|---|
| 01 | Product | Product Requirements Document | [docs/product/PRODUCT_REQUIREMENTS.md](file:///f:/Javis/docs/product/PRODUCT_REQUIREMENTS.md) |
| 02 | Architecture | System Architecture & Data Flows | [docs/architecture/SYSTEM_ARCHITECTURE.md](file:///f:/Javis/docs/architecture/SYSTEM_ARCHITECTURE.md) |
| 03 | Architecture | Technology Stack Specification | [docs/architecture/TECH_STACK.md](file:///f:/Javis/docs/architecture/TECH_STACK.md) |
| 04 | Architecture | Database Schema & PostgreSQL DDL | [docs/architecture/DATABASE_SCHEMA.md](file:///f:/Javis/docs/architecture/DATABASE_SCHEMA.md) |
| 05 | Architecture | API & Webhook Specification | [docs/architecture/API_SPECIFICATION.md](file:///f:/Javis/docs/architecture/API_SPECIFICATION.md) |
| 06 | Architecture | Multi-Agent Cognitive Architecture | [docs/architecture/AGENT_DESIGN.md](file:///f:/Javis/docs/architecture/AGENT_DESIGN.md) |
| 07 | Architecture | Coding Agent Adapter Interface | [docs/architecture/CODING_AGENT_INTERFACE.md](file:///f:/Javis/docs/architecture/CODING_AGENT_INTERFACE.md) |
| 08 | Architecture | Workflow DAG Execution Engine | [docs/architecture/WORKFLOW_ENGINE.md](file:///f:/Javis/docs/architecture/WORKFLOW_ENGINE.md) |
| 09 | Security | Security & STRIDE Threat Model | [docs/security/SECURITY_THREAT_MODEL.md](file:///f:/Javis/docs/security/SECURITY_THREAT_MODEL.md) |
| 10 | Security | Permission Policy & Autonomy Matrix | [docs/security/PERMISSION_POLICY.md](file:///f:/Javis/docs/security/PERMISSION_POLICY.md) |
| 11 | Security | Budget & Financial Cost Control | [docs/security/BUDGET_AND_COST_CONTROL.md](file:///f:/Javis/docs/security/BUDGET_AND_COST_CONTROL.md) |
| 12 | Architecture | Long-Term Memory & Vector Architecture | [docs/architecture/MEMORY_ARCHITECTURE.md](file:///f:/Javis/docs/architecture/MEMORY_ARCHITECTURE.md) |
| 13 | Architecture | GitHub App & Runner Integration | [docs/architecture/GITHUB_INTEGRATION.md](file:///f:/Javis/docs/architecture/GITHUB_INTEGRATION.md) |
| 14 | Architecture | Telegram Bot API Webhook Integration | [docs/architecture/TELEGRAM_INTEGRATION.md](file:///f:/Javis/docs/architecture/TELEGRAM_INTEGRATION.md) |
| 15 | Operations | Multi-Tier Deployment Strategy | [docs/operations/DEPLOYMENT_STRATEGY.md](file:///f:/Javis/docs/operations/DEPLOYMENT_STRATEGY.md) |
| 16 | Testing | Automated Testing & QA Strategy | [docs/testing/TEST_STRATEGY.md](file:///f:/Javis/docs/testing/TEST_STRATEGY.md) |
| 17 | Operations | Backup & Disaster Recovery Strategy | [docs/operations/BACKUP_AND_RECOVERY.md](file:///f:/Javis/docs/operations/BACKUP_AND_RECOVERY.md) |
| 18 | Product | Product & Engineering Roadmap | [docs/product/ROADMAP.md](file:///f:/Javis/docs/product/ROADMAP.md) |
| 19 | Operations | Real-time Project Progress Ledger | [docs/PROGRESS.md](file:///f:/Javis/docs/PROGRESS.md) |
| 20 | Operations | Semantic Versioning Changelog | [docs/CHANGELOG.md](file:///f:/Javis/docs/CHANGELOG.md) |
| 21 | Decisions | Master Architecture Decisions Index | [docs/decisions/DECISIONS.md](file:///f:/Javis/docs/decisions/DECISIONS.md) |
| 22 | Operations | Current Repository & System State | [docs/operations/CURRENT_STATE.md](file:///f:/Javis/docs/operations/CURRENT_STATE.md) |
| 23 | Operations | Primary Source Research Log | [docs/operations/RESEARCH_LOG.md](file:///f:/Javis/docs/operations/RESEARCH_LOG.md) |
| 24 | Operations | Risk & Active Issues Register | [docs/operations/RISKS_AND_ISSUES.md](file:///f:/Javis/docs/operations/RISKS_AND_ISSUES.md) |

---

## 3. Architecture Decision Records (ADRs)

- [ADR-001: Monorepo Architecture with pnpm and Turborepo](file:///f:/Javis/docs/decisions/ADR-001-monorepo-pnpm-turborepo.md)
- [ADR-002: Managed & Self-Hosted Supabase with pgvector and pgmq](file:///f:/Javis/docs/decisions/ADR-002-supabase-and-pgvector-pgmq.md)
- [ADR-003: OpenRouter as Primary Unified AI Gateway](file:///f:/Javis/docs/decisions/ADR-003-openrouter-as-ai-gateway.md)
- [ADR-004: Isolated Ephemeral GitHub Actions Compute with Aider](file:///f:/Javis/docs/decisions/ADR-004-coding-agent-isolated-github-actions.md)
- [ADR-005: Central Permission Engine & Hard Financial Caps](file:///f:/Javis/docs/decisions/ADR-005-central-permission-and-budget-engine.md)
- [ADR-006: Unified State Synchronization Across Telegram and Web Dashboard](file:///f:/Javis/docs/decisions/ADR-006-unified-telegram-and-dashboard-state.md)

---

## 4. Monorepo Structure

```
f:\Javis\
├── apps/
│   └── dashboard/                 # Next.js 15 App Router Web Dashboard
├── supabase/
│   ├── migrations/                # Versioned SQL migrations (00000000000000_*.sql)
│   ├── functions/                 # Supabase Edge Functions (Webhooks)
│   ├── seed.sql                   # Database seed fixtures
│   └── config.toml                # Supabase CLI configuration
├── packages/
│   ├── core/                      # Domain entities, value objects, domain events
│   ├── database/                  # Repositories & Supabase client factory
│   ├── ai-provider/               # OpenRouter gateway client & telemetry parser
│   ├── agent-orchestrator/        # Task lifecycle coordinator & DAG runner
│   ├── permission-engine/         # Policy evaluation matrix & approval tickets
│   ├── budget-manager/            # Spending caps, balance tracking & ledger
│   ├── github-integration/        # GitHub App JWT issuance & PR automation
│   ├── telegram-integration/      # Bot API client & webhook verification
│   ├── memory/                    # pgvector vector store & RAG retrieval
│   ├── notifications/             # Multi-channel notification dispatcher
│   └── shared-contracts/          # Zod schemas, TypeScript types, API contracts
├── workers/
│   ├── coding-agent/              # Aider CLI adapter & runner entrypoints
│   ├── research-agent/            # Codebase analyzer & document scraper
│   └── python-automation/         # Python automation workers for AST/data analysis
├── infra/
│   ├── docker/                    # Dockerfiles for sandbox runner & local dev
│   ├── github-actions/            # Reusable GitHub Actions workflow templates
│   └── deployment/                # Self-hosted Docker Compose stack & Vercel configs
└── docs/                          # Comprehensive specifications & ADRs
    ├── architecture/              # System architecture, DB schemas, APIs & adapters
    ├── product/                   # PRDs, personas & roadmap
    ├── security/                  # Threat models, permissions & cost control
    ├── operations/                # Deployment, backups, state & research logs
    ├── testing/                   # Test strategy & verification protocols
    └── decisions/                 # Architecture Decision Records (ADRs)
```

---

## 5. Non-Negotiable Operational & Financial Guardrails

1. **Hard Budget Caps:** Daily spending is capped at **INR 25**; monthly spending is capped at **INR 750** (max **INR 1,000** with explicit emergency reserve approval). Outbound paid requests are hard-blocked prior to exceeding limits.
2. **Zero-Cost Model Default:** Jarvis defaults to verified free models (`:free` suffix on OpenRouter). Paid models strictly require human approval tickets.
3. **Sandbox Security:** Ephemeral GitHub Actions runners run in Docker containers with restricted network egress. Master secrets are never exposed to runners.
4. **Offline Persistence:** All state resides in PostgreSQL (`tasks`, `agent_runs`, `pgmq`). The system operates continuously in the cloud when the local laptop is offline.
