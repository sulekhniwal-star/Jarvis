# Project Jarvis — Final Authoritative Documentation Baseline

**Baseline Identifier:** `BASELINE-2026-11-14-FINAL`  
**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Baseline Date:** 2026-11-14  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Status:** **AUTHORITATIVE BASELINE FROZEN FOR FUTURE SOURCE-CODE AUDIT**  
**Governance Authority:** Approved by Project Owner via Command `APPROVED — UPDATE DOCUMENTATION: DOC-001 through DOC-020`

---

## 1. Executive Baseline Declaration

This document constitutes the final, authoritative technical blueprint for **Project Jarvis**. All approved documentation changes (`DOC-001` through `DOC-020`) have been applied to the primary documents under `docs/`. 

This baseline establishes the sole source of truth against which the **Phase B Source-Code Audit** will evaluate the repository codebase (`backend/`, `frontend/`, `workers/`, `scripts/`, `.github/`).

In accordance with strict governance principles:
$$\mathbf{Implementation\ Classification:\ ALL\ CODE\ IMPLEMENTATION\ CLAIMS\ REMAIN\ NOT\ VERIFIED\ —\ SOURCE\text{-}CODE\ AUDIT\ PENDING}$$

---

## 2. Authoritative Source-of-Truth Document Register

The table below defines the authoritative documentation hierarchy. Any statement or design not documented within these files cannot be treated as an approved system requirement:

