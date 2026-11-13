# Project Jarvis — Architectural Decision Log (ADR)

**Document Version:** 1.0  
**Verification Date:** 2026-11-13  
**Status:** Architecture Baseline Approved

---

## Architecture Decision Records Overview

| ADR ID      | Title                                                              | Status   | Date       |
| :---------- | :----------------------------------------------------------------- | :------- | :--------- |
| **ADR-001** | Coding-First Autonomous Product Scope                              | Accepted | 2026-11-13 |
| **ADR-002** | Strict Separation of Control Plane and Execution Plane             | Accepted | 2026-11-13 |
| **ADR-003** | Deterministic Capability Gating & Human Approval Engine            | Accepted | 2026-11-13 |
| **ADR-004** | Provider-Independent AI Gateway with Offline Mock Provider         | Accepted | 2026-11-13 |
| **ADR-005** | Free-First Infrastructure & Hard Paid-Call Blocking                | Accepted | 2026-11-13 |
| **ADR-006** | GitHub App Authentication with Short-Lived Scoped Tokens           | Accepted | 2026-11-13 |
| **ADR-007** | Ephemeral Cloud Execution via GitHub Actions Runners               | Accepted | 2026-11-13 |
| **ADR-008** | LangGraph with PostgreSQL Checkpointing for Durable State          | Accepted | 2026-11-13 |
| **ADR-009** | Telegram Bot with Long Polling and Single-User Identity Allowlist  | Accepted | 2026-11-13 |
| **ADR-010** | Mobile-First Responsive Web Dashboard via Next.js 15               | Accepted | 2026-11-13 |
| **ADR-011** | Managed Supabase Free Tier with Keep-Alive & Self-Host Portability | Accepted | 2026-11-13 |
| **ADR-012** | Controlled Supervised Self-Improvement in Isolated Branches        | Accepted | 2026-11-13 |

---

### ADR-001: Coding-First Autonomous Product Scope

