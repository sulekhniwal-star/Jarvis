# Project Jarvis — Technical Decision Review

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Target Document:** `DECISION_LOG.md` (ADR-001 through ADR-013)

---

## 1. Overview and Assessment Methodology

This review rigorously audits all 13 Architectural Decision Records (ADRs) recorded in `DECISION_LOG.md`. 

Each decision is evaluated against 12 architectural criteria:
1. Problem Solved
2. Selection Rationale
3. Alternatives Evaluated
4. Technical Suitability
5. Security Implications
6. Scalability
7. Reliability
8. Operating Complexity
9. Cost Impact (Free-First Compliance)
10. Compatibility
11. Vendor Lock-in
12. Migration Difficulty

---

## 2. Technical Decision Evaluation Register

| ADR ID | Decision Title | Status | Audit Classification | Cost Impact | Security Impact | Alignment with Mission |
|:---|:---|:---|:---|:---|:---|:---|
| **ADR-001** | Coding-First Autonomous Product Scope | Accepted | **Sound and adequately documented** | ₹0 | Low attack surface | Focuses MVP exclusively on software development |
| **ADR-002** | Strict Separation of Control Plane & Execution Plane | Accepted | **Sound and adequately documented** | ₹0 | Critical isolation | Eliminates host compromise and credential theft |
| **ADR-003** | Deterministic Capability Gating & Human Approval | Accepted | **Sound and adequately documented** | ₹0 | Zero unauthorized actions | Treats AI models as untrusted proposal engines |
| **ADR-004** | Provider-Independent AI Gateway with Mock Provider | Accepted | **Sound but partially superseded** | ₹0 in CI | Provider portability | Partially superseded by ADR-013 regarding default provider |
| **ADR-005** | Free-First Infrastructure & Hard Paid-Call Blocking | Accepted | **Sound and adequately documented** | ₹0 initial | Zero bill shock | Guarantees compliance with owner's ₹0 initial budget |
| **ADR-006** | GitHub App Authentication with Scoped Tokens | Accepted | **Sound and adequately documented** | ₹0 | High least privilege | Eliminates account-level Personal Access Tokens |
| **ADR-007** | Ephemeral Cloud Execution via GitHub Actions | Accepted | **Sound and adequately documented** | ₹0 (2,000 mins/mo) | Complete VM isolation | Offloads CPU/RAM from owner's Windows 11 machine |
| **ADR-008** | LangGraph with PostgreSQL Checkpointing | Accepted | **Sound but needs clarification** | ₹0 | Safe deserialization | High fault-tolerance; needs setup & schema details |
| **ADR-009** | Telegram Bot with Long Polling & User Allowlist | Accepted | **Sound and adequately documented** | ₹0 | Ingress protection | Zero inbound firewall openings required on Windows 11 |
| **ADR-010** | Mobile-First Responsive Web Dashboard via Next.js 15 | Accepted | **Sound and adequately documented** | ₹0 | HttpOnly cookie auth | Rich interactive UI for git diffs and approvals |
| **ADR-011** | Managed Supabase Free Tier with Keep-Alive Ping | Accepted | **Sound and adequately documented** | ₹0 (500 MB DB) | TLS encrypted | Managed 24/7 cloud DB with self-host portability |
| **ADR-012** | Controlled Supervised Self-Improvement | Accepted | **Sound and adequately documented** | ₹0 | Protected core guard | Protects core security and auth code from agent edits |
| **ADR-013** | Primary AI Engine via OpenRouter (`openrouter/auto`) | Accepted | **Sound but unintegrated in specs** | Dynamic (Pay/Free) | Egress through gateway | Unifies model routing; requires spec harmonization |

---

## 3. Deep Dive into High-Impact Decisions

### 3.1 ADR-002 & ADR-007: The Enclave and Cloud Execution Strategy
- **Analysis:** By coupling the Bifurcated Enclave Architecture (ADR-002) with GitHub Actions hosted runners (ADR-007), Jarvis solves the core hardware limitation of the owner's environment (Windows 11, 16 GB RAM, Intel Core i5).
- **Benefits:**
  - Running compilation, tests, and heavy npm builds inside disposable 2-core cloud virtual machines prevents local system freezes.
  - Tasks can proceed asynchronously while the user's laptop is sleeping or powered down.
  - Utilizes GitHub's free allowance of 2,000 minutes/month for private repositories, satisfying the ₹0 cost mandate.
- **Verdict:** **Flawless architectural alignment.**

### 3.2 ADR-008: LangGraph with PostgreSQL Checkpointing
- **Analysis:** Choosing LangGraph with `AsyncPostgresSaver` provides graph-based execution control with native durable checkpointing.
- **Deficiency Identified:** The decision record fails to document the exact PostgreSQL setup parameters required by `langgraph-checkpoint-postgres` (such as setting `autocommit=True`, `row_factory=dict_row`, and strict msgpack deserialization to prevent remote code execution vulnerabilities).
- **Verdict:** **Sound, but requires technical clarification (addressed in `DOC-002`).**

### 3.3 ADR-004 vs ADR-013: AI Provider Routing Reconciliation
- **Analysis:** ADR-004 originally designed an internal provider adapter pattern featuring `MockProvider`, `GeminiAdapter`, and `OpenAIAdapter`. On 2026-11-14, ADR-013 introduced **OpenRouter (`openrouter/auto`)** as the primary default AI provider.
- **Architectural Reconciliation:**
  - `MockProvider` remains the mandatory default for all unit and CI testing (0 network calls, ₹0 cost).
  - OpenRouter is established as the primary production gateway (`DEFAULT_AI_PROVIDER=openrouter`), utilizing `openrouter/auto` to meta-route across frontier models (Claude 3.5 Sonnet, Gemini 2.0 Flash, DeepSeek V3/R1).
  - Direct vendor adapters (`GeminiAdapter`, `OpenAIAdapter`) are retained as fallback adapters for offline or specialized setups.
- **Verdict:** **Sound, but requires system-wide specification update (addressed in `DOC-003`).**

---

## 4. Proposed New Architecture Decision Records (ADRs)

The audit board recommends the owner formalize three new ADRs to close identified architectural gaps:

### Proposed ADR-014: Canonical Task State Machine Standardization
- **Context:** `SYSTEM_ARCHITECTURE.md` and `API_SPECIFICATION.md` currently diverge between 11 states and 10 states.
- **Proposed Decision:** Standardize exclusively on the 11 states defined in `SYSTEM_ARCHITECTURE.md`:
  `PENDING`, `PLANNING`, `AWAITING_APPROVAL`, `APPROVED`, `EXECUTING`, `TESTING`, `DIAGNOSING`, `PR_CREATED`, `COMPLETED`, `FAILED`, `CANCELLED`.
- **Status:** **Proposed for Owner Decision (via `DOC-001`).**

### Proposed ADR-015: Tree-sitter AST Repository Symbol Indexing
- **Context:** Autonomous multi-file code editing requires understanding repository structure without blowing LLM context windows with raw file dumps.
- **Proposed Decision:** Integrate Tree-sitter tag mapping into the coding worker to build a compressed symbol map (<4k tokens) before planning code modifications.
- **Status:** **Proposed for Owner Decision (via `DOC-008`).**

### Proposed ADR-016: Sequential Hash-Chained Cryptographic Audit Ledger
- **Context:** High-assurance governance requires proof that database audit logs have not been tampered with or deleted.
- **Proposed Decision:** Add a `prev_event_hash` SHA-256 column to `audit_events`, creating a cryptographically verifiable tamper-evident ledger.
- **Status:** **Proposed for Owner Decision (via `DOC-014`).**
