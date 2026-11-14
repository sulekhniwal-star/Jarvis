# Project Jarvis — Documentation Change Proposals

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Governance Requirement:** No original documentation has been modified. Every proposal below requires explicit owner authorization prior to implementation.

---

## 1. Proposal Classification Taxonomy

Each proposal is strictly classified into one of six governance categories:
- **Category A — Editorial Correction:** Spelling, formatting, broken links, document indexing.
- **Category B — Technical Clarification:** Clarifying existing approved technical requirements without changing meaning.
- **Category C — Technical Correction:** Correcting demonstrably inaccurate statements according to verified technical evidence.
- **Category D — Missing Specification:** Adding requirements, schemas, or contracts necessary to make an approved design implementable.
- **Category E — Architectural Change Proposal:** Recommending a different technology, architectural pattern, or system boundary.
- **Category F — Product Decision Proposal:** Recommending changes to product scope, user workflows, or strategic direction.

---

## 2. Master Proposal Register

| Proposal ID | Target Document | Doc Category | Change Category | Title | Priority | Decision Required? |
|:---|:---|:---|:---|:---|:---|:---|
| **DOC-001** | `docs/API_SPECIFICATION.md` | Architecture & Engineering | **Category C / D** | Harmonize Task State Enum to Canonical 11 Architecture States | P1 (Critical) | Architecture Decision |
| **DOC-002** | `docs/DATABASE_SCHEMA.md` | Architecture & Engineering | **Category D** | Add LangGraph Checkpointing Table Schemas and Pool Parameters | P1 (Critical) | Technical Decision |
| **DOC-003** | `docs/TECH_STACK.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/ENVIRONMENT_VARIABLES.md` | Architecture & Engineering | **Category D / E** | Formalize ADR-013 OpenRouter Auto-Routing in System Specs | P1 (Critical) | Architecture Approved (ADR-013) |
| **DOC-004** | `docs/API_SPECIFICATION.md`, `docs/DATABASE_SCHEMA.md` | Architecture & Engineering | **Category D** | Add Authentication API Endpoints and User `password_hash` Column | P1 (Critical) | Technical Decision |
| **DOC-005** | `docs/TECH_STACK.md`, `docs/SECURITY_POLICY.md`, `docs/TASK_BOARD.md` | Security & Architecture | **Category C** | Correct Fernet Cryptographic Algorithm Definition | P2 (High) | Technical Clarification |
| **DOC-006** | `docs/ENVIRONMENT_VARIABLES.md`, `docs/TECH_STACK.md`, `docs/THREAT_MODEL.md` | Development & Security | **Category B** | Standardize Telegram Authorized User ID Variable Name | P2 (High) | None (Standardization) |
| **DOC-007** | `docs/API_SPECIFICATION.md` | Architecture & Engineering | **Category D** | Add Scoped Memory Management API Contracts | P2 (High) | Technical Decision |
| **DOC-008** | `docs/CODING_AGENT_SPEC.md` | Architecture & Engineering | **Category D / E** | Incorporate Tree-sitter AST Repository Symbol Mapping | P2 (High) | Architecture Decision |
| **DOC-009** | `docs/BACKUP_AND_RECOVERY.md` | Security & Operations | **Category D** | Define Concrete Disaster Recovery SLAs, RPO, and RTO | P1 (Critical) | Product / Ops Decision |
| **DOC-010** | `docs/OPERATIONS_RUNBOOK.md` | Security & Operations | **Category D** | Replace Operational Escalation `[TBD]` Markers with Concrete Specs | P2 (High) | Operational Decision |
| **DOC-011** | `docs/CHANGELOG.md`, `docs/TASK_BOARD.md`, `docs/ROADMAP.md` | Historical & Planning | **Category C** | Classify Implementation Claims as Source-Code Audit Pending | P1 (Critical) | Governance Baseline |
| **DOC-012** | `docs/INDEX.md` | Development & Quality | **Category A** | Correct Documentation Index and Reconcile Master File Register | P3 (Medium) | None (Editorial) |
| **DOC-013** | `docs/SECURITY_POLICY.md`, `docs/DEPLOYMENT.md` | Security & Operations | **Category B / D** | Specify Two-Phase Worker Execution for Network Egress Isolation | P2 (High) | Technical Decision |
| **DOC-014** | `docs/DATABASE_SCHEMA.md` | Architecture & Engineering | **Category D / E** | Add Sequential Cryptographic Hash-Chaining to `audit_events` | P3 (Medium) | Security Decision |
| **DOC-015** | `docs/AGENT_DESIGN.md` | Architecture & Engineering | **Category D** | Specify Context Window Budgeting and Checkpoint State Pruning | P2 (High) | Technical Decision |
| **DOC-016** | `docs/TEST_STRATEGY.md` | Development & Quality | **Category D** | Formalize Synthetic Demo Repository Specification for E2E CI | P2 (High) | QA Decision |
| **DOC-017** | `docs/SYSTEM_ARCHITECTURE.md` | Architecture & Engineering | **Category D** | Add Sub-Agent Graph Topology (Researcher & Reviewer Nodes) | P3 (Medium) | Architecture Decision |
| **DOC-018** | `docs/DEPLOYMENT.md` | Security & Operations | **Category D** | Document Automated Keep-Alive Ping for Supabase Free Tier | P3 (Medium) | Operational Decision |
| **DOC-019** | `docs/TASK_BOARD.md` | Historical & Planning | **Category A / B** | Reconcile Internal Status Conflict (Milestone 4 vs Milestone 7) | P2 (High) | None (Editorial) |
| **DOC-020** | `docs/CODING_AGENT_SPEC.md` | Architecture & Security | **Category D** | Mandate Pre-Commit Gitleaks Secret Scanning in Worker Loop | P2 (High) | Security Decision |

