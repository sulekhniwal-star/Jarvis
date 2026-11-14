# Project Jarvis — Technology and Market Research Report

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Research Date:** 2026-11-14  
**Operating Role:** Independent Technology Research & Architecture Board  
**Status:** Phase A Audit Deliverable

---

## 1. Research Scope and Methodology

This report documents primary technical research conducted on **2026-11-14** to evaluate the technology stack, competitive landscape, and architectural patterns of Project Jarvis. 

The evaluation benchmarks Jarvis against current industry developments in autonomous coding agents, official library specifications, and cloud platform terms to ensure the technical blueprint is grounded in viable, modern, and cost-effective technologies.

---

## 2. Core Technology Stack Verification (2026-11-14)

### 2.1 Backend Framework & Async Runtime
- **Technologies:** Python 3.12, FastAPI (v0.115+), Pydantic v2 (v2.9+), Uvicorn.
- **Verification Status:** **Validated & Highly Recommended.**
- **Technical Findings:**
  - Python 3.12 is the primary stable LTS-grade runtime for AI orchestration. It delivers ~10–15% faster interpreter performance and improved exception groups (`ExceptionGroup`), critical for managing concurrent async agent tasks.
  - FastAPI remains the premier asynchronous web framework for Python, featuring native Pydantic v2 core integration (written in Rust) that accelerates request validation by 5x–20x.
  - ASGI compatibility with Uvicorn allows seamless asynchronous streaming of agent thought processes and event streaming (SSE) to the frontend.
- **Limitations:** Single-threaded execution of CPU-bound tasks requires offloading heavy compilation or analysis to subprocesses or workers.
- **Cost:** 100% Free / Open Source (PSF / MIT).

### 2.2 Agent Orchestration: LangGraph & Checkpoint Postgres
- **Technologies:** LangGraph (`langgraph >= 0.2.35`), `langgraph-checkpoint-postgres >= 2.0.0`, `psycopg_pool >= 3.2.0`.
- **Verification Status:** **Validated with Critical Implementation Notes.**
- **Technical Findings:**
  - LangGraph's cyclic graph model (`StateGraph`) is the industry benchmark for stateful agents requiring structured branching, diagnostic loops, and human-in-the-loop interrupts (`interrupt_before`).
  - **Critical Setup Requirement:** Official documentation for `langgraph-checkpoint-postgres` specifies that initializing the checkpointer against PostgreSQL requires invoking `.setup()` on an engine/pool configured with `autocommit=True` and `row_factory=dict_row` (from `psycopg.rows`).
  - **Security Advisory:** Deserialization of state blobs must be hardened against arbitrary code execution by setting `LANGGRAPH_STRICT_MSGPACK=true` or passing a strict module allowlist.
- **Cost:** MIT License. 100% Free / ₹0.

### 2.3 Cloud Database: Supabase PostgreSQL 16
- **Technologies:** Supabase Free Tier (PostgreSQL 16), Supavisor Connection Pooler.
- **Verification Status:** **Validated with Operational Constraints.**
- **Technical Findings:**
  - Supabase Free Tier provides a 500 MB database, 5 GB egress, and 50,000 monthly active users at ₹0 cost.
  - **Inactivity Pause Rule:** Databases with 7 consecutive days of zero query activity are automatically paused. Paused databases retain data for up to 1 year and can be unpaused via API or dashboard. A lightweight scheduled weekly health ping (`SELECT 1;`) prevents pausing.
  - **Connection Pooling:** Direct connections to port 5432 are capped at 15–20 connections. The FastAPI backend must connect via port 6543 (Supavisor transaction pooler) to prevent connection starvation during async spikes.
- **Cost:** ₹0/month. 100% Free tier.

### 2.4 Disposable Cloud Execution: GitHub Actions Runners
- **Technologies:** GitHub Actions Linux Runners (Ubuntu 22.04/24.04 LTS), GitHub App API.
- **Verification Status:** **Validated as Superior Free Tier Architecture.**
- **Technical Findings:**
  - GitHub provides 2,000 free runner minutes per month for private repositories on standard 2-core VMs (7 GB RAM, 14 GB SSD).
  - Runners are completely ephemeral: a fresh VM is provisioned per job, destroyed upon completion, and has no residual filesystem state.
  - Completely decouples Jarvis from the owner's Windows 11 machine, enabling tasks to execute while the laptop is powered off.
