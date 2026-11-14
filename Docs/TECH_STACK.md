# Project Jarvis — Technology Decision Register & Stack Specification

**Document Version:** 1.0  
**Verification Date:** 2026-11-13  
**Status:** Approved Architectural Baseline for Milestone 0  

---

## 1. Overview & Technology Decision Register

This register details each selected technology across the system layers, documenting the technical rationale, alternatives evaluated, budget/operational limitations, and security implications.

```
+----------------------------------------------------------------------------------------------------+
|                                      JARVIS LAYERED STACK                                          |
+----------------------------------------------------------------------------------------------------+
| Presentation:  Next.js 15 (React 19, TypeScript, Tailwind CSS, Lucide React) + Telegram Bot        |
| Control Plane: Python 3.12, FastAPI, Pydantic v2, Uvicorn, LangGraph (StateGraph)                  |
| Persistence:   PostgreSQL 16 (Supabase Free / Docker), SQLAlchemy 2.0 (Async), Alembic             |
| AI Gateway:    OpenRouter Universal Gateway (openrouter/auto), MockProvider [CI/Test], Pluggable Adapters |
| Security:      Argon2id, JWT (HttpOnly), Fernet (AES-128-CBC + HMAC-SHA256), Deterministic Tool Policy Engine |
| Execution:     GitHub Actions (Cloud Hosted Runners) & Disposable Local Docker Sandbox             |
| Telemetry:     Structlog (JSON format), Pytest Asyncio, Cryptographic Audit Ledger                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Comprehensive Technology Decisions

### Decision 1: Backend Framework & Language Runtime

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **Python 3.12 + FastAPI + Pydantic v2** |
| **Why Selected** | Python is the undisputed center of gravity for AI agent frameworks (LangGraph, OpenAI SDK, Google GenAI SDK). FastAPI provides native async/await performance, automatic OpenAPI documentation, and robust dependency injection. Pydantic v2 brings high-speed Rust-based data validation and strict type safety. |
| **Alternatives Considered** | - **Node.js / NestJS:** Excellent for general web APIs, but fragmented AI agent ecosystem with fewer stateful graph orchestration primitives.<br>- **Go (Golang):** High performance and concurrency, but lacks mature LLM agent frameworks and rapid prototyping agility for autonomous coding workflows. |
| **Costs & Limitations** | 100% Free / Open Source (PSF & MIT licenses). Python GIL is not a bottleneck due to async I/O model for API and model calling. Single-core performance optimized in 3.12. |
| **Security Implications** | Strict Pydantic models enforce input sanitization. Automated swagger endpoints (`/docs`, `/redoc`) are disabled in production to avoid endpoint reconnaissance. |

---

### Decision 2: Agent Orchestration Engine

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **LangGraph (`langgraph` & `langgraph-checkpoint-postgres`)** |
| **Why Selected** | LangGraph models workflows as stateful cyclic graphs with fine-grained control over node transitions, conditional edges, error retries, and persistence. Checkpointing to PostgreSQL allows multi-step tasks to pause for human approval, recover from system restarts, and resume without losing task memory. |
| **Alternatives Considered** | - **CrewAI:** Opinionated role-playing abstractions unsuitable for rigid deterministic software engineering workflows with hard security checkpoints.<br>- **AutoGen:** Multi-agent conversational paradigm with high token overhead and weak durable persistence primitives.<br>- **Custom Hand-Rolled State Machine:** Viable, but reinvents checkpointing, graph traversal, cycle detection, and serialization already thoroughly tested in LangGraph. |
| **Costs & Limitations** | Free & Open Source (MIT). Requires PostgreSQL table migration for checkpointers (`checkpoints`, `checkpoint_writes`). Strict msgpack mode must be enabled (`LANGGRAPH_STRICT_MSGPACK=true`). |
| **Security Implications** | Prevents arbitrary code execution during state hydration by enforcing strict serialization types. Agent state cannot bypass graph-defined permission checkpoints. |

---

### Decision 3: Frontend Dashboard & Mobile Interface

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **Next.js 15 (App Router) + TypeScript + Tailwind CSS** |
| **Why Selected** | Next.js provides hybrid server-rendering and client-side interactivity, fast routing, and clean mobile responsiveness using Tailwind utility classes. TypeScript guarantees end-to-end type safety matching backend API contracts. |
| **Alternatives Considered** | - **Vite + React SPA:** Simpler build setup, but lacks built-in server routing, API proxies, and optimized static asset delivery.<br>- **Streamlit / Gradio:** Fast for data demos, but unacceptable for a polished, responsive mobile-friendly dashboard with granular approval modals and custom control panels. |
| **Costs & Limitations** | Free / Open Source (MIT). Deployable on Vercel Free Tier or via self-hosted Docker container with zero cost. |
| **Security Implications** | Authenticated via secure HttpOnly, SameSite=Strict cookies. No tokens stored in `localStorage` or `sessionStorage` (preventing XSS exfiltration). Client mutations protected by CSRF tokens. |

---

### Decision 4: Database & State Storage

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **PostgreSQL 16 (via Supabase Free Tier or Local Docker)** |
| **Why Selected** | PostgreSQL provides ACID compliance, strong relational integrity, JSONB support for flexible metadata, and native full-text search. Supabase provides a managed, cloud-hosted PostgreSQL instance with 500 MB storage at ₹0 cost, eliminating server maintenance on the owner's PC. |
| **Alternatives Considered** | - **SQLite:** Zero configuration and lightweight, but lacks concurrent write locking across async workers and cannot be accessed cloud-natively without complex replication (e.g., Litestream).<br>- **MongoDB / NoSQL:** Poor fit for relational audit logs, foreign-key relationships (tasks -> steps -> executions -> approvals), and ACID compliance. |
| **Costs & Limitations** | Supabase Free Tier: ₹0/month. Limit: 500 MB database, 2 active projects. Pauses after 7 days of inactivity (mitigated by automated weekly keep-alive ping or one-click manual resume). Easily swapped to self-hosted PostgreSQL without code changes. |
| **Security Implications** | Database connections require TLS (`sslmode=require`). Supabase connection string and service role keys are stored exclusively in the control plane and never shared with workers. |

---

### Decision 5: Execution Plane & Sandbox Isolation

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **GitHub Actions Runners (Cloud) & Hardened Ephemeral Docker (Local)** |
| **Why Selected** | GitHub Actions provides isolated, fresh, disposable virtual machines (2 cores, 7 GB RAM, 14 GB SSD) with 2,000 free minutes/month for private repositories. No workload touches the owner's Windows 11 host. For local execution, hardened Docker containers with unprivileged user `1000:1000`, dropped capabilities (`--cap-drop=ALL`), and read-only root filesystems provide defense-in-depth. |
| **Alternatives Considered** | - **Running code directly on Host OS (Windows 11):** High risk of host compromise, accidental file deletion, registry damage, or credential theft.<br>- **Paid Cloud Sandboxes (E2B, Modal, Fly Machines):** Excellent isolation, but incurs recurring subscription costs that violate the ₹0 initial operating budget rule. |
| **Costs & Limitations** | GitHub Actions: 2,000 free minutes/month (₹0). Local Docker: ₹0. Execution time limits (max 10 minutes per task) prevent runaway build processes. |
| **Security Implications** | Execution plane has zero access to control plane secrets. Outbound network can be restricted or disabled (`--network=none` for pure test execution). |

---

### Decision 6: Source Control & GitHub Integration

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **GitHub App (Asymmetric RS256 JWT Authentication)** |
| **Why Selected** | GitHub Apps enforce least privilege. They operate as an independent bot identity, are installed only on designated private repositories, and generate short-lived (1-hour) installation tokens (`ghs_...`). This eliminates the security risk of long-lived Personal Access Tokens (PATs) with broad user-level permissions. |
| **Alternatives Considered** | - **Personal Access Token (Classic / Fine-Grained):** Long-lived, tied directly to the owner's personal account, and presents high blast radius if leaked.<br>- **Deploy Keys:** Read/write to only a single repository, but cannot open Pull Requests or trigger multi-repo workflows natively. |
| **Costs & Limitations** | Free / ₹0. Rate limit: 5,000 requests/hour per installation. |
| **Security Implications** | Private key (`.pem`) is encrypted at rest using AES-256-GCM. Webhook payloads are verified against HMAC-SHA256 signatures. App permissions restricted to `Contents: Read/Write` and `Pull Requests: Read/Write`. |

---

### Decision 7: Messaging & Notifications

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **Telegram Bot API (Long Polling & Webhook Modes)** |
| **Why Selected** | Telegram is the owner's preferred mobile interface. It supports rich text, markdown, inline keyboard buttons (for quick navigation to approval screens), and real-time alerts. Long Polling operates outbound over HTTPS with zero open inbound ports on the development computer. |
| **Alternatives Considered** | - **Discord Bot:** Complex permission model, heavier client, and less suited for private single-user mobile alerting.<br>- **Slack App:** Free tier has 90-day message retention limits and requires public webhooks.<br>- **WhatsApp Cloud API:** Complex Meta Business verification and per-conversation fees. |
| **Costs & Limitations** | 100% Free / ₹0 from Telegram. Bot API payload limit: 4096 characters per message (long logs are truncated or linked to dashboard). |
| **Security Implications** | Static allowlist: only messages from `TELEGRAM_AUTHORIZED_USER_ID` are processed. All other messages are dropped and logged. |

---

### Decision 8: AI Model Gateway & Routing

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **OpenRouter Universal Gateway (`openrouter/auto`) with `MockProvider` for CI (ADR-013)** |
| **Why Selected** | Establishes OpenRouter as the primary production gateway (`DEFAULT_AI_PROVIDER=openrouter`) with dynamic meta-routing (`openrouter/auto`) balancing cost, throughput, and availability across frontier models (Claude 3.5 Sonnet, Gemini 2.0 Flash, DeepSeek V3/R1). Retains a deterministic offline `MockProvider` for unit, integration, and CI tests (0 network calls, ₹0 cost), while maintaining pluggable vendor adapters (`GeminiAdapter`, `OpenAIAdapter`) for direct execution fallback. |
| **Alternatives Considered** | - **Direct Single-Vendor SDK Coupling (e.g. only `google-genai`):** High risk of vendor lock-in, single-provider outages, and price volatility.<br>- **Commercial AI Gateways (Portkey, LiteLLM Hosted):** Extra hosted dependency and cost; OpenRouter provides OpenAI-compatible endpoint compatibility with native auto-routing. |
| **Costs & Limitations** | Mock Provider: ₹0. OpenRouter models billed pay-as-you-go or free tier routes. Paid calls hard-blocked by default unless explicitly approved. |
| **Security Implications** | Prompts are scanned to redact environment variables, JWTs, and API keys. System instructions warn that external repo contents are untrusted data. |

---

### Decision 9: Data Protection & Secrets Management

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **Argon2id + Fernet (AES-128-CBC with HMAC-SHA256) + Environment Variable Injection** |
| **Why Selected** | Argon2id is the NIST/OWASP gold standard for password hashing, resistant to GPU/ASIC cracking. Fernet authenticated encryption (AES-128-CBC with PKCS7 padding and HMAC-SHA256) guarantees that stored third-party credentials (GitHub private key, Telegram token, AI keys) cannot be decrypted or tampered with if the raw database is compromised. |
| **Alternatives Considered** | - **HashiCorp Vault / AWS Secrets Manager:** Extreme overkill and high operational complexity/cost for a personal single-tenant system.<br>- **Plaintext `.env` / database storage:** Unacceptable security risk. |
| **Costs & Limitations** | Free / Open Source (cryptography library). Master encryption key must be safely backed up by the owner. |
| **Security Implications** | All secrets are scrubbed from logs via regex-based log masking filters. |

---

### Decision 10: Testing, Quality Assurance & Telemetry

| Field | Detail |
| :--- | :--- |
| **Selected Technology** | **Pytest + Pytest-Asyncio + Structlog (JSON Logging)** |
| **Why Selected** | Pytest is the industry standard for Python testing, with deep fixture support and async compatibility. Structlog produces structured, machine-parseable JSON logs with consistent context (`trace_id`, `task_id`), essential for debugging autonomous agent behavior. |
| **Alternatives Considered** | - **Standard `logging` module:** Lacks native structured key-value bindings and context propagation across async tasks.<br>- **Unittest:** Verbose, lacks modern async fixture fixtures. |
| **Costs & Limitations** | Free / Open Source. Fast test execution (<15 seconds for unit suite). |
| **Security Implications** | Custom Structlog processor intercepts and redacts sensitive data (API keys, authorization headers) before emission. |

---

## 3. Technology Version Matrix

| Dependency | Minimum Version | Target Version | License |
| :--- | :--- | :--- | :--- |
| Python | 3.11.0 | 3.12.7 | PSF |
| FastAPI | 0.115.0 | 0.115.4 | MIT |
| Pydantic | 2.9.0 | 2.9.2 | MIT |
| LangGraph | 0.2.35 | 0.2.45 | MIT |
| LangGraph Checkpoint Postgres | 2.0.0 | 2.0.2 | MIT |
| SQLAlchemy | 2.0.35 | 2.0.36 | MIT |
| Alembic | 1.13.0 | 1.13.3 | MIT |
| Psycopg 3 | 3.2.0 | 3.2.3 | LGPL/BSD |
| Next.js | 15.0.0 | 15.0.3 | MIT |
| TypeScript | 5.6.0 | 5.6.3 | Apache 2.0 |
| Tailwind CSS | 3.4.0 | 3.4.14 | MIT |
| Cryptography | 43.0.0 | 43.0.3 | Apache 2.0 / BSD |
| Pytest | 8.3.0 | 8.3.3 | MIT |
| Pytest-Asyncio | 0.24.0 | 0.24.0 | Apache 2.0 |
| Structlog | 24.4.0 | 24.4.0 | Apache 2.0 / MIT |

---

## 4. Verification & Approval
- **Author:** Principal Software Architect
- **Reviewer:** DevSecOps Lead & Technical Project Manager
- **Status:** Approved for Implementation
- **Date:** 2026-11-13