- **Status:** Accepted
- **Context:** Project Jarvis aims to become a comprehensive autonomous personal assistant. However, attempting to build general personal assistant capabilities (calendar, smart home, travel booking, web browsing) concurrently with complex software engineering capabilities dilutes focus and increases failure rates.
- **Decision:** Prioritize the autonomous software development workflow as MVP Milestone 1-5. Personal assistant and voice features are explicitly deferred until the coding agent reliably inspects, tests, and prepares pull requests.
- **Alternatives Considered:** Building a voice-first general assistant first (rejected: complex audio pipeline, lower engineering utility for the owner's immediate development needs).
- **Consequences:** Accelerates delivery of high-leverage developer tooling. Clear acceptance criteria centered around real code generation, automated test execution, and pull request generation.
- **Security Impact:** Narrower initial attack surface focused purely on repository isolation and code execution safety.
- **Cost Impact:** Minimizes exploratory API expenditures.

---

### ADR-002: Strict Separation of Control Plane and Execution Plane

- **Status:** Accepted
- **Context:** Autonomous coding requires cloning third-party or private repositories, installing dependencies (`pip install`, `npm install`), and executing tests. Untrusted code, malicious build scripts, or indirect prompt injections could compromise host credentials, environment variables, or databases.
- **Decision:** Structurally bifurcate Jarvis into two isolated planes:
  1. **Control Plane (Trusted):** FastAPI coordinator, PostgreSQL state database, secret manager, approval engine, and Telegram listener. Never executes untrusted repository code.
  2. **Execution Plane (Untrusted/Disposable):** Ephemeral execution workers running in disposable cloud virtual machines (GitHub Actions) or restricted local containers. Possesses zero control-plane secrets, zero database access, and strictly scoped temporary credentials.
- **Alternatives Considered:** Running coding tasks in local sub-processes on the Windows 11 host (rejected: severe vulnerability to host takeover, data destruction, and credential exfiltration).
- **Consequences:** Requires clean job serialization and artifact extraction across the plane boundary.
- **Security Impact:** Mitigates sandbox escape and host contamination.

---

### ADR-003: Deterministic Capability Gating & Human Approval Engine

- **Status:** Accepted
- **Context:** LLMs are probabilistic text predictors susceptible to hallucination, jailbreaks, and indirect prompt injection. If an agent has direct access to destructive or financial tools, a malicious prompt in a repository could trigger unauthorized actions.
- **Decision:**
  1. The AI model has zero direct execution authority. The model proposes actions; a deterministic, non-AI Python policy engine evaluates and authorizes them.
  2. High-consequence actions (paid API spending, external messaging, production merges, database deletion, security policy edits) trigger an immutable `ApprovalRequest` record in PostgreSQL.
  3. Approvals are cryptographically bound to the canonical JSON hash of the action payload and expire automatically.
  4. An AI agent is architecturally blocked from approving its own actions.
- **Alternatives Considered:** Prompt-based guardrails (e.g. telling the model "do not execute dangerous commands") (rejected: proven trivially bypassable via prompt injection).
- **Consequences:** Consequential actions pause workflows until approved via the mobile-friendly web dashboard.
- **Security Impact:** Eliminates unauthorized financial exposure, accidental data deletion, and malicious remote code execution.

---

### ADR-004: Provider-Independent AI Gateway with Offline Mock Provider

- **Status:** Accepted
- **Context:** Cloud LLM providers frequently change pricing, deprecate models, update terms of service, or experience service outages. Furthermore, running test suites against live commercial APIs incurs continuous financial cost and causes non-deterministic test flakiness.
- **Decision:**
  1. Create a provider abstraction interface (`AIProvider`) with concrete adapters for `MockProvider`, `GeminiAdapter`, and `OpenAIAdapter`.
  2. The `MockProvider` is the default provider for all unit, integration, and CI tests. It returns synthetic, structured plan and code responses with 0 network calls and ₹0 cost.
  3. Google Gemini API (via Google AI Studio) is configured as a pluggable adapter, enabled only when the user supplies a valid API key.
- **Alternatives Considered:** Hardcoding Google Generative AI SDK across services (rejected: tightly couples system to one vendor and breaks offline testing).
- **Consequences:** All agent nodes interact strictly through the unified adapter interface.
- **Cost & Security Impact:** 100% free automated testing; zero risk of CI bill shock.

---

### ADR-005: Free-First Infrastructure & Hard Paid-Call Blocking

- **Status:** Accepted
- **Context:** The owner has specified an initial operating budget of ₹0 and a target ongoing budget of ₹1,000–₹3,000/month. The owner's personal consumer Gemini subscription does NOT provide Gemini API credits. Automatic API calls could incur unexpected cloud debt.
- **Decision:**
  1. Implement a system-level `PaidCallBlocker` circuit breaker. Paid API endpoints are blocked at the networking layer unless an explicit, time-bounded approval grant with a hard maximum spending limit is registered.
  2. Free-first architecture: Supabase Free Tier (PostgreSQL), GitHub Actions Free Tier (2,000 CI minutes/month), Next.js on Vercel Free / Local, Telegram Free Bot API.
- **Alternatives Considered:** Relying on provider monthly budget alerts (rejected: billing alerts notify after money has already been spent, not before).
- **Consequences:** The system will never incur unexpected billing charges without prior authenticated human approval.

---

### ADR-006: GitHub App Authentication with Short-Lived Scoped Tokens

- **Status:** Accepted
- **Context:** Interacting with GitHub using Personal Access Tokens (PATs) violates least-privilege principles because PATs often have broad account-level access and indefinite lifespans.
- **Decision:** Register a dedicated GitHub App for Project Jarvis. The control plane holds the App ID and 2048-bit RSA Private Key (encrypted at rest with AES-256-GCM). When a repository task begins, Jarvis requests an ephemeral installation access token (`ghs_...`) scoped strictly to the target repository with a 60-minute maximum lifespan.
- **Alternatives Considered:** Using OAuth tokens or Classic PATs (rejected: broad user account blast radius).
- **Consequences:** Clear audit trail in GitHub (`jarvis-bot[bot]`); revoked automatically if leaked.

---

### ADR-007: Ephemeral Cloud Execution via GitHub Actions Runners

- **Status:** Accepted
- **Context:** The developer's primary machine is Windows 11 with 16 GB RAM and an Intel Core i5. Heavy compilation, Docker compilation, and test execution drain local resources and require the computer to remain powered on.
- **Decision:** Leverage GitHub Actions hosted runners as the primary cloud execution engine for repository jobs:
  1. Jarvis dispatches a secure workflow run via GitHub API with an ephemeral job payload.
  2. GitHub provisions a clean Ubuntu virtual machine (2-core CPU, 7 GB RAM, 14 GB SSD).
  3. The runner checks out the target branch, executes planned modifications and tests in isolation, captures logs/diffs, and reports back via webhook or artifact upload.
  4. Local Docker execution is retained as an optional fallback for offline development.
- **Alternatives Considered:** Dedicated Cloud VM / VPS (rejected: violates the ₹0 initial budget requirement).
- **Consequences:** Frees local system RAM/CPU; provides true cloud autonomy even when the owner's laptop is sleeping.

---

### ADR-008: LangGraph with PostgreSQL Checkpointing for Durable State

- **Status:** Accepted
- **Context:** Multi-step autonomous coding workflows take minutes to hours and require human review pauses. If the coordinator process crashes, restarts, or deploys an update during execution, the workflow must not lose state or repeat completed steps.
- **Decision:** Use LangGraph with `AsyncPostgresSaver` backed by the PostgreSQL `checkpoints` table. Every node execution (plan generation, file reading, code editing, test running, PR creation) automatically commits a state snapshot. Workflows can be paused (`interrupt_before`), resumed, or replayed from any checkpoint.
- **Alternatives Considered:** In-memory state (rejected: lost on server restart); custom JSON file persistence (rejected: race conditions, lack of ACID transactions).
- **Consequences:** Durable execution resilience across process restarts.

---

### ADR-009: Telegram Bot with Long Polling and Single-User Identity Allowlist

- **Status:** Accepted
- **Context:** The owner needs mobile task submission and real-time alerts without configuring static public IPs, domain names, or reverse proxies during local/hybrid development.
- **Decision:** Use Telegram Bot API in Long Polling mode for initial development, with webhook support for cloud production. All incoming updates pass through a mandatory identity verification middleware that rejects any message whose `from.id` does not match `AUTHORIZED_TELEGRAM_USER_ID`.
- **Alternatives Considered:** Exposing local ports via ngrok / Cloudflare Tunnel for webhooks (rejected: adds operational friction and external dependencies during early phases).
- **Consequences:** Immediate mobile connectivity with zero firewall or router configuration.

---

### ADR-010: Mobile-First Responsive Web Dashboard via Next.js 15

- **Status:** Accepted
- **Context:** Telegram messages have strict character limits (4,096 chars) and cannot cleanly display interactive multi-file git diffs, full test execution logs, or complex approval reviews.
- **Decision:** Develop a responsive, mobile-first web dashboard using Next.js 15 App Router, TypeScript, and Tailwind CSS. The dashboard provides comprehensive task timelines, live log streaming, detailed code diffs, approval management, memory inspection, and an emergency kill switch.
- **Alternatives Considered:** Building a native mobile app (iOS/Android) (rejected: massive development overhead and App Store delays).
- **Consequences:** Accessible seamlessly from both phone browsers and desktop screens.

---

### ADR-011: Managed Supabase Free Tier with Keep-Alive & Self-Host Portability

- **Status:** Accepted
- **Context:** The project requires a reliable PostgreSQL database available 24/7 in the cloud without server maintenance costs. Supabase provides a 500 MB free tier, but automatically pauses databases inactive for 7 consecutive days.
- **Decision:** Use Supabase Free Tier as the initial cloud database. Implement an automated weekly health ping to maintain activity. Write all database schemas and migrations using standard SQLAlchemy 2.0 and Alembic to guarantee 100% portability to any self-hosted PostgreSQL instance or Docker container.
- **Alternatives Considered:** Hosting PostgreSQL directly on a free cloud container (Render/Railway) (rejected: 30-day limits and ephemeral disk storage).
- **Consequences:** Zero infrastructure management overhead while strictly maintaining portability.

---

### ADR-012: Controlled Supervised Self-Improvement in Isolated Branches

- **Status:** Accepted
- **Context:** Project Jarvis must eventually be capable of self-improvement. However, allowing an AI agent write-access to its own production coordinator, security policies, or approval engine creates existential safety and reliability risks.
- **Decision:** Enforce a strict, immutable protocol for self-improvement:
  1. Jarvis may analyze its own repository in read-only mode.
  2. Code changes are generated strictly on an isolated feature branch (e.g. `jarvis/self-improve-...`).
  3. All automated unit and security tests must execute and pass in the execution plane.
  4. Changes to core security policies, approval engines, authentication handlers, or credentials can NEVER be auto-merged.
  5. A Pull Request is opened for mandatory human review and signed release approval.
- **Alternatives Considered:** Unsupervised autonomous self-modifying runtime (rejected: catastrophic risk of accidental safety degradation or runaway bugs).
- **Consequences:** Safe, auditable, and transparent self-enhancement.

---

## Sign-off

- **Architect:** Principal Software Architect
- **Approved Date:** 2026-11-13