---

## 3. Detailed Documentation Change Proposals

---

### Proposal DOC-001: Harmonize Task State Enum to Canonical 11 Architecture States
- **Target Document:** `docs/API_SPECIFICATION.md` (§7 Task state enum)
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category C / D (Technical Correction & Missing Specification)**
- **Current State:**  
  `queued`, `planning`, `awaiting_approval`, `ready`, `running`, `paused`, `failed`, `cancelled`, `completed`, `interrupted`
- **Specific Problem:** Diverges from the 11-state state machine defined in `SYSTEM_ARCHITECTURE.md` (§4). It omits critical operational states (`TESTING`, `DIAGNOSING`, `APPROVED`, `PR_CREATED`) and invents uncoordinated states (`ready`, `running`, `interrupted`).
- **Evidence:** `SYSTEM_ARCHITECTURE.md` lines 129–189 vs `API_SPECIFICATION.md` lines 65–66.
- **Proposed Improvement:** Replace §7 of `docs/API_SPECIFICATION.md` with:
  ```markdown
  ## Task state enum

  The API strictly enforces the canonical 11-state machine defined in `SYSTEM_ARCHITECTURE.md`:
  `PENDING`, `PLANNING`, `AWAITING_APPROVAL`, `APPROVED`, `EXECUTING`, `TESTING`, `DIAGNOSING`, `PR_CREATED`, `COMPLETED`, `FAILED`, `CANCELLED`.

  Transitions are validated server-side by the LangGraph state machine; client mutations cannot bypass state transition rules.
  ```
- **Impacts:** Aligns REST API schema, Pydantic models, and Next.js frontend state displays.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** `pydantic` enum validation passes for all 11 architecture states in API integration tests.

---

