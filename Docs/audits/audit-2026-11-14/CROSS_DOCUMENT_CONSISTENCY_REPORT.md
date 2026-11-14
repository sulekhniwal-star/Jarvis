# Project Jarvis — Cross-Document Consistency Report

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Status:** Phase A Audit Deliverable

---

## 1. Overview of Cross-Document Consistency Evaluation

An authoritative documentation blueprint must be free of conflicting requirements, terminology divergences, and architectural contradictions. 

This audit evaluated all 27 documents in `docs/` against each other. The audit board uncovered **10 major cross-document conflicts and inconsistencies** that must be formally resolved before the documentation can serve as an authoritative baseline for a source-code audit.

---

## 2. Cross-Document Consistency Matrix

| # | Conflict Subject | Primary Document A | Conflicting Document B | Severity | Nature of Conflict | Recommended Resolution |
|:---|:---|:---|:---|:---|:---|:---|
| **C1** | **Implementation Completion Status** | `CHANGELOG.md` & `ROADMAP.md` (claims v1.0 MVP is complete, all 7 milestones done, 43 passing tests) | `MVP_ACCEPTANCE_CHECKLIST.md` (all 35 checkboxes empty) & `INDEX.md` ("proposed baseline documents") | **Critical** | Conflates forward-looking planning / unverified claims with audited reality. | Classify all implementation claims as `NOT VERIFIED — SOURCE-CODE AUDIT PENDING`. Retain checklist as the authoritative release gate. |
| **C2** | **Task State Machine Enum** | `SYSTEM_ARCHITECTURE.md` (§4 defines 11 states: `PENDING`, `PLANNING`, `AWAITING_APPROVAL`, `APPROVED`, `EXECUTING`, `TESTING`, `DIAGNOSING`, `PR_CREATED`, `COMPLETED`, `FAILED`, `CANCELLED`) | `API_SPECIFICATION.md` (§7 defines 10 states: `queued`, `planning`, `awaiting_approval`, `ready`, `running`, `paused`, `failed`, `cancelled`, `completed`, `interrupted`) | **Critical** | State names and transitions diverge between architecture specification and REST API contract. | Adopt the 11-state enum from `SYSTEM_ARCHITECTURE.md` as the canonical `TaskStatus` enum across all documents and APIs. |
| **C3** | **AI Provider Strategy** | `DECISION_LOG.md` (ADR-013 dated 2026-11-14 designates OpenRouter `openrouter/auto` as default) | `TECH_STACK.md`, `SYSTEM_ARCHITECTURE.md`, `ENVIRONMENT_VARIABLES.md` (mandate Gemini/OpenAI adapters only) | **Critical** | Major architecture decision (ADR-013) was approved but never propagated to system specs or environment definitions. | Update `SYSTEM_ARCHITECTURE.md`, `TECH_STACK.md`, and `ENVIRONMENT_VARIABLES.md` to formalize OpenRouter as default while retaining MockProvider. |
| **C4** | **Telegram Authorized User ID Variable** | `ENVIRONMENT_VARIABLES.md` (`TELEGRAM_OWNER_IDS`) | `TECH_STACK.md` / `DECISION_LOG.md` (`AUTHORIZED_TELEGRAM_USER_ID`) vs `RESEARCH_LOG.md` / `THREAT_MODEL.md` (`ALLOWED_TELEGRAM_USER_IDS`) | **High** | Three different variable names used for the exact same configuration setting across documents. | Standardize on `TELEGRAM_AUTHORIZED_USER_ID` across all documents and configuration templates. |
| **C5** | **Fernet Cryptographic Algorithm** | `TECH_STACK.md`, `SECURITY_POLICY.md`, `TASK_BOARD.md` ("Fernet AES-256-GCM" / "AES-256 Fernet") | Official Cryptography Specification (Fernet is AES-128-CBC + PKCS7 + HMAC-SHA256) | **High** | Factual technical inaccuracy in security and tech stack specifications. | Correct documentation to state: "Fernet (AES-128-CBC with HMAC-SHA256)" for symmetric encryption. |
| **C6** | **User Authentication & Password Storage** | `TECH_STACK.md` & `SECURITY_POLICY.md` (mandate Argon2id password hashing for dashboard auth) | `DATABASE_SCHEMA.md` (`users` table has `id`, `display_name`, `auth_subject`, `status` — no `password_hash`) | **High** | Database schema lacks the column required to store credentials specified in security policy. | Add `password_hash VARCHAR(255) NULL` to the `users` table schema in `DATABASE_SCHEMA.md`. |
| **C7** | **LangGraph Checkpoint Database Tables** | `SYSTEM_ARCHITECTURE.md` & `TECH_STACK.md` (mandate LangGraph `AsyncPostgresSaver` backed by DB) | `DATABASE_SCHEMA.md` (omits `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` tables) | **High** | Database schema omits tables required by core orchestration engine. | Add formal LangGraph checkpoint table definitions to `DATABASE_SCHEMA.md`. |
| **C8** | **Memory Management API Contract** | `MEMORY_DESIGN.md` & `DATABASE_SCHEMA.md` (specify scoped memories, categories, provenance, search) | `API_SPECIFICATION.md` (has zero `/api/v1/memories` endpoints) | **High** | Core memory capability has no corresponding REST API specification. | Add complete `/api/v1/memories` CRUD and search endpoint specifications to `API_SPECIFICATION.md`. |
| **C9** | **Disaster Recovery & Operational SLAs** | `BACKUP_AND_RECOVERY.md` & `OPERATIONS_RUNBOOK.md` (frequency, retention, provider, RPO, RTO, contacts are `[TBD]`) | `CHANGELOG.md` & `TASK_BOARD.md` (claim complete backup/restore system is built and verified) | **Medium** | Operations runbook and disaster recovery documents have placeholder `[TBD]` markers. | Replace `[TBD]` markers with concrete operational values and configuration contracts. |
| **C10**| **Task Board Internal Milestone Contradiction** | `TASK_BOARD.md` Line 4 ("Status: Milestone 4 Complete — Ready for Milestone 5") | `TASK_BOARD.md` Line 93 ("Final Project Status: v1.0 MVP FULLY IMPLEMENTED AND VERIFIED") | **Medium** | Direct internal contradiction within the same file. | Reconcile `TASK_BOARD.md` to accurately reflect verified status under the governance framework. |

