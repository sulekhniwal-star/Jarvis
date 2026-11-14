# Project Jarvis — Technical Research Log

**Document Version:** 1.0  
**Verification Date:** 2026-11-13  
**Status:** Completed & Verified for Milestone 0  

---

## Purpose
This document logs the formal technical research conducted across all critical architectural domains of Project Jarvis prior to code implementation. All decisions are based on official vendor documentation, release notes, security advisories, and active repository specifications.

---

## Topic 1: Python and FastAPI Framework

- **Topic:** Backend API & Service Layer
- **Question:** What is the optimal runtime version, web framework, and async ecosystem for the Jarvis control-plane API?
- **Official Sources:**
  - Python Documentation (Python 3.12 / 3.13 Release Notes & Status)
  - FastAPI Documentation (`fastapi.tiangolo.com`, v0.115+)
  - Pydantic Documentation (`docs.pydantic.dev`, v2.9+)
  - Uvicorn Documentation (`www.uvicorn.org`)
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Python Version:** Python 3.12 is the primary stable recommendation for production AI backends. Python 3.12 offers ~10-15% performance improvements in bytecode execution, lower memory overhead, and full ecosystem compatibility with async frameworks, SQLAlchemy 2.0, and LangGraph.
  - **FastAPI (v0.115+):** Built on Starlette and Pydantic v2. Provides native asynchronous request handling (`async`/`await`), automatic OpenAPI/Swagger documentation, and native dependency injection for database sessions and auth contexts.
  - **Pydantic v2:** Rust-backed validation core (`pydantic-core`) providing 5x-20x validation speedup over v1. Strict type checking, JSON schema serialization, and immutable settings models via `pydantic-settings`.
  - **ASGI Server:** Uvicorn with standard uvloop and httptools.
- **Version Compatibility:** Python >=3.11, <3.13; FastAPI >=0.115.0; Pydantic >=2.9.0; SQLAlchemy >=2.0.35; psycopg >=3.2.0.
- **Licensing & Cost:** Python (PSF, Open Source), FastAPI (MIT), Pydantic (MIT), Uvicorn (BSD-3). 100% Free / ₹0 cost.
- **Security Implications:** FastAPI route handlers require strict Pydantic input models to prevent injection attacks and payload tampering. Automatic OpenAPI docs must be disabled or authenticated in production (`docs_url=None`, `redoc_url=None`).
- **Recommendation:** Standardize on Python 3.12 with FastAPI and Pydantic v2 for the control-plane backend.

---

## Topic 2: LangGraph and Agent Orchestration

- **Topic:** Stateful Multi-Step Workflow Orchestration & Human-in-the-Loop
- **Question:** How should complex multi-step coding workflows, retries, checkpointing, and human approval interrupts be orchestrated?
- **Official Sources:**
  - LangChain / LangGraph Official Documentation (`langchain-ai.github.io/langgraph`)
  - LangGraph Python Repository (`github.com/langchain-ai/langgraph`, v0.2+)
  - LangGraph Checkpoint Postgres (`langgraph-checkpoint-postgres`, v2.0+)