### Proposal DOC-002: Add LangGraph Checkpointing Table Schemas
- **Target Document:** `docs/DATABASE_SCHEMA.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Omits all tables required by `langgraph-checkpoint-postgres` (`AsyncPostgresSaver`).
- **Specific Problem:** Alembic migrations generated from `DATABASE_SCHEMA.md` fail to provision LangGraph persistence tables, causing runtime crashes on coordinator startup.
- **Evidence:** `TECH_STACK.md` Decision 2, `SYSTEM_ARCHITECTURE.md` §1, official `langgraph-checkpoint-postgres` docs.
- **Proposed Improvement:** Append the following table specifications to `docs/DATABASE_SCHEMA.md`:
  ```markdown
  ### checkpoints (LangGraph State Saver)

  Managed via `langgraph-checkpoint-postgres`:
  - thread_id (TEXT, PK)
  - checkpoint_ns (TEXT, PK, default empty)
  - checkpoint_id (TEXT, PK)
  - parent_checkpoint_id (TEXT, nullable)
  - type (TEXT)
  - checkpoint (BYTEA / JSONB)
  - metadata (JSONB)

  ### checkpoint_blobs (LangGraph Large Object Storage)
  - thread_id (TEXT, PK)
  - checkpoint_ns (TEXT, PK)
  - channel (TEXT, PK)
  - version (TEXT, PK)
  - type (TEXT)
  - blob (BYTEA)

  ### checkpoint_writes (LangGraph Pending Node Writes)
  - thread_id (TEXT, PK)
  - checkpoint_ns (TEXT, PK)
  - checkpoint_id (TEXT, PK)
  - task_id (TEXT, PK)
  - idx (INTEGER, PK)
  - channel (TEXT)
  - type (TEXT)
  - blob (BYTEA)
  ```
- **Impacts:** Ensures complete Alembic migrations and database provisioning.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** Database provisioning script creates all checkpoint tables with `autocommit=True`.

---

### Proposal DOC-003: Formalize ADR-013 OpenRouter Auto-Routing in System Specs
- **Target Documents:** `docs/TECH_STACK.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/ENVIRONMENT_VARIABLES.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D / E (Missing Specification & Architectural Alignment)**
- **Current State:** Architecture and Tech Stack prescribe `MockProvider`, `GeminiAdapter`, and `OpenAIAdapter`. Environment variables list `GEMINI_API_KEY_REF` with no reference to OpenRouter.
- **Specific Problem:** Accepted ADR-013 established OpenRouter (`openrouter/auto`) as primary default provider on 2026-11-14, but specifications were never updated.
- **Evidence:** `DECISION_LOG.md` ADR-013 vs `TECH_STACK.md` lines 115–126 and `SYSTEM_ARCHITECTURE.md` lines 39–45.
- **Proposed Improvement:**
  1. Update `SYSTEM_ARCHITECTURE.md` Zone 1 AI Provider Gateway box to include `OpenRouterAdapter (openrouter/auto)`.
  2. Update `TECH_STACK.md` Decision 8 to state:
     `Selected Technology: OpenRouter Universal Gateway (openrouter/auto) with MockProvider for CI`.
  3. Add to `ENVIRONMENT_VARIABLES.md`:
     `OPENROUTER_API_KEY (Secret: Yes, Purpose: OpenRouter model routing API key)`.
     `DEFAULT_AI_PROVIDER (Secret: No, Value: openrouter)`.
     `DEFAULT_MODEL_NAME (Secret: No, Value: openrouter/auto)`.
- **Impacts:** Harmonizes provider abstraction with accepted architectural decisions.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** AI Gateway tests instantiate `OpenRouterAdapter` when `DEFAULT_AI_PROVIDER=openrouter`.

---

