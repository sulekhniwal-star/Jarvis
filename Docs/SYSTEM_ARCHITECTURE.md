# Project Jarvis — System Architecture Specification

**Document Version:** 1.0  
**Verification Date:** 2026-11-13  
**Status:** Architecture Baseline Approved

---

## 1. High-Level Architectural Overview

Project Jarvis is designed around a **Bifurcated Enclave Architecture** that strictly separates the trusted **Control Plane** from the untrusted **Execution Plane**.

```
+-----------------------------------------------------------------------------------------------------+
|                                            USER INTERFACE                                           |
|       +------------------------------------+          +------------------------------------+        |
|       |     Next.js 15 Web Dashboard       |          |        Telegram Bot Interface      |        |
|       |  (Mobile & Desktop, Auth, Cookie)  |          |       (Long Polling / Webhook)     |        |
|       +-----------------+------------------+          +-----------------+------------------+        |
+-------------------------|-----------------------------------------------|---------------------------+
                          | HTTPS / REST                                  | Outbound HTTPS Polling
                          v                                               v
+-----------------------------------------------------------------------------------------------------+
|                                            CONTROL PLANE                                            |
|                                       (Trusted Enclave Services)                                    |
|                                                                                                     |
|   +---------------------------------------------------------------------------------------------+   |
|   |                               FastAPI Application Gateway                                   |   |
|   |         - Argon2id & JWT Auth Service         - Single-Owner Access Control Policy         |   |
|   |         - Task Management & Audit Service     - Telemetry & JSON Redacting Logger           |   |
|   +----------------------------------------------+----------------------------------------------+   |
|                                                  |                                                  |
|   +----------------------------------------------v----------------------------------------------+   |
|   |                         LangGraph Stateful Orchestration Engine                             |   |
|   |   - Task Planner Node             - Researcher Sub-Node           - Coding Agent Node       |   |
|   |   - Reviewer Sub-Node             - PR Generator Node             - State Checkpointer      |   |
|   |   - Human-in-the-Loop Interrupt   - Diagnostic Retry Loop         - Postgres Checkpointer   |   |
|   +-------------------+--------------------------+------------------------------+---------------+   |
|                       |                          |                              |                   |
|   +-------------------v--------+    +------------v-------------+    +-----------v---------------+   |
|   |   AI Provider Gateway      |    |  Deterministic Policy &  |    |  Durable State Storage    |   |
|   | - OpenRouter (auto) Primary|    |      Approval Engine     |    | - Supabase / PostgreSQL   |   |
|   | - MockProvider (CI/Test)   |    | - Tool Call Authorizer   |    | - SQLAlchemy 2.0 Async    |   |
|   | - Gemini / OpenAI Fallback |    | - Payload Hash Verifier  |    | - LangGraph Checkpoints   |   |
|   | - Paid-Call Circuit Breaker|    | - Non-Self-Approval Gate |    | - Fernet Encrypted Store  |   |
|   +----------------------------+    +------------+-------------+    +---------------------------+   |
+--------------------------------------------------|--------------------------------------------------+
                                                   | Ephemeral Job Dispatch (Token, Target, Commands)
                                                   v
+-----------------------------------------------------------------------------------------------------+
|                                           EXECUTION PLANE                                           |
|                                       (Untrusted Worker Sandbox)                                    |
|                                                                                                     |
|     PRIMARY: GitHub Actions Hosted Runner              SECONDARY: Hardened Local Docker             |
|     +-----------------------------------------+        +-----------------------------------------+  |
|     | - Fresh Ephemeral Ubuntu VM             |        | - User 1000:1000, --cap-drop=ALL        |  |
|     | - 2 vCPU, 7 GB RAM, 14 GB SSD           |        | - Read-only rootfs, tmpfs workspace     |  |
|     | - Scoped 60-min GitHub Installation Tok |        | - Memory limit: 2GB, CPU limit: 1.5     |  |
|     | - Target Git Branch Checkout            |        | - Network: None (pure test runs)        |  |
|     | - File Edit & Diagnostic Test Execution |        | - Ephemeral container destroyed on exit |  |
|     | - Capture Diff, Exit Codes & Test Logs  |        | - No host mounts or docker socket       |  |
|     +--------------------+--------------------+        +--------------------+--------------------+  |
|                          |                                                  |                       |
+--------------------------|--------------------------------------------------|-----------------------+
                           | Commit, Push, PR Creation                        | Patch & Logs Return
                           v                                                  v
+-----------------------------------------------------------------------------------------------------+
|                                            EXTERNAL SYSTEMS                                         |
|   +------------------------------------+                      +---------------------------------+   |
|   |          GitHub Platform           |                      |     OpenRouter / Model APIs     |   |
|   |  - Private Org Repositories        |                      |  - openrouter/auto Meta-Router  |   |
|   |  - Branch Protection Policies      |                      |  - Claude 3.5 / Gemini / DeepSeek |   |
|   |  - PR Reviews & Status Checks      |                      |  - Zero-spend Guarantee Mode    |   |
|   +------------------------------------+                      +---------------------------------+   |
+-----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Principles

1. **Separation of Concerns:** The Control Plane never runs untrusted repository scripts, dependencies, or test suites. The Execution Plane never holds database passwords, long-lived API keys, or control-plane master keys.
2. **Deterministic Authorization Gate:** The AI model is strictly an advisory component. Every capability execution (file writes, git commits, PR creation, external network calls) is intercepted and evaluated by deterministic Python logic.
3. **Immutability of Approvals:** High-consequence actions require explicit human authorization. Approvals are cryptographically tied to a canonical SHA-256 hash of the exact parameters. Any parameter tampering immediately invalidates the approval token.
4. **Resilient Recovery (Checkpointing):** Workflow progress is checkpointed at every graph transition. Coordinator crashes, network drops, or worker restarts do not cause data loss or duplicate execution.
5. **No Blind Trust in Tests:** A test is only marked passed if the captured process exit code is `0` and the test runner output matches structured positive assertions (e.g. `X passed, 0 failed`).

---

## 3. End-to-End Task Lifecycle

The following sequence illustrates the complete lifecycle of a software engineering assignment:

```
[Owner]           [Control Plane]        [AI Gateway]      [Execution Plane]      [GitHub]
   |                     |                     |                   |                 |
   |-- 1. Submit Task -->|                     |                   |                 |
   |   (Telegram/Web)    |-- 2. Persist Task ->|                   |                 |
   |                     |   (State: PENDING)  |                   |                 |
   |                     |                     |                   |                 |
   |                     |-- 3. Plan Request ->|                   |                 |
   |                     |                     |-- 4. Gen Plan --->|                 |
   |                     |                     |<-- Plan Tokens ---|                 |
   |                     |                                         |                 |
   |                     |-- 5. Scope & Safety Check               |                 |
   |                     |   (Requires Approval?)                  |                 |
   |                     |                                         |                 |
   |<- 6. Push Approval -|                                         |                 |
   |-- 7. Approve Task ->|                                         |                 |
   |                     |                                         |                 |
   |                     |-- 8. Gen Ephemeral Token -------------->|                 |--> Create Branch
   |                     |-- 9. Dispatch Job --------------------->|                 |
   |                     |                                         |-- 10. Checkout -|
   |                     |                                         |-- 11. Edit Code |
   |                     |                                         |-- 12. Run Tests |
   |                     |                                         |                 |
   |                     |<-- 13. Return Patch, Exit Codes, Logs --|                 |
   |                     |                                                           |
   |                     |-- 14. Verify Tests (Exit Code == 0)                       |
   |                     |-- 15. Create PR ----------------------------------------->|--> Open PR
   |                     |                                                           |
   |<- 16. Notify -------|                                                           |
   |   (PR Link & Summary)                                                           |