- **Cost:** 2,000 free minutes/month (₹0).

### 2.5 Cryptographic Libraries & Precision
- **Technologies:** `cryptography` Python library (`cryptography.fernet`, `cryptography.hazmat.primitives.ciphers.aead.AESGCM`).
- **Verification Status:** **Correction Required.**
- **Technical Findings:**
  - The documentation repeatedly references `"Fernet (AES-256-GCM)"`.
  - **Cryptographic Fact:** Under RFC and official Python documentation, Fernet implements **AES-128-CBC with PKCS7 padding and HMAC-SHA256 authentication**.
  - For true AES-256-GCM authenticated encryption, the system must utilize `cryptography.hazmat.primitives.ciphers.aead.AESGCM` with a 256-bit key and 96-bit nonces.
  - *Recommendation:* Retain Fernet for secret/backup encryption (as AES-128-CBC + HMAC-SHA256 provides excellent security), but correct all documentation to remove the inaccurate "AES-256-GCM" claim.

---

## 3. Competitive Technical Analysis

The board conducted research into leading autonomous coding agents and developer platforms:

| System / Tool | Core Architectural Pattern | Sandboxing & Execution Model | Context & Codebase Management | Human Review / Governance | Key Insight for Jarvis |
|:---|:---|:---|:---|:---|:---|
| **Claude Code** (Anthropic) | CLI Agent with sub-process terminal execution | Runs locally inside user's shell; requires manual tool permission flags | Reads files on-demand; auto-compacts conversation context on overflow | Interactive terminal confirmations for bash commands | Auto-compacting context is essential to prevent token limit crashes. |
| **Devin** (Cognition) | Autonomous Cloud Engineer | Dedicated microVMs with sandboxed browser, editor, and terminal | Full repository indexing; hierarchical planning with scratchpads | Continuous chat interface, plan checkpoints, and PR reviews | Ephemeral microVMs match Jarvis's GitHub Actions runner strategy. |
| **GitHub Copilot Coding Agent** | Issue-to-PR Cloud Workflow | GitHub Actions / Codespaces ephemeral cloud execution | Ingests issue description, analyzes repo symbols, drafts multi-file plan | Generates draft PR with detailed summary and diff review | Validates the issue/task -> isolated worker -> test -> PR paradigm. |
| **Cursor Agents** | In-editor Composer & background agent | Local editor workspace with IDE tool bindings | Semantic codebase indexing (embeddings + tree-sitter AST symbols) | Inline diff reviews; user accepts or rejects file modifications | Demonstrates that AST-based symbol search outperforms naive regex search. |
| **OpenHands** (formerly OpenDevin) | Event-stream architecture with micro-agents | Docker container sandboxing with unprivileged user | Event history log; modular runtime plugins | Web dashboard with live terminal, browser view, and chat | Validates Docker sandbox security flags (`--cap-drop=ALL`, `--user 1000:1000`). |
| **SWE-agent** (Princeton) | Agent-Computer Interface (ACI) | Ephemeral Docker containers | Custom file navigation tools (view 50 lines, search symbol, replace) | Evaluated strictly against benchmark test suites (SWE-bench) | Demonstrates that bounded tool output (line chunks) prevents context explosion. |
| **Aider** | Git-centric pair programmer in terminal | Local subprocess execution | **Repository Tag Map:** Uses Tree-sitter to build a compressed symbol map (<4k tokens) | Commits every change atomically; interactive undo/redo | **Critical:** Tree-sitter repo map allows high-accuracy file selection at minimal token cost. |
| **Google Antigravity** | Advanced multi-agent developer assistant | Integrated developer environment with sandboxed tools & UI plugins | Deep workspace context, multi-agent swarms, persistent memory | Granular permission approval cards and human-in-the-loop gates | Multi-model routing and strict approval gating provide high developer trust. |

