# Project Jarvis — Documentation Gap Analysis

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Status:** Phase A Audit Deliverable

---

## 1. Executive Overview

This gap analysis systematically identifies all omissions, ambiguities, incomplete specifications, and unaligned technical requirements across the Project Jarvis documentation suite. 

The audit board evaluated the existing documentation against three primary standards:
1. **Implementability:** Can an independent senior software engineer or autonomous coding agent implement the system without inventing critical contracts?
2. **Security Rigor:** Does the documentation specify complete controls, cryptographic algorithms, and boundary conditions aligned with OWASP Agentic AI guidelines?
3. **Internal Alignment:** Are product requirements in `PRD.md` fully reflected in subsystem specifications, schemas, API contracts, and operational runbooks?

---

## 2. Master Requirements & Documentation Gap Matrix

| Capability / Requirement | Existing Documentation | Missing Technical Specification | Research Finding (2026-11-14) | Recommendation | Priority |
|:---|:---|:---|:---|:---|:---|
| **User Authentication & Session Management** | `PRD.md` (FR-01), `TECH_STACK.md` (Argon2id, JWT HttpOnly) | `API_SPECIFICATION.md` completely omits `/auth/login`, `/auth/logout`, `/auth/session`, and rate limiting contracts. `DATABASE_SCHEMA.md` omits `password_hash` in `users`. | NIST SP 800-63B requires explicit session invalidation, credential hashing parameters, and constant-time password verification. | Add complete `/api/v1/auth` endpoint contracts, request/response models, and `password_hash` column to `users`. | **P1 (Critical)** |
| **LangGraph Durable Persistence** | `SYSTEM_ARCHITECTURE.md`, `TECH_STACK.md` (ADR-008: `AsyncPostgresSaver`) | `DATABASE_SCHEMA.md` omits `checkpoints`, `checkpoint_blobs`, and `checkpoint_writes` tables required by `langgraph-checkpoint-postgres`. | `langgraph-checkpoint-postgres` v2.0+ requires `.setup()` with `autocommit=True`, `row_factory=dict_row`, and strict msgpack deserialization. | Specify checkpointing table schemas, migration strategy, and connection pooling parameters in database docs. | **P1 (Critical)** |
| **State Machine Harmonization** | `SYSTEM_ARCHITECTURE.md` (§4 defines 11 states) | `API_SPECIFICATION.md` (§7 defines 10 different states: `queued`, `ready`, `running`, `interrupted` vs `PENDING`, `EXECUTING`, `TESTING`, etc.). | State mismatch breaks client-server synchronization, UI polling, and LangGraph transition gating. | Unify on a single canonical `TaskStatus` enum across architecture, API contracts, database, and UI. | **P1 (Critical)** |
| **AI Provider Alignment (OpenRouter)** | `DECISION_LOG.md` (ADR-013: OpenRouter default) | `TECH_STACK.md`, `SYSTEM_ARCHITECTURE.md`, and `ENVIRONMENT_VARIABLES.md` still mandate Gemini/OpenAI adapters and lack OpenRouter configurations. | OpenRouter unified API provides zero-lock-in auto-routing (`openrouter/auto`) across frontier models with unified billing. | Update architecture diagrams, tech stack register, and environment variables to formalize OpenRouter as default. | **P1 (Critical)** |
| **Disaster Recovery & Backup SLA** | `BACKUP_AND_RECOVERY.md`, `OPERATIONS_RUNBOOK.md` | Backup frequency, retention period, backup storage provider, RPO, and RTO are all literally marked `[TBD]`. | Supabase automated backups occur daily on Pro; Free Tier requires logical `pg_dump` automation with client-side encryption. | Define concrete SLAs: RPO = 24 hours, RTO = 2 hours, automated daily encrypted `pg_dump` to GitHub Artifacts / S3. | **P1 (Critical)** |
| **Cryptographic Precision (Fernet)** | `TECH_STACK.md`, `SECURITY_POLICY.md`, `TASK_BOARD.md` | Documents claim "Fernet (AES-256-GCM)". | Fernet specification officially implements AES-128-CBC with PKCS7 padding and HMAC-SHA256 authentication. AES-256-GCM is `AESGCM`. | Correct documentation to accurately reflect Fernet's AES-128-CBC + HMAC-SHA256 primitives, or specify `AESGCM` for 256-bit encryption. | **P2 (High)** |
| **Memory Management API** | `MEMORY_DESIGN.md`, `DATABASE_SCHEMA.md` (`memories`) | `API_SPECIFICATION.md` omits all memory inspection, search, correction, and deletion endpoints. | OWASP LLM08 requires user auditability and manual correction of agent long-term memory to prevent poisoning. | Specify `/api/v1/memories` endpoints (list, get, patch, delete, search) in API specification. | **P2 (High)** |
| **Repository AST & Context Mapping** | `CODING_AGENT_SPEC.md` (§3 Workflow) | Lacks specification for repository code indexing, symbol extraction, or context budget management. | State-of-the-art coding agents (Aider, Claude Code) use tree-sitter tag maps to compress repo structure into <4k tokens. | Add Tree-sitter / ctags repository mapping specification to `CODING_AGENT_SPEC.md` to prevent context window explosion. | **P2 (High)** |
| **Worker Network Egress Proxy** | `SECURITY_POLICY.md` (§3), `SYSTEM_ARCHITECTURE.md` | Documents specify `--network=none` for test execution, but fail to specify how dependencies (`pip install`, `npm install`) are acquired. | Running tests often requires pre-installed dependencies. Completely disabling network blocks package managers without an egress proxy. | Specify two-stage execution: Stage 1 (dependency hydration via vetted cache or restricted egress); Stage 2 (isolated test execution with `--network=none`). | **P2 (High)** |
| **Operational Contacts & Escalation** | `OPERATIONS_RUNBOOK.md` (§6 Contact & Escalation) | Owner contact, hosting support links, incident log destinations, and recovery environments are marked `[TBD]`. | Real operational incidents require deterministic runbooks without placeholder ambiguities. | Populate concrete configuration templates and operational role responsibilities. | **P2 (High)** |
| **Environment Variable Canonicalization** | `ENVIRONMENT_VARIABLES.md` | 3 conflicting names for Telegram owner ID (`TELEGRAM_OWNER_IDS`, `AUTHORIZED_TELEGRAM_USER_ID`, `ALLOWED_TELEGRAM_USER_IDS`). | Configuration mismatches cause fatal startup crashes in containerized environments. | Establish single canonical naming convention: `TELEGRAM_AUTHORIZED_USER_ID`. | **P3 (Medium)** |
| **Telegram Polling vs Webhook Migration** | `RESEARCH_LOG.md` (Topic 7), `SYSTEM_ARCHITECTURE.md` | Architecture allows both, but fails to document exact transition triggers, security token headers, or certificate setups. | Telegram webhooks require public HTTPS with valid CA certificates and `X-Telegram-Bot-Api-Secret-Token` validation. | Document exact operational criteria and configuration for promoting from Long Polling (local) to Webhook (cloud). | **P3 (Medium)** |
| **Load Testing & Performance Targets** | `PRD.md` (§6 NFRs: "define measurable targets after baseline load testing") | No documents specify actual throughput, concurrent task limits, or response time thresholds. | Control plane on Supabase free-tier connection pool (Supavisor) has hard concurrent connection limits. | Specify initial MVP capacity limits: 1 active worker, max 5 concurrent web dashboard sessions, <500ms API latency. | **P3 (Medium)** |
| **Audit Ledger Verification & Tamper Evidence** | `SYSTEM_ARCHITECTURE.md`, `DATABASE_SCHEMA.md` (`audit_events`) | Describes `audit_events` as "append-only", but specifies no cryptographic chaining (hash-chaining / Merkle tree) to detect DB tampering. | High-security agent governance requires cryptographically verifiable audit trails. | Specify sequential SHA-256 hash chaining (`prev_event_hash`) for audit log rows in `audit_events`. | **P3 (Medium)** |