### Proposal DOC-004: Add Authentication API Endpoints and User `password_hash` Column
- **Target Documents:** `docs/API_SPECIFICATION.md`, `docs/DATABASE_SCHEMA.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** `API_SPECIFICATION.md` has no authentication endpoints. `DATABASE_SCHEMA.md` `users` table omits password storage.
- **Specific Problem:** System requires Argon2id password authentication for dashboard login, but neither the API contract nor database schema defines the contract.
- **Evidence:** `TECH_STACK.md` Decision 9, `SECURITY_POLICY.md` §2, `DATABASE_SCHEMA.md` lines 8–18.
- **Proposed Improvement:**
  1. In `DATABASE_SCHEMA.md` `users` table, add:
     `- password_hash (VARCHAR(255), nullable for external auth, hashed with Argon2id)`.
  2. In `API_SPECIFICATION.md`, add section:
     ```markdown
     ## Authentication & Session Management

     - `POST /auth/login` --- Body: `{ username, password }`. Returns HTTP 200 with HttpOnly session cookie. Rate limit: 5 requests / 15 minutes.
     - `POST /auth/logout` --- Invalidates session and clears cookie.
     - `GET /auth/me` --- Returns current authenticated user metadata.
     ```
- **Impacts:** Makes authentication contract fully implementable and testable.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** OpenAPI documentation generated from FastAPI matches `/api/v1/auth` endpoints.

---

### Proposal DOC-005: Correct Fernet Cryptographic Algorithm Definition
- **Target Documents:** `docs/TECH_STACK.md`, `docs/SECURITY_POLICY.md`, `docs/TASK_BOARD.md`
- **Document Category:** Security and Operations
- **Change Category:** **Category C (Technical Correction)**
- **Current State:** References "Fernet (AES-256-GCM)" or "AES-256 Fernet encryption".
- **Specific Problem:** Factual inaccuracy. Under the cryptography specification, Fernet implements **AES-128-CBC with PKCS7 padding and HMAC-SHA256 authentication**.
- **Evidence:** Python `cryptography.fernet` official specification; RFC 9053.
- **Proposed Improvement:** Replace all occurrences of `"Fernet (AES-256-GCM)"` with `"Fernet (AES-128-CBC with HMAC-SHA256 authenticated encryption)"`.
- **Impacts:** Corrects technical error and establishes cryptographic accuracy.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Documentation accurately matches Python `cryptography` standard implementation.

---

### Proposal DOC-006: Standardize Telegram Authorized User ID Variable Name
- **Target Documents:** `docs/ENVIRONMENT_VARIABLES.md`, `docs/TECH_STACK.md`, `docs/THREAT_MODEL.md`
- **Document Category:** Development and Quality
- **Change Category:** **Category B (Technical Clarification / Standardization)**
- **Current State:** Three conflicting names: `TELEGRAM_OWNER_IDS`, `AUTHORIZED_TELEGRAM_USER_ID`, `ALLOWED_TELEGRAM_USER_IDS`.
- **Specific Problem:** Conflicting environment variable names cause fatal configuration failures.
- **Proposed Improvement:** Standardize exclusively on:
  `TELEGRAM_AUTHORIZED_USER_ID` (Numeric Telegram user ID permitted to issue bot commands).
- **Impacts:** Eliminates configuration ambiguity.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** All documentation and configuration templates reference `TELEGRAM_AUTHORIZED_USER_ID`.

---

### Proposal DOC-007: Add Scoped Memory Management API Contracts
- **Target Document:** `docs/API_SPECIFICATION.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** `API_SPECIFICATION.md` has no endpoints for memory management, despite `MEMORY_DESIGN.md` requiring dashboard inspection and deletion.
- **Proposed Improvement:** Add the following section to `docs/API_SPECIFICATION.md`:
  ```markdown
  ## Memories

  - `GET /memories` --- Query memories by scope (`shared` vs `project`), category, or status.
  - `GET /memories/{memory_id}` --- Get detailed memory record with provenance and confidence.
  - `POST /memories` --- Create memory record (manual entry).
  - `PATCH /memories/{memory_id}` --- Update memory content or supersede status.
  - `DELETE /memories/{memory_id}` --- Archive or soft-delete memory record.
  ```
- **Impacts:** Provides complete REST interface for long-term memory inspection and correction.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Memory CRUD endpoints specified in OpenAPI schema.