---

## 4. Market Trends and Product Architecture Implications

### 4.1 Developer Expectations for Autonomous Agents
1. **Verifiable Test Evidence Over Claims:** Developers reject agents that claim "tests passed" without showing exit codes and output logs. Jarvis's strict requirement for process exit code `0` and assertion output parsing is an industry differentiator.
2. **Atomic Pull Requests with Scope Containment:** Developers demand that agents produce minimal, clean diffs confined strictly to the requested feature, without touching unrelated files or modifying dependencies without consent.
3. **Zero Financial Surprise (Deterministic Cost Gates):** Unexpected billing spikes from autonomous agents create severe distrust. Jarvis's zero-spend guarantee and hard paid-call circuit breaker address a major market pain point.

### 4.2 Multi-Provider Model Strategy (ADR-013 Validation)
- Relying on a single proprietary model provider introduces vulnerability to model deprecations, price increases, and rate-limit outages.
- **OpenRouter Universal Auto-Routing (`openrouter/auto`):** Dynamically distributes requests across frontier models (Claude 3.5 Sonnet, Gemini 2.0 Flash, DeepSeek V3/R1) based on real-time latency, throughput, and pricing.
- Implementing OpenRouter as the primary AI engine fulfills Jarvis's core principle of **Provider Independence** (Vision Principle 7).

### 4.3 AST & Repository Symbol Mapping
- Naive file searching (e.g. running `grep` or dumping entire directories into the LLM context) quickly exhausts token budgets and leads to hallucinations.
- Modern agents generate an abstract syntax tree (AST) symbol index using **Tree-sitter**. The agent inspects function and class definitions across the codebase in a compact format before deciding which specific files to edit.
- *Recommendation:* Incorporate a Tree-sitter repository indexing step into Phase 4 of Jarvis's coding agent spec.

---

## 5. Formal Research Records & Standards Compliance

| Item | Source | Verification Date | Finding / Fact | Relevance to Jarvis | Affected Documents | Confidence |
|:---|:---|:---|:---|:---|:---|:---|
| **R-01** | Python Official Docs | 2026-11-14 | Python 3.12 is stable LTS-grade with optimized async execution. | Validates backend runtime choice. | `TECH_STACK.md` | High (1.0) |
| **R-02** | LangGraph Docs | 2026-11-14 | `AsyncPostgresSaver` requires `.setup()` with `autocommit=True` and `row_factory=dict_row`. | Critical for database migrations and connection pool setup. | `DATABASE_SCHEMA.md`, `DEPLOYMENT.md` | High (1.0) |
| **R-03** | Supabase Pricing Docs | 2026-11-14 | Free Tier pauses after 7 days inactivity; retains data for 1 year. | Mandates weekly keep-alive ping script. | `OPERATIONS_RUNBOOK.md`, `DECISION_LOG.md` | High (1.0) |
| **R-04** | Python Cryptography Docs | 2026-11-14 | Fernet uses AES-128-CBC + PKCS7 + HMAC-SHA256, NOT AES-256-GCM. | Corrects widespread documentation error across security specs. | `TECH_STACK.md`, `SECURITY_POLICY.md` | High (1.0) |
| **R-05** | OpenRouter Docs | 2026-11-14 | `openrouter/auto` meta-routes across frontier models with unified billing. | Integrates ADR-013 into core architecture and config. | `SYSTEM_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md` | High (1.0) |
| **R-06** | Aider / Tree-sitter Docs | 2026-11-14 | Repo Tag Maps compress repository symbols into <4k tokens. | Enhances autonomous coding agent repository understanding. | `CODING_AGENT_SPEC.md` | High (0.95) |
| **R-07** | OWASP Top 10 for LLMs | 2026-11-14 | Prompt injection (LLM01) and excessive agency (LLM06) require non-LLM policy gates. | Re-validates Jarvis's deterministic Python gating architecture. | `THREAT_MODEL.md`, `SECURITY_POLICY.md` | High (1.0) |