---

## 3. Deep Dive into Major Conflicts

### 3.1 Conflict C1: The Status Paradox
A major source of confusion in the repository is the conflict between milestone completion claims:
- In `CHANGELOG.md` and `ROADMAP.md`, an engineer or AI agent reading the documentation is told that the entire v1.0 MVP is completed, with 43 passing automated tests across Milestones 1 through 7.
- However, `MVP_ACCEPTANCE_CHECKLIST.md` contains 35 empty checkboxes (`- [ ]`), including basic items like `Owner can authenticate`, `Worker runs in disposable isolation`, and `Backup restoration is demonstrated`.
- Furthermore, `INDEX.md` explicitly warns: *"These are proposed baseline documents. Complete Milestone 0 research and owner approvals before implementation or deployment."*
- **Audit Analysis:** This contradiction occurs when forward-looking release notes or synthetic test runs are recorded as completed production milestones before formal independent verification. Under governance rules, all completed code claims must be classified as `NOT VERIFIED — SOURCE-CODE AUDIT PENDING`.

### 3.2 Conflict C2: State Machine Nomenclature & Lifecycle
The state machine in `SYSTEM_ARCHITECTURE.md` was designed around an asynchronous autonomous coding pipeline:
```
PENDING -> PLANNING -> AWAITING_APPROVAL -> APPROVED -> EXECUTING -> TESTING -> DIAGNOSING -> PR_CREATED -> COMPLETED / FAILED / CANCELLED
```
In contrast, `API_SPECIFICATION.md` lists an arbitrary, generic job queue enum:
```
queued, planning, awaiting_approval, ready, running, paused, failed, cancelled, completed, interrupted
```
- The API spec introduces `ready`, `running`, and `interrupted`, which do not exist in the architecture state diagram.
- Crucially, the API spec omits `TESTING`, `DIAGNOSING`, `APPROVED`, and `PR_CREATED`. If the backend transitions to `TESTING`, an API client built to `API_SPECIFICATION.md` will reject the response as a schema validation error.
- **Resolution:** `API_SPECIFICATION.md` must be updated to match the 11 states defined in `SYSTEM_ARCHITECTURE.md`.

### 3.3 Conflict C3: The OpenRouter Provider Integration Gap
On 2026-11-14, **ADR-013** was accepted in `DECISION_LOG.md`:
> *"Establish OpenRouter as the primary default AI provider (`DEFAULT_AI_PROVIDER=openrouter`) with `openrouter/auto` as the default model string."*
Despite this acceptance:
1. `SYSTEM_ARCHITECTURE.md` (§1 diagram and §4 text) still only shows `MockProvider`, `GeminiAdapter`, and `OpenAIAdapter`.
2. `TECH_STACK.md` Decision 8 lists Gemini and OpenAI, completely omitting OpenRouter.
3. `ENVIRONMENT_VARIABLES.md` defines `GEMINI_API_KEY_REF` but contains no variable for `OPENROUTER_API_KEY`.
- **Resolution:** System architecture, tech stack, and environment documentation must be updated in unison to reflect ADR-013.

---

## 4. Conclusion and Remediation Strategy

The documentation cannot be considered internally consistent until these 10 conflicts are formally resolved via approved documentation change proposals. 

The audit board has translated each of these 10 conflicts into concrete, numbered proposals in `DOCUMENTATION_CHANGE_PROPOSALS.md` (`DOC-001` through `DOC-010`), ensuring that owner approval will automatically re-align the documentation suite into a unified, coherent baseline.