```

---

## 4. State Machine Definition

A task progresses through strict, validated state transitions managed by LangGraph:

```
                   +-------------------+
                   |      PENDING      |
                   +---------+---------+
                             |
                             v
                   +-------------------+
                   |     PLANNING      |
                   +---------+---------+
                             |
             +---------------+---------------+
             |                               |
             v                               v
   +-------------------+           +-------------------+
   | AWAITING_APPROVAL |           |     EXECUTING     |
   +---------+---------+           +---------+---------+
             |                               |
     +-------+-------+                       v
     |               |             +-------------------+
     v               v             |      TESTING      |
  APPROVED        REJECTED         +---------+---------+
     |               |                       |
     |               +-----------+   +-------+-------+
     v                           |   |               |
     +---------------------------)---+ (Pass)        | (Fail, < Retry Limit)
                                 |   |               v
                                 |   |     +-------------------+
                                 |   |     |    DIAGNOSING     |
                                 |   |     +---------+---------+
                                 |   |               |
                                 |   |               +-(Retry)-> EXECUTING
                                 |   v
                                 | +-------------------+
                                 | |    PR_CREATED     |
                                 | +---------+---------+
                                 |           |
                                 |           v
                                 | +-------------------+
                                 | |     COMPLETED     |
                                 | +-------------------+
                                 v
                       +-------------------+
                       |   FAILED/CANCEL   |
                       +-------------------+
