# JARVIS — Architecture Decision Records (ADRs)

**Document:** `docs/DECISIONS.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## Index of Architecture Decision Records

- **ADR-001:** Exclusive Use of GitHub `main` Branch (Main-Only Policy)
- **ADR-002:** Managed-First, Self-Hostable Supabase (PostgreSQL) Architecture
- **ADR-003:** OpenRouter as Primary AI Gateway with Free-Model Priority
- **ADR-004:** Next.js App Router for Unified Web Dashboard and Orchestrator
- **ADR-005:** Ephemeral GitHub Actions and Docker Sandbox for Untrusted Code Execution
- **ADR-006:** Telegram Bot API for Mobile Task Intake and Real-Time Approvals
- **ADR-007:** Integrated Vector Search via PostgreSQL `pgvector`
- **ADR-008:** Bounded 3-Strike Rule for Autonomous Test/Build Repairs
- **ADR-009:** Daily (₹25) and Monthly (₹750) Budget Circuit Breakers

---

### ADR-001: Exclusive Use of GitHub `main` Branch (Main-Only Policy)
- **Status:** Approved / Mandated by Owner.
- **Context:** Conventional Git workflows rely on feature branches and pull requests. The owner explicitly mandates direct commits to `main` without PRs.
- **Decision:** Jarvis will checkout and commit exclusively on the local `main` branch. Pushes target `origin/main` only and require explicit human approval. Feature, dev, and hotfix branches are strictly prohibited.
- **Consequences:** Eliminates PR overhead and branch synchronization drift. Requires strict pre-commit verification (all tests must pass before commit) and immutable approval gates before pushing.

### ADR-002: Managed-First, Self-Hostable Supabase (PostgreSQL) Architecture
- **Status:** Approved.
- **Context:** The system needs a robust, scalable database with Auth, Storage, and Realtime capabilities. The owner prefers free cloud hosting with zero vendor lock-in.
- **Decision:** Utilize Supabase Cloud free tier for production while using Supabase CLI and Docker Compose for local dev. All migrations, RLS policies, and database functions must strictly adhere to standard PostgreSQL 15+ standards to ensure seamless migration to self-hosted VPS if desired.
- **Consequences:** Free cloud hosting with no server maintenance. Requires active monitoring of free-tier pause conditions (inactivity after 7 days) and strict avoidance of proprietary platform extensions.

### ADR-003: OpenRouter as Primary AI Gateway with Free-Model Priority
- **Status:** Approved.
- **Context:** The system needs access to multiple LLM architectures (Llama, Gemini, Qwen, Claude) without managing separate API keys and contracts. Monthly AI budget is capped at ₹750 INR.
- **Decision:** Route all model inference through OpenRouter. Default to verified free models (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `qwen/qwen-2.5-coder-32b-instruct:free`). Paid model invocation requires explicit owner sign-off.
- **Consequences:** Greatly reduces operating costs. Paid fallback is not automatic; requires human-in-the-loop when free models are rate-limited or degraded.

### ADR-004: Next.js App Router for Unified Web Dashboard and Orchestrator
- **Status:** Approved.
- **Context:** Need an accessible, high-performance UI framework capable of rendering the futuristic command centre while serving robust backend Route Handlers.
- **Decision:** Build the platform using Next.js App Router with TypeScript, Tailwind CSS, and shadcn/ui.
- **Consequences:** High cohesion, shared TypeScript types across client and API routes, server-side data fetching with minimal bundle size.

### ADR-005: Ephemeral GitHub Actions and Docker Sandbox for Untrusted Code Execution
- **Status:** Approved.
- **Context:** Running AI-generated code, package installations, and tests on the owner's laptop or in the central production server poses severe security risks.
- **Decision:** Isolate code modification and test execution in temporary, disposable GitHub Actions runners executing in Docker containers. Master database keys and server secrets are never mounted in the runner.
- **Consequences:** Complete isolation of untrusted code. Zero risk of local host corruption. Slightly higher execution latency due to runner container startup.

### ADR-006: Telegram Bot API for Mobile Task Intake and Real-Time Approvals
- **Status:** Approved.
- **Context:** The owner needs to interact with Jarvis from mobile devices without building native iOS/Android applications.
- **Decision:** Implement a Telegram Bot gateway tied to the owner's unique Telegram user ID (`OWNER_TELEGRAM_ID`).
- **Consequences:** Zero hosting cost, instant push notifications, and one-click inline keyboard approvals on mobile.

### ADR-007: Integrated Vector Search via PostgreSQL `pgvector`
- **Status:** Approved.
- **Context:** Need long-term semantic memory and code retrieval without maintaining a separate vector database (e.g., Pinecone, Qdrant).
- **Decision:** Enable the `vector` extension in PostgreSQL and manage embeddings in the `memories` table with HNSW indexes.
- **Consequences:** Unified backup, transactional consistency between relational data and embeddings, zero added infrastructure cost.

### ADR-008: Bounded 3-Strike Rule for Autonomous Test/Build Repairs
- **Status:** Approved.
- **Context:** Autonomous agents attempting to fix failing tests can enter infinite loops, generating invalid patches and draining budgets.
- **Decision:** Cap automated repair attempts at 3 strikes per task. If tests do not pass after 3 attempts, revert the sandbox working tree, mark the task as failed, and alert the owner.
- **Consequences:** Prevents budget drain and context thrashing. Ensures human escalation on difficult architectural bugs.

### ADR-009: Daily (₹25) and Monthly (₹750) Budget Circuit Breakers
- **Status:** Approved.
- **Context:** Unmonitored LLM token consumption can lead to unexpected cloud bills.
- **Decision:** Implement hard spending caps: ₹25.00 INR daily and ₹750.00 INR monthly. Crossing limits immediately halts billable API calls and alerts the owner.
- **Consequences:** Total financial safety. Prevents runaway charges under all failure modes.