---

### Proposal DOC-008: Incorporate Tree-sitter AST Repository Symbol Mapping
- **Target Document:** `docs/CODING_AGENT_SPEC.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D / E (Missing Specification & Architectural Enhancement)**
- **Current State:** Workflow relies on generic file inspection and directory listings.
- **Specific Problem:** On large codebases, naive file reading exhausts LLM context windows and causes hallucinations. Modern agents (Aider, Claude Code) build a compressed AST tag map.
- **Proposed Improvement:** In `docs/CODING_AGENT_SPEC.md` §3 (Required workflow), insert step:
  `2a. Generate Tree-sitter AST symbol map (<4k tokens) indexing function, class, and method definitions across the repository.`
- **Impacts:** Greatly improves file targeting accuracy and token efficiency.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Coding worker generates structured symbol map prior to file editing.

---

### Proposal DOC-009: Define Concrete Disaster Recovery SLAs, RPO, and RTO
- **Target Document:** `docs/BACKUP_AND_RECOVERY.md`
- **Document Category:** Security and Operations
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Backup frequency, retention, storage provider, RPO, and RTO are literally marked `[TBD]`.
- **Proposed Improvement:** Replace `[TBD]` section in `docs/BACKUP_AND_RECOVERY.md` with:
  ```markdown
  ## Backup Policy & Service Level Agreements

  - **Backup Frequency:** Automated daily logical backup (`pg_dump`) executed at 02:00 UTC.
  - **Retention Period:** 30 daily snapshots; 12 monthly archives.
  - **Storage Provider:** Client-side encrypted snapshots stored in GitHub Actions encrypted artifacts / private cloud bucket.
  - **Encryption Standard:** Symmetric encryption via Fernet key before export.
  - **Recovery Point Objective (RPO):** Maximum 24 hours of task metadata.
  - **Recovery Time Objective (RTO):** Maximum 2 hours to provision clean database and restore schema/data.
  ```
- **Impacts:** Converts conceptual placeholders into auditable operational commitments.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** Restore script verified to recover snapshot within 2 hours.

---

### Proposal DOC-010: Replace Operational Escalation `[TBD]` Placeholders
- **Target Document:** `docs/OPERATIONS_RUNBOOK.md` (§6 Contact and escalation)
- **Document Category:** Security and Operations
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Line 64: `Owner: [TBD] Hosting provider support: [TBD] Incident log location: [TBD] Recovery environment: [TBD]`.
- **Proposed Improvement:** Replace with structured operational escalation paths:
  ```markdown
  ## Contact and Escalation Register

  - **System Owner:** Configured via `TELEGRAM_AUTHORIZED_USER_ID` (High-priority Telegram alerts).
  - **Cloud Database Support:** Supabase Support Portal / Community Discord.
  - **Source Control Support:** GitHub Status (`www.githubstatus.com`).
  - **Incident Log Location:** Control-plane JSON logs (`/var/log/jarvis/control_plane.jsonl`) and `audit_events` table.
  - **Staging / Recovery Environment:** Local Docker Compose replica running PostgreSQL 16 on port 5433.
  ```
- **Impacts:** Removes all ambiguity during production incident response.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** All placeholder brackets removed from operations runbook.

---

### Proposal DOC-011: Classify Implementation Claims as Source-Code Audit Pending
- **Target Documents:** `docs/CHANGELOG.md`, `docs/TASK_BOARD.md`, `docs/ROADMAP.md`
- **Document Category:** Historical and Planning
- **Change Category:** **Category C (Technical Correction / Governance Alignment)**
- **Current State:** Claims v1.0 MVP is fully completed and verified with 43 automated passing tests, contradicting `MVP_ACCEPTANCE_CHECKLIST.md` and `INDEX.md`.
- **Proposed Improvement:** Prepend a formal governance notice to `CHANGELOG.md`, `TASK_BOARD.md`, and `ROADMAP.md`:
  ```markdown
  > [!IMPORTANT]
  > **Governance Notice (Audit Baseline 2026-11-14):**
  > All implementation descriptions, milestone completion claims, and references to passing automated tests represent target specifications and synthetic test claims. Their implementation status is formally classified as:
  > `NOT VERIFIED — SOURCE-CODE AUDIT PENDING`
  > Verification of code artifacts will occur in Phase B against this finalized documentation baseline.
  ```
- **Impacts:** Re-establishes governance integrity and eliminates contradictions with acceptance checklists.
- **Priority:** **P1 (Critical)**.
- **Verification Criteria:** Notice visible at the top of all historical and tracking documents.

---

### Proposal DOC-012: Correct Documentation Index and Reconcile Master File Register
- **Target Document:** `docs/INDEX.md`
- **Document Category:** Development and Quality
- **Change Category:** **Category A (Editorial Correction)**
- **Current State:** References `README.md` which does not exist in `docs/`; omits `ROADMAP.md`.
- **Proposed Improvement:** Remove `[README.md](README.md)` row and add `[ROADMAP.md](ROADMAP.md) - Project Roadmap and Milestone Schedule` to the table in `docs/INDEX.md`.
- **Impacts:** Restores 100% link accuracy to the documentation index.
- **Priority:** **P3 (Medium)**.
- **Verification Criteria:** All 27 files in `docs/` match the index table exactly.

---

### Proposal DOC-013: Specify Two-Phase Worker Execution for Network Egress Isolation
- **Target Documents:** `docs/SECURITY_POLICY.md`, `docs/DEPLOYMENT.md`
- **Document Category:** Security and Operations
- **Change Category:** **Category B / D (Technical Clarification & Missing Specification)**
- **Current State:** Mandates `--network=none` for test execution without explaining how language package managers install dependencies.
- **Proposed Improvement:** Document the two-phase worker lifecycle:
  1. **Phase 1: Environment Hydration:** Outbound egress permitted strictly to vetted package registries (`pypi.org`, `registry.npmjs.org`) via local caching proxy or pre-warmed runner image.
  2. **Phase 2: Code Execution & Testing:** Outbound network completely disabled (`--network=none`).
- **Impacts:** Makes sandbox network isolation technically feasible without breaking builds.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Dependency installation passes in Phase 1; external calls fail in Phase 2.

---

### Proposal DOC-014: Add Sequential Cryptographic Hash-Chaining to `audit_events`
- **Target Document:** `docs/DATABASE_SCHEMA.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D / E (Missing Specification & Security Enhancement)**
- **Current State:** `audit_events` is described as "append-only" without cryptographic verification.
- **Proposed Improvement:** Add `prev_event_hash VARCHAR(64)` and `event_hash VARCHAR(64)` columns to `audit_events` schema, where `event_hash = SHA256(prev_event_hash + canonical_event_json)`.
- **Impacts:** Provides mathematical proof against database log tampering.
- **Priority:** **P3 (Medium)**.
- **Verification Criteria:** Verifier script validates sequential hash chain across audit table rows.