```

### State Definitions:

- **`PENDING`:** Task submitted, validated, and queued in PostgreSQL.
- **`PLANNING`:** AI planner inspects task scope and produces structured execution steps.
- **`AWAITING_APPROVAL`:** Workflow suspended; waiting for human signature on sensitive action.
- **`APPROVED`:** Human confirmed parameters; execution resumed.
- **`EXECUTING`:** Worker modifying files in disposable sandbox environment.
- **`TESTING`:** Automated test suite running inside sandbox; capturing raw exit codes and stdout.
- **`DIAGNOSING`:** Test failed; analyzing stack trace and attempting fix within retry budget (max 3 retries).
- **`PR_CREATED`:** Clean git branch pushed, pull request opened via GitHub App.
- **`COMPLETED`:** All tests verified green, PR evidence compiled, notifications dispatched.
- **`FAILED`:** Terminal error (retry limit exceeded, unauthorized command, or timeout).
- **`CANCELLED`:** Aborted by human operator or emergency kill-switch.

### Sub-Agent Graph Nodes & Edge Topology:

LangGraph orchestrates specialized modular sub-nodes within the state machine:
1. **`researcher_node` (Conditional):** Triggered during `PLANNING` when task ambiguity or external API documentation verification is required. Ingests source documentation as untrusted data and returns structured findings to the planner.
2. **`reviewer_node` (Quality Gate):** Triggered after `TESTING` succeeds. Inspects the captured git diff, validates test assertion evidence, checks for scope creep or unintended secret additions, and approves transition to `PR_CREATED`.

---

## 5. Security Enclaves & Trust Boundaries

| Enclave                     | Trust Level | Components                                         | Access Controls                                                                              |
| :-------------------------- | :---------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Zone 0: Public**          | Untrusted   | Telegram API, Public Internet, Mobile Browser      | TLS 1.3, Rate Limiting, CORS, Telegram User Allowlist                                        |
| **Zone 1: Control Plane**   | High Trust  | FastAPI, LangGraph, Supabase DB, Secret Manager    | Argon2id Auth, HttpOnly Cookies, AES-256 Encryption at Rest                                  |
| **Zone 2: Execution Plane** | Zero Trust  | GitHub Actions Runner, Docker Worker, Repositories | Short-lived installation token, read-only rootfs, no control plane secrets, egress filtering |

---

## 6. Resiliency, Failure Handling & Recovery

1. **Coordinator Crash / Restart:**
   - On startup, the FastAPI coordinator queries `tasks` with status in `[PLANNING, EXECUTING, TESTING]`.
   - LangGraph inspects the last checkpoint in `checkpoints` using the `thread_id` (Task ID).
   - Execution resumes seamlessly from the exact interrupted node.
2. **Worker Timeout:**
   - Hard execution timeout: 10 minutes per execution job.
   - If a runner hangs, the coordinator marks the execution timed-out, releases resources, and logs an incident.
3. **Database Connection Loss:**
   - Connection pooler (`psycopg_pool`) with automatic reconnection and exponential backoff (1s, 2s, 4s, max 30s).
   - Critical operations fail closed (rejecting state transitions rather than proceeding in an unverified state).
4. **Model Rate Limiting (429):**
   - AI Gateway implements jittered exponential backoff (retry after `min(2^attempt + jitter, 60s)`).
   - If quota exhausted, the task is marked `PAUSED_RATE_LIMIT` and a Telegram alert is sent to the owner.

---

## 7. Verification & Sign-off

- **Architect:** Principal Software Architect
- **DevSecOps Lead:** DevSecOps Engineer
- **Status:** Approved for Milestone 1 Implementation
