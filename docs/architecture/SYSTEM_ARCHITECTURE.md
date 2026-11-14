# System Architecture: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Principal Software Architect & Staff Backend Engineer  
**Date:** November 14, 2026  

---

## 1. High-Level Architecture Overview

Jarvis is architected as an asynchronous, event-driven, cloud-first control plane paired with decoupled, ephemeral compute runners. The system is split across four distinct operational domains:

1. **User Interaction Tier:**
   - **Telegram Interface:** Real-time conversational intake, quick mobile approvals, and immediate alerting using Telegram Bot Webhooks.
   - **Web Dashboard:** Comprehensive project management, DAG visualizer, approval queue, telemetry explorer, and audit viewer built in Next.js (App Router), Tailwind CSS, and shadcn/ui.
2. **Control Plane & Orchestration Tier:**
   - **API & Orchestrator:** Hosted on Vercel / Node.js runtime and Supabase Edge Functions. Handles command intake, requirement distillation, milestone planning, and workflow orchestration.
   - **Central Permission Engine:** Evaluates requested actions against policy matrices, halts execution on high-impact actions, and triggers approval tickets.
   - **Budget Manager:** Enforces daily (INR 25) and monthly (INR 750/1,000) spending caps, tracks token telemetry via OpenRouter APIs, and blocks paid inference unless explicitly approved.
3. **Persistence & Messaging Tier:**
   - **Database (PostgreSQL via Supabase):** Multi-tenant relational storage, versioned migrations, Row Level Security (RLS), and database views with `security_invoker = true`.
   - **Native Queues (`pgmq`):** Message queuing for background task distribution, eliminating external Redis/SQS dependencies.
   - **Vector Memory (`pgvector`):** High-dimensional semantic embeddings for codebase patterns, technical decisions, and past failure logs.
   - **Object Storage (Supabase Storage):** Secure, private storage for build artifacts, test logs, and patch archives.
4. **Isolated Execution Tier:**
   - **Ephemeral GitHub Actions Runners:** Temporary, cloud-hosted virtual machines (`ubuntu-latest`) dispatched via GitHub Actions REST API (`workflow_dispatch`).
   - **Docker Sandbox Containers:** Containerized workspace execution running Aider CLI and test suites with strictly limited egress, minimal filesystem privileges, and task-scoped temporary tokens.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph UI ["User Interaction Layer"]
        TG["Telegram Client (Mobile/Desktop)"]
        WEB["Next.js Web Dashboard (Vercel)"]
    end

    subgraph INGRESS ["Ingress & Webhook Verification"]
        TGW["Telegram Webhook Route (HMAC/Secret Checked)"]
        DASH_API["Dashboard Server Actions & API Routes"]
    end

    subgraph CONTROL_PLANE ["Jarvis Control Plane"]
        ORCH["Agent Orchestrator Engine"]
        PERM["Central Permission Engine"]
        BUDGET["Budget & Cost Manager"]
        SPEC_PLAN["Specification & Planning Agents"]
        AI_GW["AI Provider Gateway (OpenRouter Client)"]
    end

    subgraph PERSISTENCE ["Supabase Persistence & Messaging Tier"]
        DB[(PostgreSQL 15+ & RLS)]
        PGMQ["Supabase Queues (pgmq Extension)"]
        VEC["Vector Memory (pgvector)"]
        STORAGE["Artifact Storage (Private S3/Supabase)"]
    end

    subgraph DISPATCH ["Execution Dispatcher"]
        GH_DISPATCH["GitHub Actions API (Workflow Dispatch)"]
    end

    subgraph RUNNERS ["Ephemeral Execution Tier (GitHub Actions)"]
        RUNNER["GitHub-Hosted Runner (ubuntu-latest)"]
        subgraph DOCKER_BOX ["Docker Isolated Sandbox"]
            AIDER["Aider CLI Adapter"]
            TESTS["Language Tooling (pnpm / Python)"]
            LINT["Linters & Security Scanners (Trivy / Semgrep)"]
        end
    end

    TG -->|Encrypted HTTPS| TGW
    WEB -->|Supabase Auth / JWT| DASH_API
    TGW --> ORCH
    DASH_API --> ORCH

    ORCH <--> PERM
    ORCH <--> BUDGET
    ORCH --> SPEC_PLAN
    SPEC_PLAN --> AI_GW
    AI_GW -->|OpenRouter API v1| EXT_MODELS["OpenRouter / LLMs (:free default)"]

    ORCH <-->|Read / Write / RLS| DB
    ORCH <-->|Enqueue / Dequeue| PGMQ
    ORCH <-->|Semantic Search| VEC
    ORCH -->|Upload Artifacts| STORAGE

    ORCH -->|Dispatch Job| GH_DISPATCH
    GH_DISPATCH -->|Webhook Trigger| RUNNER
    RUNNER --> DOCKER_BOX
    DOCKER_BOX -->|Clone & Branch| GH_REPO["GitHub Target Repository"]
    DOCKER_BOX -->|Report Progress & Results| PGMQ