---

### Proposal DOC-015: Specify Context Window Budgeting and Checkpoint State Pruning
- **Target Document:** `docs/AGENT_DESIGN.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Mentions summarization conceptually, but defines no concrete token budgets or pruning thresholds.
- **Proposed Improvement:** Add section specifying:
  - Max per-step prompt budget: 32,000 tokens.
  - Test output truncation: capture first 100 lines and last 100 lines of failure output; archive full logs to `artifacts`.
  - Checkpoint state pruning: sliding-window retention of last 2 node states in active prompt memory.
- **Impacts:** Prevents LLM context overflow during multi-iteration diagnostic loops.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Node state inputs stay strictly under 32k tokens during simulated 3-retry loop.

---

### Proposal DOC-016: Formalize Synthetic Demo Repository Specification for E2E CI
- **Target Document:** `docs/TEST_STRATEGY.md`
- **Document Category:** Development and Quality
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Mandates E2E test against "designated demo repository" without defining repository properties.
- **Proposed Improvement:** Specify standard test fixture repository `jarvis-demo-target`:
  - Python 3.12 package with `pytest`.
  - Intentionally failing unit test (`test_sample.py`) with unambiguous assertion error.
  - Acceptance criterion: Agent diagnoses failure, edits implementation file, achieves exit code `0`, and opens PR.
- **Impacts:** Provides standard, reproducible test harness for Phase B code audit.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** CI runner clones `jarvis-demo-target` and verifies end-to-end PR creation.

---

### Proposal DOC-017: Add Sub-Agent Graph Topology (Researcher & Reviewer Nodes)
- **Target Document:** `docs/SYSTEM_ARCHITECTURE.md`
- **Document Category:** Architecture and Engineering
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Architecture diagram only shows Planner, Coder, and PR Generator nodes; omits Researcher and Reviewer defined in `AGENT_DESIGN.md`.
- **Proposed Improvement:** Update LangGraph architecture description in `SYSTEM_ARCHITECTURE.md` to define formal nodes and conditional edges for `researcher_node` (conditional on ambiguity score > 0.4) and `reviewer_node` (prior to PR creation).
- **Impacts:** Harmonizes multi-agent roles with actual state graph topology.
- **Priority:** **P3 (Medium)**.
- **Verification Criteria:** LangGraph graph compilation includes `researcher` and `reviewer` nodes.

---

### Proposal DOC-018: Document Automated Keep-Alive Ping for Supabase Free Tier
- **Target Document:** `docs/DEPLOYMENT.md`
- **Document Category:** Security and Operations
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Mentions keep-alive ping conceptually, but specifies no mechanism.
- **Proposed Improvement:** Document automated keep-alive implementation:
  - Weekly GitHub Actions cron workflow (`.github/workflows/db-keepalive.yml`) executing on Sundays at 00:00 UTC.
  - Runs `SELECT 1;` via Supabase REST API or direct SQL client to prevent the 7-day inactivity pause.
- **Impacts:** Prevents surprise database hibernation on the free tier.
- **Priority:** **P3 (Medium)**.
- **Verification Criteria:** GitHub Actions workflow successfully triggers keep-alive query.

---

### Proposal DOC-019: Reconcile Internal Status Conflict in `TASK_BOARD.md`
- **Target Document:** `docs/TASK_BOARD.md`
- **Document Category:** Historical and Planning
- **Change Category:** **Category A / B (Editorial Correction & Clarification)**
- **Current State:** Line 4 says `Status: Milestone 4 Complete — Ready for Milestone 5`, while line 93 says `v1.0 MVP FULLY IMPLEMENTED AND VERIFIED`.
- **Proposed Improvement:** Update line 4 to state:
  `Status: Milestones 0–7 Target Specifications Drafted — Formal Code Audit Pending`.
- **Impacts:** Eliminates internal contradiction within `TASK_BOARD.md`.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Header status matches document contents.

---

### Proposal DOC-020: Mandate Pre-Commit Gitleaks Secret Scanning in Worker Loop
- **Target Document:** `docs/CODING_AGENT_SPEC.md`
- **Document Category:** Architecture and Security
- **Change Category:** **Category D (Missing Specification)**
- **Current State:** Mentions inspecting diff for secrets, but specifies no automated tooling.
- **Proposed Improvement:** In `docs/CODING_AGENT_SPEC.md` §3 (Workflow step 10), specify automated execution of `gitleaks protect --staged` or regex scanning before committing or pushing git branches.
- **Impacts:** Eliminates risk of agent accidentally committing sensitive keys discovered during task execution.
- **Priority:** **P2 (High)**.
- **Verification Criteria:** Committing a mock API key in sandbox triggers pre-commit block.