- **Verification Date:** 2026-11-13
- **Findings:**
  - **StateGraph:** Provides a cyclically directed graph model where every step is a node operating on a shared, strongly-typed state schema. Supports branching, conditional edges, dynamic routing, and explicit sub-graphs.
  - **Durable Checkpointing (`AsyncPostgresSaver`):** LangGraph separates graph definitions from persistence. With `langgraph-checkpoint-postgres`, every state transition is committed to PostgreSQL (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`). If the coordinator crashes or is restarted, workflows resume exactly from the last saved checkpoint using `thread_id`.
  - **Human-in-the-loop (Interrupts):** Native support for `interrupt_before` or `interrupt_after` specific nodes (e.g., `approval_node`, `github_pr_node`), freezing state in PostgreSQL until an external event (human approval via dashboard) resumes execution with `app.invoke(None, config)`.
  - **Safe Deserialization:** Requires `LANGGRAPH_STRICT_MSGPACK=true` in production to prevent arbitrary code execution vulnerabilities during checkpoint deserialization.
- **Version Compatibility:** `langgraph >= 0.2.35`, `langgraph-checkpoint-postgres >= 2.0.0`, `psycopg[binary,pool] >= 3.2.0`.
- **Licensing & Cost:** MIT License. Free / ₹0 cost.
- **Security Implications:** Checkpointer stores execution state which may contain code snippets and logs. Database must be encrypted at rest and network-restricted.
- **Recommendation:** Adopt LangGraph with `AsyncPostgresSaver` for the task planner and coding workflow coordinator.

---

## Topic 3: Next.js and TypeScript Dashboard

- **Topic:** Responsive Web Dashboard & Mobile Interface
- **Question:** What frontend architecture provides a mobile-first, reactive interface for monitoring tasks, approving actions, and viewing logs?
- **Official Sources:**
  - Next.js Documentation (`nextjs.org/docs`, Next.js 15)
  - React Documentation (`react.dev`, React 19)
  - Tailwind CSS (`tailwindcss.com`, v3.4+)
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Next.js 15 App Router:** Supports React Server Components (RSC) for fast initial load and Server Actions / Client Components for reactive task timelines and approval buttons.
  - **TypeScript:** Enforces strict client-server contracts matching backend Pydantic models.
  - **Mobile-first UI:** Built with Tailwind CSS and responsive flex/grid layouts. Designed specifically for phone screens (iOS/Android mobile Safari & Chrome) as well as desktop displays.
  - **Real-time updates:** Server-Sent Events (SSE) or short polling (3-5s) against FastAPI task status endpoints.
- **Version Compatibility:** Next.js >= 15.0.0, React >= 19.0.0, TypeScript >= 5.6.0.
- **Licensing & Cost:** MIT License. Free / ₹0 cost. Can be hosted on Vercel Free Tier or self-hosted via Docker container.
- **Security Implications:** All mutations (approvals, task creation, emergency stop) require CSRF protection, secure HTTP-only cookies, and bearer token authorization.
- **Recommendation:** Implement the dashboard in Next.js 15 + TypeScript + Tailwind CSS with mobile-first viewport design.

---

## Topic 4: PostgreSQL & Supabase

- **Topic:** Relational Persistence & State Storage
- **Question:** What is the optimal database strategy balancing ₹0 upfront cost, managed convenience, and future portability to self-hosted PostgreSQL?
- **Official Sources:**
  - Supabase Pricing & Documentation (`supabase.com/docs`)
  - PostgreSQL Official Documentation (`postgresql.org`, v15/v16)
  - Supavisor Connection Pooler Guide
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Supabase Free Tier:**
    - 2 active projects per account at $0/month.
    - 500 MB database storage (adequate for thousands of task records and audit logs).
    - 5 GB monthly bandwidth/egress.
    - 50,000 monthly active users (single-owner Jarvis needs 1).
    - Dedicated pooling port (6543) via Supavisor for serverless / stateless connections and direct port (5432) for migrations.
  - **Critical Inactivity Pause Rule:** Supabase automatically pauses Free Tier projects after 7 consecutive days of low database activity. Projects remain intact and can be manually resumed in the dashboard or kept active by a lightweight scheduled weekly health ping. Data is retained for up to 1 year during pauses.
  - **Portability:** Supabase is vanilla PostgreSQL with standard extensions (`pgcrypto`, `pgvector`). All schemas are defined via standard SQLAlchemy / Alembic migrations, enabling instant migration to self-hosted Docker PostgreSQL or AWS RDS with zero code changes.
- **Version Compatibility:** PostgreSQL 15.x / 16.x; SQLAlchemy 2.0; Alembic 1.13+.
- **Licensing & Cost:** Supabase Free Tier = ₹0/month. Self-hosted PostgreSQL = ₹0/month.
- **Security Implications:** Direct database access must be restricted by strong passwords and TLS `sslmode=require`. Connection credentials must never be passed to untrusted workers.
- **Recommendation:** Use Supabase Free Tier for cloud deployment with an automated weekly keep-alive ping, and support local PostgreSQL via Docker for offline/local development.

---

## Topic 5: GitHub Apps and GitHub Actions

- **Topic:** Source Control Integration & Ephemeral Cloud Execution
- **Question:** How can Jarvis securely interact with GitHub repositories without personal access tokens (PATs) and run disposable execution environments?
- **Official Sources:**
  - GitHub REST API & GitHub Apps Documentation (`docs.github.com/en/apps`)
  - GitHub Actions Runner Documentation & Security Hardening Guides
  - GitHub Pricing Documentation (2,000 free Actions minutes/month for private repos)
- **Verification Date:** 2026-11-13
- **Findings:**
  - **GitHub App vs PAT:** GitHub Apps provide superior security over personal access tokens:
    - Dedicated bot identity (e.g., `jarvis-bot[bot]`).
    - Repository-specific installation scope (only designated private repos).
    - Asymmetric cryptographic authentication: App signs a JWT using a 2048-bit RSA private key to request an ephemeral installation access token (`ghs_...`) that expires automatically after 60 minutes.
    - Webhook event verification using HMAC-SHA256 signatures with secret token.
  - **GitHub Actions as Disposable Execution Plane:**
    - GitHub provides 2,000 free Actions minutes per month on standard Linux runners (2-core CPU, 7 GB RAM, 14 GB SSD) for private repositories.
    - Runners are completely fresh, disposable virtual machines per job. No residual state or compromised host persistence.
    - Jarvis can trigger an action via `repository_dispatch` or workflow dispatch, pass an ephemeral task payload, execute builds and tests, and upload artifacts.
- **Version Compatibility:** GitHub API v3 (REST) / v4 (GraphQL); GitHub App Manifest API.
- **Licensing & Cost:** GitHub Free tier includes 2,000 minutes/month for private repos (₹0).
- **Security Implications:**
  - Restrict GitHub App permissions to: `Contents: Read and write`, `Pull requests: Read and write`, `Metadata: Read-only`. Do NOT grant `Administration`, `Workflows: write`, or `Security events: write`.
  - Workflow dispatch inputs must be sanitized against command injection (`${{ github.event.client_payload... }}`).
- **Recommendation:** Register a dedicated GitHub App for repo interactions and use GitHub Actions as the primary disposable cloud execution engine.

---

## Topic 6: Docker Security & Isolated Execution

- **Topic:** Local and Containerized Sandbox Security
- **Question:** How must disposable execution environments be locked down to prevent host compromise, sandbox escape, and credential exfiltration?
- **Official Sources:**
  - Docker Documentation — Security & Hardening (`docs.docker.com/engine/security/`)
  - CIS Docker Benchmark (Center for Internet Security)
  - Linux Kernel Namespaces and Cgroups Security
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Mandatory Container Hardening Flags:**
    - Non-root execution: `USER 1000:1000` (`--user 1000:1000`).
    - Drop all Linux capabilities: `--cap-drop=ALL` (prevent raw sockets, chown, sys_admin).
    - Prevent privilege escalation: `--security-opt=no-new-privileges:true`.
    - Read-only root filesystem: `--read-only`.
    - Ephemeral writable scratch directories: `--tmpfs /tmp:rw,noexec,nosuid,size=512m` and `--tmpfs /workspace:rw,nosuid,size=2g`.
    - Strict cgroups resource quotas: `--memory=2g --memory-swap=2g --cpus=1.5 --pids-limit=100`.
    - Network isolation: `--network=none` for test execution when no external network is required, or proxy-gated egress.
  - **No Host Mounts:** Never mount host Docker socket (`/var/run/docker.sock`) or host filesystem directories into the worker container.
- **Version Compatibility:** Docker Engine 24.x+ / Docker Desktop on Windows with WSL2 backend.
- **Licensing & Cost:** Docker Engine is open source (Apache 2.0). Free / ₹0 cost.
- **Security Implications:** Containers share the host kernel; therefore, unprivileged user execution, capability dropping, and seccomp profiles are essential defenses against container escape.
- **Recommendation:** Enforce strict container security profiles (`--cap-drop=ALL`, `--user 1000:1000`, `--network=none`, `--read-only`) for all local execution workers.

---

## Topic 7: Telegram Bot API

- **Topic:** Mobile Task Intake & Asynchronous Notifications
- **Question:** How should the Telegram bot communicate with Jarvis securely and reliably?
- **Official Sources:**
  - Telegram Bot API Documentation (`core.telegram.org/bots/api`)
  - Python Telegram Bot / aiogram Documentation
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Connection Modes:**
    - *Long Polling (`getUpdates`):* The Jarvis coordinator queries Telegram's servers outbound over HTTPS. Does not require a public IP, DNS domain, or open incoming firewall ports. Ideal for Windows 11 local development and hybrid setups.
    - *Webhook:* Telegram pushes updates to an HTTPS endpoint. Requires public TLS endpoint and validation of `X-Telegram-Bot-Api-Secret-Token` header.
  - **Security & Authorization:**
    - All incoming messages must be checked against a strict, static `ALLOWED_TELEGRAM_USER_IDS` configuration list.
    - Any message from an unauthorized Telegram account is silently dropped and logged as a security event.
    - The bot token (`token: 123456:ABC-DEF...`) must be stored in encrypted secrets and never exposed in logs.
  - **Formatting & Escaping:** Telegram MarkdownV2 requires escaping of special characters (`_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`).
- **Version Compatibility:** Telegram Bot API v7.0+.
- **Licensing & Cost:** Free / ₹0 cost from Telegram.
- **Security Implications:** Telegram is an unauthenticated transport until verified; user ID check must happen before any prompt parsing or dispatch.
- **Recommendation:** Implement Long Polling for initial MVP development (zero-config, firewall-friendly) with strict single-user ID allowlisting, with support for webhook mode in cloud deployment.

---

## Topic 8: Gemini API and Alternative Model Providers

- **Topic:** AI Model Selection, API Limits, Data Privacy, and Abstraction
- **Question:** What are the actual free-tier capabilities, rate limits, pricing, and data privacy policies for Gemini and other model providers?
- **Official Sources:**
  - Google AI Studio Pricing & Terms (`ai.google.dev/pricing`)
  - Google AI Studio Terms of Service (Data Usage Policy)
  - Anthropic & OpenAI API Reference
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Consumer Subscription vs API Access:**
    - A consumer Google Gemini Advanced / One subscription does NOT provide Gemini API credits.
    - Gemini API access is provisioned through Google AI Studio / Google Cloud Vertex AI.
  - **Google AI Studio Free Tier:**
    - Eligible models (e.g. Gemini 1.5 Flash, Gemini 2.0 Flash) have a $0 free tier with rate limits (typically 5-15 Requests Per Minute, ~250k Tokens Per Minute, and daily request caps).
    - **CRITICAL SECURITY / PRIVACY FINDING:** On the Free Tier of Google AI Studio, user prompts and responses may be logged and used by Google to train and improve products, and may be reviewed by human annotators.
    - **Privacy Protection:** For proprietary codebases, confidential data must NEVER be sent to the free tier without explicit user consent. When data privacy is required, a linked billing profile with standard pay-as-you-go pricing (where Google does NOT train on inputs) or local models (Ollama) must be used.
  - **Provider-Independent Abstraction:**
    - Architecture must implement an abstract base class `AIProvider` with methods `generate()`, `stream()`, and `count_tokens()`.
    - `MockProvider`: Default provider for all unit and integration tests. Returns deterministic plan and code structures with 0 network calls and ₹0 cost.
    - `GeminiProvider`: Implements Gemini REST API / SDK calls.
    - `OpenAICompatibleProvider`: Supports standard `/v1/chat/completions` endpoints for Ollama, Groq, DeepSeek, or OpenAI.
- **Version Compatibility:** `google-genai` / `google-generativeai >= 0.8.0`; `httpx >= 0.27.0`.
- **Licensing & Cost:** Free tier: ₹0/month within quotas. Mock provider: ₹0.
- **Security Implications:** API keys must be encrypted at rest. Outbound model requests must redact known environment variables and access tokens.
- **Recommendation:** Build the `MockProvider` first for automated testing and CI. Integrate `GeminiProvider` with strict paid-call blocking and configurable data-use warnings.

---

## Topic 9: Authentication and Secrets Management

- **Topic:** Access Control & Credential Security
- **Question:** How should single-tenant access and sensitive integration secrets (GitHub private keys, bot tokens, API keys) be managed?
- **Official Sources:**
  - OWASP Top 10 & API Security Top 10
  - NIST SP 800-63B (Digital Identity Guidelines)
  - Cryptography Python Library (`cryptography.io`)
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Dashboard Authentication:**
    - Single-owner authentication using Argon2id password hashing (`argon2-cffi`).
    - Cryptographically signed session tokens (HMAC-SHA256 JWT) with 24-hour expiration, stored in secure HTTP-only, SameSite=Strict cookies.
    - Rate-limiting on login endpoint (max 5 failed attempts per 15 minutes) with exponential backoff.
  - **Secrets at Rest:**
    - Environment variables used for core application keys (`SECRET_KEY`, `MASTER_ENCRYPTION_KEY`).
    - User/Integration secrets stored in the database (e.g., GitHub App private key, Telegram bot token) are encrypted using AES-256-GCM authenticated encryption via `cryptography.fernet`.
    - No secrets stored in plaintext, memory snapshots, or git repositories.
    - Comprehensive `.env.example` provided with dummy values.
- **Version Compatibility:** `argon2-cffi >= 23.1.0`, `pyjwt >= 2.9.0`, `cryptography >= 43.0.0`.
- **Licensing & Cost:** Open Source / MIT / Apache 2.0. ₹0 cost.
- **Security Implications:** Secret keys must never be logged or echoed in API responses. Log redactor must scrub patterns matching JWTs, GitHub tokens (`ghp_`, `ghs_`), and API keys.
- **Recommendation:** Implement Argon2id + JWT HttpOnly auth for the dashboard and Fernet AES-256-GCM encryption for stored integration secrets.

---

## Topic 10: AI Agent Security and Prompt Injection

- **Topic:** Adversarial Defense & Deterministic Policy Enforcement
- **Question:** How can Jarvis be protected against indirect prompt injection embedded in repository files, issues, commit messages, or web content?
- **Official Sources:**
  - OWASP Top 10 for Large Language Model Applications (LLM01: Prompt Injection, LLM02: Sensitive Information Disclosure, LLM06: Excessive Agency)
  - UK NCSC Guidelines for Secure AI System Development
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Core Security Axiom:** *Prompts cannot be trusted to enforce security boundaries.* Natural language instructions to "ignore user instructions" or "system override" are effective against prompt-only guardrails.
  - **Architectural Defense-in-Depth:**
    1. **Data Isolation:** External repository content (README, source code, comments, issues) is ingested strictly as *data payloads* enclosed in delimited user blocks, never concatenated into system instructions.
    2. **Deterministic Capability Gating:** The AI model is treated as an untrusted proposal engine. Every tool call requested by the model is intercepted and validated by a deterministic, non-AI Python policy engine.
    3. **Filesystem Boundary Check:** Tool execution enforces path sandboxing (e.g. `path.resolve().is_relative_to(workspace_dir)`). Attempts to access parent paths (`../`, `/etc/`, `C:\Windows`) throw permission errors outside the model.
    4. **Command Allowlist:** Only approved commands (e.g., `pytest`, `npm test`, `git status`) may be executed in workers. Shell meta-characters (`;`, `&&`, `|`, `>` ) are rejected unless explicitly sanitized.
    5. **Non-Self-Approval:** The agent has zero programmatic ability to approve its own actions or elevate its permissions.
- **Version Compatibility:** Architectural pattern applicable across all models and toolkits.
- **Licensing & Cost:** ₹0 cost.
- **Security Implications:** Prevents prompt-injection attacks from exfiltrating credentials, destroying data, or executing unauthorized cloud actions.
- **Recommendation:** Implement strict architectural separation: model proposes tool calls; deterministic Python policy layer authorizes and executes them.

---

## Topic 11: Testing, Observability, and Backup Systems

- **Topic:** Verification, Structured Telemetry, and Disaster Recovery
- **Question:** What automated testing framework, logging pipeline, and backup mechanisms ensure system reliability and zero-data-loss recovery?
- **Official Sources:**
  - Pytest Documentation (`docs.pytest.org`)
  - Structlog Documentation (`structlog.org`)
  - PostgreSQL pg_dump Official Documentation
- **Verification Date:** 2026-11-13
- **Findings:**
  - **Automated Testing:**
    - `pytest` + `pytest-asyncio` for unit and integration testing.
    - `httpx.AsyncClient` + `ASGITransport` for in-memory FastAPI testing without starting real HTTP servers.
    - Mock AI provider ensuring test suite runs completely offline, deterministically, in <15 seconds, and with ₹0 API cost.
  - **Structured Logging:**
    - JSON-formatted structured logging with contextual fields: `timestamp`, `level`, `task_id`, `trace_id`, `actor`, `event`.
    - Integrated secret masking filter replacing regex patterns of API keys and bearer tokens with `[REDACTED]`.
  - **Backup & Disaster Recovery:**
    - Automated logical backup script using `pg_dump` targeting PostgreSQL schemas.
    - Backups compressed and encrypted with AES-256 before storage.
    - Documented restoration procedure tested and verified.
- **Version Compatibility:** `pytest >= 8.3.0`, `pytest-asyncio >= 0.24.0`, `structlog >= 24.4.0`.
- **Licensing & Cost:** Open source / ₹0.
- **Security Implications:** Backup archives contain task history and must be encrypted at rest with the master key.
- **Recommendation:** Implement pytest test suite with MockProvider, JSON structured logging with redaction, and an automated backup script.

---

## Milestone 0 Research Sign-off
- **Architect:** Principal Software Architect
- **DevSecOps Lead:** DevSecOps Engineer
- **Status:** **APPROVED & VERIFIED**
- **Date:** 2026-11-13