```

---

## 3. Sandboxed Execution & Credential Segregation Architecture

Untrusted code from GitHub issues, pull requests, or generative LLMs must never execute inside an environment holding master application credentials.

```mermaid
sequenceDiagram
    autonumber
    actor User as Human Operator (Telegram / Web)
    participant Orch as Jarvis Orchestrator
    participant Perm as Permission & Budget Engine
    participant DB as Supabase (PostgreSQL + pgmq)
    participant GH as GitHub API / App
    participant Runner as Ephemeral GitHub Actions Runner
    participant Docker as Isolated Docker Container (Aider)

    User->>Orch: Submit Task ("Add rate-limiting middleware")
    Orch->>Perm: Check Budget (Daily < INR 25, Monthly < INR 750)
    Perm-->>Orch: Approved (Budget & Policy OK)
    Orch->>DB: Persist Task (Status: PLANNING)
    Orch->>Orch: Generate Specification & Implementation Plan
    Orch->>DB: Update Task (Status: DISPATCHED)
    
    Orch->>GH: Generate Scoped Installation Token (ghs_..., 60 min, Single Repo)
    Orch->>GH: POST /actions/workflows/coding-agent.yml/dispatches
    Note over Orch,GH: Master secrets remain secure in Supabase.<br/>Only scoped ghs_... token passed to Runner.

    GH->>Runner: Spin up ubuntu-latest VM
    Runner->>Docker: Initialize container with restricted network & Aider CLI
    Docker->>GH: Git checkout task branch (jarvis/task-rate-limit)
    Docker->>Docker: Execute Aider with OpenRouter free model
    Docker->>Docker: Run test suite & static analysis
    Docker->>Runner: Stream test logs & changed diff
    Runner->>GH: Commit to task branch & create Pull Request
    Runner->>DB: Write Task Execution Result & Telemetry via Ingress API
    DB->>Orch: pgmq Event: TASK_COMPLETED
    Orch->>User: Notify via Telegram & Web Dashboard with PR Link
```

---

## 4. State Machine & Task Lifecycle

Every task transitions through an idempotent, strictly tracked finite state machine:

```mermaid
stateDiagram-v2
    [*] --> INTAKE: Task Received
    INTAKE --> SPECIFYING: Clarification / Normalization
    SPECIFYING --> PLANNING: Spec Approved
    PLANNING --> PENDING_APPROVAL: High-Impact / Paid Model
    PLANNING --> DISPATCHED: Normal Risk / Approved
    PENDING_APPROVAL --> DISPATCHED: Human Approves
    PENDING_APPROVAL --> CANCELLED: Human Rejects / Timeout
    DISPATCHED --> RUNNING: Runner Picks Up Job
    RUNNING --> TESTING: Code Generated
    TESTING --> SELF_HEALING: Tests / Linters Fail
    SELF_HEALING --> TESTING: Retried (<= 3 routine, <= 5 complex)
    SELF_HEALING --> ESCALATED: Max Retries Exceeded
    TESTING --> PR_CREATED: Tests Pass
    PR_CREATED --> COMPLETED: PR Merged / Verified
    ESCALATED --> CANCELLED: Human Aborts
    ESCALATED --> DISPATCHED: Human Adjusts Plan
    RUNNING --> EMERGENCY_ABORTED: Kill Switch Triggered
    DISPATCHED --> EMERGENCY_ABORTED: Kill Switch Triggered
```

---

## 5. Monorepo Structure & Package Boundaries

The codebase is organized as a production-grade pnpm monorepo using Turborepo for build orchestration:

```
f:\Javis\
├── apps/
│   └── dashboard/                 # Next.js 15+ App Router, Tailwind CSS, shadcn/ui
├── supabase/
│   ├── migrations/                # Versioned SQL migrations (00000000000000_*.sql)
│   ├── functions/                 # Supabase Edge Functions (Webhooks, Cron triggers)
│   ├── seed.sql                   # Development seed fixtures
│   └── config.toml                # Local Supabase CLI configuration
├── packages/
│   ├── core/                      # Domain entities, value objects, domain events, errors
│   ├── database/                  # Supabase client factory, Drizzle/Kysely schemas, repositories
│   ├── ai-provider/               # OpenRouter client, dynamic model discovery, cost telemetry
│   ├── agent-orchestrator/        # Task lifecycle coordinator, DAG runner, agent adapters
│   ├── permission-engine/         # Policy evaluation matrix, approval ticket management
│   ├── budget-manager/            # Spending caps, balance tracking, ledger audit
│   ├── github-integration/        # GitHub App JWT issuance, Octokit client, PR manager
│   ├── telegram-integration/      # Bot API client, webhook router, command parser
│   ├── memory/                    # pgvector vector store, semantic search, RAG pipeline
│   ├── notifications/             # Multi-channel notification dispatcher (Telegram, Realtime)
│   └── shared-contracts/          # Zod schemas, TypeScript types, API contracts, JSON schemas
├── workers/
│   ├── coding-agent/              # Aider CLI execution wrapper, runner entrypoints
│   ├── research-agent/            # Codebase analyzer, doc fetcher, web search crawler
│   └── python-automation/         # Python automation workers for specialized data/ML tasks
├── infra/
│   ├── docker/                    # Dockerfiles for coding sandboxes & local development
│   ├── github-actions/            # Reusable GitHub Actions workflows (.github/workflows)
│   └── deployment/                # Docker Compose (self-hosted Supabase), Vercel configs
└── docs/                          # Comprehensive system documentation (24 documents + ADRs)
```

---

## 6. Offline Persistence Model & Reliability Guarantees

1. **Decoupling from Local Hardware:** The local developer machine is treated merely as a management client. The Jarvis control plane runs persistently in cloud environments (Supabase + Vercel).
2. **State Atomicity:** All state updates are persisted in PostgreSQL before external operations are triggered. In case of network interruption or server restart, pending tasks are resumed based on their persisted state.
3. **Queue Visibility Timeouts:** Messages processed from `pgmq` are invisible to other workers during execution (default: 300 seconds). If a worker crashes, the message naturally reappears in the queue for retry.
4. **Idempotent Transitions:** Every state transition checks the current state version (`etag` / `updated_at`) using optimistic concurrency control, preventing duplicate execution.