---

## 3. Deep Analysis of Critical Gaps

### Gap 1: The Authentication & Credential Storage Void
While `PRD.md` (FR-01), `SECURITY_POLICY.md` (§1), and `TECH_STACK.md` (Decision 9) place immense emphasis on single-owner Argon2id authentication and secure HttpOnly cookie sessions, the actual downstream engineering documents completely dropped the implementation contract:
- `API_SPECIFICATION.md` has no authentication endpoints. There is no route defined for `/api/v1/auth/login`, `/api/v1/auth/logout`, or `/api/v1/auth/session`.
- `DATABASE_SCHEMA.md` lists `users` with columns: `id`, `display_name`, `auth_subject`, `status`, `created_at`, `updated_at`. **There is no `password_hash` column.**
- **Impact:** An engineer implementing the backend from `DATABASE_SCHEMA.md` and `API_SPECIFICATION.md` would either produce a system with no native password authentication or be forced to invent undocumented columns and endpoints.

### Gap 2: The LangGraph Checkpoint Schema Omission
`SYSTEM_ARCHITECTURE.md` and `TECH_STACK.md` designate LangGraph's `AsyncPostgresSaver` as the backbone of the system's fault-tolerant, resumable execution. However:
- `DATABASE_SCHEMA.md` completely omits the LangGraph checkpointing tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`).
- `DEPLOYMENT.md` does not explain how these tables are created or whether they belong in the default `public` schema or a dedicated `langgraph` PostgreSQL schema.
- **Impact:** Alembic migrations generated from `DATABASE_SCHEMA.md` will fail to provision the tables LangGraph requires, causing runtime crashes on the first state transition.

### Gap 3: State Enum Disconnect Between Architecture and API Contract
In distributed workflow systems, client-server state synchronization requires identical enum semantics. Jarvis has two conflicting definitions:
- **`SYSTEM_ARCHITECTURE.md` (11 states):** `PENDING` -> `PLANNING` -> `AWAITING_APPROVAL` -> `APPROVED` -> `EXECUTING` -> `TESTING` -> `DIAGNOSING` -> `PR_CREATED` -> `COMPLETED` / `FAILED` / `CANCELLED`.
- **`API_SPECIFICATION.md` (10 states):** `queued`, `planning`, `awaiting_approval`, `ready`, `running`, `paused`, `failed`, `cancelled`, `completed`, `interrupted`.
- **Impact:** The Next.js web dashboard cannot cleanly render task status when the backend transitions to `TESTING` or `DIAGNOSING`, as the API specification claims the states are `running` or `ready`.

---

## 4. Prioritized Gap Remediation Backlog

1. **Immediate Mandatory Governance Changes (P1):**
   - Resolve `API_SPECIFICATION.md` and `DATABASE_SCHEMA.md` authentication and password gaps.
   - Synchronize the Task State enum across all architectural documents.
   - Formalize ADR-013 OpenRouter integration across tech stack and environment definitions.
   - Populate concrete disaster recovery SLAs in `BACKUP_AND_RECOVERY.md`.
2. **Technical Clarifications & Hardening (P2):**
   - Correct Fernet cryptographic algorithm description across all security documents.
   - Specify memory management API endpoints in `API_SPECIFICATION.md`.
   - Incorporate repository symbol mapping (Tree-sitter) into `CODING_AGENT_SPEC.md`.
   - Clarify worker network isolation and package caching strategy.
3. **Operational Completeness (P3):**
   - Canonicalize environment variable naming.
   - Replace all `[TBD]` placeholders in operational runbooks with concrete configurations.
   - Add cryptographic hash-chaining to audit event records.