| Tier | Category | File Path | Primary Function & Baseline Scope |
|:---|:---|:---|:---|
| **Tier 1** | Requirements & Intent | [`docs/VISION.md`](file:///f:/Javis/docs/VISION.md) | Defines product vision, core principles, user outcomes, and non-goals. |
| **Tier 1** | Requirements & Scope | [`docs/PRD.md`](file:///f:/Javis/docs/PRD.md) | Authoritative functional (FR-01 to FR-18) and non-functional requirements. |
| **Tier 1** | Verification & Gating | [`docs/MVP_ACCEPTANCE_CHECKLIST.md`](file:///f:/Javis/docs/MVP_ACCEPTANCE_CHECKLIST.md) | Authoritative 35-item release acceptance criteria. |
| **Tier 2** | System Architecture | [`docs/SYSTEM_ARCHITECTURE.md`](file:///f:/Javis/docs/SYSTEM_ARCHITECTURE.md) | Bifurcated Enclave model, trust zones, canonical 11-state machine, and sub-agents. |
| **Tier 2** | Technology Stack | [`docs/TECH_STACK.md`](file:///f:/Javis/docs/TECH_STACK.md) | Approved frameworks, libraries, versions, and architectural decision rationale. |
| **Tier 2** | Security Architecture | [`docs/SECURITY_POLICY.md`](file:///f:/Javis/docs/SECURITY_POLICY.md) | Mandatory security mandates, secret storage, and worker sandbox controls. |
| **Tier 2** | Threat Model | [`docs/THREAT_MODEL.md`](file:///f:/Javis/docs/THREAT_MODEL.md) | STRIDE threat matrix, OWASP LLM evaluation, and security test cases. |
| **Tier 2** | Access Control | [`docs/PERMISSIONS.md`](file:///f:/Javis/docs/PERMISSIONS.md) | Role-based capability matrix and least-privilege boundaries. |
| **Tier 2** | Governance & Approvals | [`docs/APPROVAL_WORKFLOW.md`](file:///f:/Javis/docs/APPROVAL_WORKFLOW.md) | Human-in-the-loop authorization and canonical JSON SHA-256 payload hashing. |
| **Tier 2** | Financial Controls | [`docs/COST_CONTROL.md`](file:///f:/Javis/docs/COST_CONTROL.md) | Free-first operating policy, zero-spend guarantees, and paid-call circuit breaker. |
| **Tier 3** | Data Layer | [`docs/DATABASE_SCHEMA.md`](file:///f:/Javis/docs/DATABASE_SCHEMA.md) | Logical relational data model, user password storage, and LangGraph checkpoint tables. |
| **Tier 3** | Interface Contracts | [`docs/API_SPECIFICATION.md`](file:///f:/Javis/docs/API_SPECIFICATION.md) | REST API endpoints, auth routes, memory routes, and canonical 11-state enum. |
| **Tier 3** | Agent Orchestration | [`docs/AGENT_DESIGN.md`](file:///f:/Javis/docs/AGENT_DESIGN.md) | Sub-agent roles, token budgets, and checkpoint state pruning. |
| **Tier 3** | Coding Worker Spec | [`docs/CODING_AGENT_SPEC.md`](file:///f:/Javis/docs/CODING_AGENT_SPEC.md) | 13-step coding lifecycle, Tree-sitter AST mapping, and pre-commit secret scanning. |
| **Tier 3** | Memory System | [`docs/MEMORY_DESIGN.md`](file:///f:/Javis/docs/MEMORY_DESIGN.md) | Scoped memory architecture (shared vs project), extraction, and conflict rules. |
| **Tier 3** | Self-Enhancement | [`docs/SELF_IMPROVEMENT.md`](file:///f:/Javis/docs/SELF_IMPROVEMENT.md) | Protected core component boundary and human-reviewed pull request rules. |
| **Tier 4** | Infrastructure & DevOps | [`docs/DEPLOYMENT.md`](file:///f:/Javis/docs/DEPLOYMENT.md) | Two-phase worker network isolation and automated database keep-alive pings. |
| **Tier 4** | Disaster Recovery | [`docs/BACKUP_AND_RECOVERY.md`](file:///f:/Javis/docs/BACKUP_AND_RECOVERY.md) | Concrete DR policies, RPO (24h), RTO (2h), daily backups, and Fernet encryption. |
| **Tier 4** | Operations & Runbooks | [`docs/OPERATIONS_RUNBOOK.md`](file:///f:/Javis/docs/OPERATIONS_RUNBOOK.md) | Incident response protocols and operational escalation contact registers. |
| **Tier 4** | Configuration | [`docs/ENVIRONMENT_VARIABLES.md`](file:///f:/Javis/docs/ENVIRONMENT_VARIABLES.md) | Canonical environment variable register (including `TELEGRAM_AUTHORIZED_USER_ID`). |
| **Tier 4** | QA & Verification | [`docs/TEST_STRATEGY.md`](file:///f:/Javis/docs/TEST_STRATEGY.md) | 6-layer testing pyramid, CI gates, and synthetic demo repository fixture. |
| **Tier 5** | Architectural Records | [`docs/DECISION_LOG.md`](file:///f:/Javis/docs/DECISION_LOG.md) | ADR-001 through ADR-013. |
| **Tier 5** | Project Planning | [`docs/ROADMAP.md`](file:///f:/Javis/docs/ROADMAP.md) | Phased roadmap (Phases 0–7) with formal governance audit notices. |
| **Tier 5** | Task Tracking | [`docs/TASK_BOARD.md`](file:///f:/Javis/docs/TASK_BOARD.md) | Reconciled milestone task tracking board. |
| **Tier 5** | Change History | [`docs/CHANGELOG.md`](file:///f:/Javis/docs/CHANGELOG.md) | Historical changelog with formal governance audit notices. |
| **Tier 5** | Documentation Index | [`docs/INDEX.md`](file:///f:/Javis/docs/INDEX.md) | Master file table reconciled with exact repository contents. |

---

## 3. Approved Architectural and Engineering Specifications

### 3.1 System Architecture: Bifurcated Enclave Model
- **Zone 0 (Public Ingress):** Next.js 15 Web Dashboard (TLS 1.3, HttpOnly session cookies) and Telegram Bot Gateway (HTTPS Long Polling / Webhook).
- **Zone 1 (Trusted Control Plane):** FastAPI application gateway, LangGraph stateful orchestration engine, Argon2id authentication, deterministic policy and approval engine, PostgreSQL 16 state storage, and Fernet encrypted secret broker.
- **Zone 2 (Untrusted Execution Plane):** 
  - *Primary:* GitHub Actions Linux runners (ephemeral Ubuntu VM, 2 vCPU, 7 GB RAM, 60-min scoped GitHub App installation token).
  - *Secondary:* Local hardened Docker container (`USER 1000:1000`, `--cap-drop=ALL`, `--read-only` rootfs, `--security-opt=no-new-privileges:true`, `--tmpfs` workspace).

### 3.2 Canonical Task State Machine
All backend engines, API contracts, databases, and UI interfaces strictly enforce the following **11 states**:
$$\mathbf{PENDING \longrightarrow PLANNING \longrightarrow AWAITING\_APPROVAL \longrightarrow APPROVED \longrightarrow EXECUTING \longrightarrow TESTING \longrightarrow DIAGNOSING \longrightarrow PR\_CREATED \longrightarrow COMPLETED}$$
*Terminal Exception States:* $\mathbf{FAILED}$, $\mathbf{CANCELLED}$.

### 3.3 AI Model Provider Strategy
- **Default Production Gateway:** OpenRouter (`DEFAULT_AI_PROVIDER=openrouter`) with dynamic meta-routing (`DEFAULT_MODEL_NAME=openrouter/auto`) to balance cost, throughput, and availability across frontier models (Claude 3.5 Sonnet, Gemini 2.0 Flash, DeepSeek V3/R1).
- **Default CI & Test Gateway:** `MockProvider` returning deterministic synthetic plans, diffs, and test outputs with 0 network calls and ₹0 cost.
- **Direct Fallback Adapters:** Pluggable `GeminiAdapter` and `OpenAIAdapter`.
- **Paid-Call Circuit Breaker:** Hard-blocks paid API calls unless an explicit, time-bounded approval grant exists for the task.

### 3.4 Security & Cryptographic Model
- **Password Hashing:** Argon2id via `argon2-cffi`.
- **Session Authentication:** Cryptographically signed HMAC-SHA256 JWTs stored in secure `HttpOnly`, `SameSite=Strict` cookies.
- **Database & Backup Encryption:** Fernet authenticated encryption implementing **AES-128 in CBC mode with PKCS7 padding and HMAC-SHA256 authentication** via `cryptography.fernet`.
- **Audit Ledger Integrity:** Append-only `audit_events` table with sequential SHA-256 hash-chaining (`prev_event_hash` and `event_hash`).
- **Two-Phase Worker Network Isolation:**
  - *Phase 1 (Hydration):* Network egress restricted strictly to vetted package registries (`pypi.org`, `registry.npmjs.org`) for dependency installation.
  - *Phase 2 (Code Execution & Testing):* Network egress completely disabled (`--network=none`).
- **Pre-Commit Secret Scanning:** Worker loop executes Gitleaks / regex scanning on staged diffs before committing git branches.

### 3.5 Data Layer Specifications
- **Relational Tables:** `users` (including `password_hash`), `projects`, `tasks`, `task_steps`, `executions`, `artifacts`, `approvals`, `audit_events`, `memories`, `decisions`, `provider_usage`, `integration_credentials`.
- **LangGraph Checkpoint Persistence:** `checkpoints`, `checkpoint_blobs`, and `checkpoint_writes` provisioned via `langgraph-checkpoint-postgres` with `autocommit=True` and `row_factory=dict_row`.

### 3.6 Disaster Recovery and Operational SLAs
- **Backup Frequency:** Automated daily logical backup (`pg_dump`) executed at 02:00 UTC.
- **Retention:** 30 daily snapshots; 12 monthly archives.
- **SLA Commitments:** Recovery Point Objective (RPO) = 24 hours; Recovery Time Objective (RTO) = 2 hours.
- **Supabase Keep-Alive:** Automated weekly GitHub Actions cron workflow (`.github/workflows/db-keepalive.yml`) running `SELECT 1;` on Sundays at 00:00 UTC.

---

## 4. Deferred Decisions and Open Questions

The following topics are formally deferred to post-MVP milestones:
1. **Multi-Tenant Authorization:** Jarvis is strictly single-tenant (one owner). Multi-tenant RBAC and organization hierarchies are deferred to Version 2/3.
2. **Autonomous Production Merging / Deployment:** Autonomous merges into protected production branches and automated deployments are strictly prohibited in the MVP.
3. **Voice Interface and Personal Life Workflows:** Personal assistant workflows (calendar, email drafting, voice transcription) are deferred to Version 2/3.
4. **Local Hardware Model Execution (Ollama / Llama.cpp):** Local model inference on the owner's 16 GB Windows 11 machine is deferred due to RAM/CPU constraints.

---

## 5. Superseded Decisions

| Superseded Decision | Original Stance | Current Authoritative Stance | Supersession Authority |
|:---|:---|:---|:---|
| **AI Model Provider** | Google Gemini (via Google AI Studio) as sole cloud model. | OpenRouter (`openrouter/auto`) as primary universal gateway. | ADR-013 & `DOC-003` |
| **API State Machine** | 10-state job queue (`queued`, `ready`, `running`, `interrupted`). | Canonical 11-state machine (`PENDING` -> `COMPLETED`). | `DOC-001` |
| **Fernet Cryptography** | Characterized as "AES-256-GCM". | Characterized as AES-128-CBC with HMAC-SHA256. | `DOC-005` |
| **Worker Network Isolation** | Static `--network=none` for all worker commands. | Two-Phase execution (Hydration with proxy -> `--network=none`). | `DOC-013` |
| **Telegram ID Config** | Variously cited as `TELEGRAM_OWNER_IDS` and `ALLOWED_TELEGRAM_USER_IDS`. | Standardized as `TELEGRAM_AUTHORIZED_USER_ID`. | `DOC-006` |

---

## 6. Handover to Phase B: Source-Code Audit

With the completion and freezing of this documentation baseline, **Phase A (Documentation Audit) is formally concluded**. 

The upcoming **Phase B (Source-Code Audit)** must execute strictly under the protocols set forth in [`docs/audits/audit-2026-11-14/FUTURE_CODE_AUDIT_BLUEPRINT.md`](file:///f:/Javis/docs/audits/audit-2026-11-14/FUTURE_CODE_AUDIT_BLUEPRINT.md).
