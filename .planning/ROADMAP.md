---
milestone: "v5.0 - Coding Execution Sandbox"
version: "5.0.0"
updated: 2026-11-15T23:45:00+05:30
---

# ROADMAP.md — Jarvis Project Roadmap

> **Current Milestone:** v5.0 - Coding Execution Sandbox (Active)  
> **Current Phase:** 15 - Coding Agent Interface & Execution Engine Contract  
> **Status:** Ready for Planning (`/gsd-plan-phase 15`)

## Must-Haves (Milestone 5 Baseline)

- [ ] Standard TypeScript Coding Agent Interface (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`) decoupling orchestration from coding CLI tools.
- [ ] Headless Aider CLI adapter executing non-interactive batch tasks with strict file-modification boundaries and OpenRouter provider settings.
- [ ] Ephemeral sandbox runner environment (GitHub Actions workflow dispatcher & local Docker runner fallback) isolating execution without master credential exposure.
- [ ] Execution telemetry pipeline recording stdout/stderr, git diff patches, test summaries, and updating database `agent_runs` and `tasks` state machines.

## Must-Haves (Milestone 4 Baseline — Complete)

- [x] Strongly-typed GitHub API client (Octokit / fetch wrapper) supporting repository status, commit retrieval, and tree inspection.
- [x] Secure GitHub Webhook receiver (`/api/github/webhook`) verifying HMAC SHA-256 signatures (`X-Hub-Signature-256`).
- [x] Remote Git Push Approval Gate enforcing clean working trees, test pass proof, and approval requirement verification before executing `git push origin main`.
- [x] Automated branchless safety guard preventing non-`main` checkouts and blocking unapproved remote pushes.
- [x] Repository Synchronization Monitor computing ahead/behind commit divergence between local `main` HEAD and `origin/main`.
- [x] Real-time synchronization metrics surfaced to Web Dashboard and Telegram (`/status`, `/projects`).

## Must-Haves (Milestone 3 Baseline — Complete)

- [x] Type-safe Telegram Bot API client wrapper (`TelegramClient`) with MarkdownV2 escaping and inline keyboard markup.
- [x] Single-owner security guard verifying update sender numeric ID matches `OWNER_TELEGRAM_ID`.
- [x] Dual-mode update pipeline: Next.js App Router webhook route (`/api/telegram/webhook`) and dev polling script.
- [x] Essential command router responding to `/start`, `/status`, `/budget`, and `/projects`.
- [x] Remote task intake from free-text messages routing into `SpecifierAgent` and bidirectional clarification loop.
- [x] Rich interactive approval cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`) and in-place message updates.

## Must-Haves (Milestone 1 Baseline)

- [x] Complete Next.js 15+ App Router baseline configured with TypeScript, Tailwind CSS, and test harness.
- [x] Automated Git branch safety guard enforcing `main`-only commits and rejecting non-main branch actions.
- [x] Reproducible Supabase Docker environment with automated migrations and 100% RLS coverage.
- [ ] Data access layer for Projects, Tasks, Milestones, Conversations, Approvals, and Durable Agent Runs.
- [ ] OpenRouter AI Gateway adapter with free-model fallback and strict paid-inference approval gating.
- [ ] Responsive, accessible, authenticated UI shell and dashboard matching `UI_DESIGN_SYSTEM.md`.

---

## Phases for Milestone 1: Core Platform Foundation & Architecture

### Phase 1: Environment & Project Foundation
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Establish reproducible codebase scaffold, build configuration, test framework, and Git safety invariants.  
**Requirements:** REQ-ENV-01, REQ-ENV-02, NFR-SEC-01, NFR-SEC-02  

**Plans:**
- [x] Plan 1.1: Next.js 15+ App Router initialization, TypeScript config, Tailwind CSS tokens, and Vitest test suite.
- [x] Plan 1.2: Git safety guard utility enforcing strict `main`-only policy and commit diff inspection tools.

---

### Phase 2: Database & Authentication Infrastructure
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Deploy local Supabase development environment, apply core relational migrations, enforce RLS policies, and wire Supabase Auth.  
**Depends on:** Phase 1  
**Requirements:** REQ-DB-01, REQ-DB-02, REQ-DB-03, REQ-DB-04, REQ-AUTH-01, NFR-SEC-03  

**Plans:**
- [x] Plan 2.1: Supabase local configuration, migration scripts for core entities (`profiles`, `projects`, `tasks`, etc.), and RLS policies.
- [x] Plan 2.2: Supabase client factories (server & browser), automated TypeScript type generation, and Auth route handlers.

---

### Phase 3: Core Domain Models & Repositories
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Build typed data access layer, state machines for Tasks, Approvals, and Durable Agent Runs with event logging.  
**Depends on:** Phase 2  
**Requirements:** REQ-REPO-01, REQ-REPO-02, REQ-REPO-03, REQ-REPO-04, NFR-REL-01  

**Plans:**
- [x] Plan 3.1: Conversation schema migration, updated types, typed repositories for Projects, Milestones, Tasks, and Conversations.
- [x] Plan 3.2: Domain state machines (Task, Approval, Run), ApprovalRepository, AgentRunRepository, artifact logging, and unit tests.

---

### Phase 4: Provider Adapters & AI Gateway
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Implement modular AI Gateway with OpenRouter client, free-model failover, paid-inference approval gate, and token usage ledger.  
**Depends on:** Phase 3  
**Requirements:** REQ-AI-01, REQ-AI-02, REQ-AI-03, REQ-AI-04, NFR-COST-01  

**Plans:**
- [x] Plan 4.1: OpenRouter API adapter supporting streaming, structured JSON output, and model routing.
- [x] Plan 4.2: Free-model prioritization policy, paid-inference approval verification gate, and usage ledger service.

---

### Phase 5: Authenticated UI Shell & Dashboard Foundation
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Construct responsive, accessible navigation shell, AI Core overview widget, project cards, and approval alerts.  
**Depends on:** Phase 4  
**Requirements:** REQ-UI-01, REQ-UI-02, REQ-UI-03, REQ-UI-04, NFR-PERF-01  

**Plans:**
- [x] Plan 5.1: Navigation shell (desktop sidebar, mobile drawer, topbar) with Jarvis cinematic dark styling and accessibility compliance.
- [x] Plan 5.2: Dashboard overview page integrating real-time agent status, project summary, pending approvals list, and state handling.

---

## Milestone 2: Specification & Planning Workflow

### Phase 6: Task Intake & Specification Engine
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Ingest natural language prompts, extract structured scope, exclusions, and acceptance criteria via Specifier Agent, and provide a Socratic clarification loop for underspecified requests.  
**Depends on:** Phase 5  
**Requirements:** REQ-SPEC-01, REQ-SPEC-02, REQ-SPEC-03, NFR-REL-02  

**Plans:**
- [x] Plan 6.1: Specifier Agent prompt engineering, structured extraction parser, Zod validation, and Socratic clarification loop.
- [x] Plan 6.2: Specification repository, database persistence in `specifications`, task state transition (`intake` -> `specifying`), API route handlers, and unit tests.

---

### Phase 7: Execution Planning Engine
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Decompose specifications into atomic execution steps with wave-based dependency ordering, risk level scoring, and approval requirement detection.  
**Depends on:** Phase 6  
**Requirements:** REQ-PLAN-01, REQ-PLAN-02, REQ-PLAN-03, NFR-REL-02  

**Plans:**
- [x] Plan 7.1: Planner Agent prompt engineering, step decomposition, DAG dependency builder, cycle detection, and automated risk scoring.
- [x] Plan 7.2: Plan repository, database persistence in `plans`, task state transition (`specifying` -> `planned`), API route handlers, and unit tests.

---

### Phase 8: Plan Review UI & Approval Gate
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Construct interactive web review screen displaying plan DAGs, risk assessment, and one-click Plan Approval or revision request actions.  
**Depends on:** Phase 7  
**Requirements:** REQ-PLAN-04  

**Plans:**
- [x] Plan 8.1: Visual Plan Review interface displaying scope, steps, dependencies, and risk level badges.
- [x] Plan 8.2: Human decision actions (Approve Plan, Request Revision), approval state transitions, and integration tests.

---

## Milestone 3: Telegram Gateway

### Phase 9: Telegram Core Client & Security Guard
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Implement type-safe Telegram Bot API client, single-owner allow-list security guard, dual-mode update pipeline (webhook + dev polling), and core command router.  
**Depends on:** Phase 8  
**Requirements:** REQ-TG-01, REQ-TG-02, REQ-TG-03, NFR-SEC-04  

**Plans:**
- [x] Plan 9.1: Type-safe Telegram Bot client wrapper, MarkdownV2 escaping utilities, inline keyboard generator, and unit tests.
- [x] Plan 9.2: Single-owner security guard, webhook secret authenticator, App Router route handler (`/api/telegram/webhook`), dev long-polling runner, and basic command routing (`/start`, `/status`, `/budget`, `/projects`).

---

### Phase 10: Telegram Remote Task Intake & Status Reporting
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Ingest free-text prompts from Telegram, feed into Specifier Agent, deliver Socratic clarification questions, capture owner replies, and provide real-time status reporting.  
**Depends on:** Phase 9  
**Requirements:** REQ-TG-04  

**Plans:**
- [x] Plan 10.1: Free-text task intake handler connecting Telegram messages to Specifier Agent and database persistence.
- [x] Plan 10.2: Interactive clarification loop over Telegram and comprehensive status reporting (`/status`, `/budget`, `/cancel`).

---

### Phase 11: Telegram Interactive Approval Cards & Decision Webhook
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Deliver rich interactive approval cards with inline callback buttons, process callback queries via webhook, update durable approval records, advance task state, and update messages in-place.  
**Depends on:** Phase 10  
**Requirements:** REQ-TG-05  

**Plans:**
- [x] Plan 11.1: Formatted approval notification cards with inline action buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`) and message delivery service.
- [x] Plan 11.2: Callback query webhook handler, durable approval state transitions, in-place message edit, and end-to-end integration tests.

---

## Milestone 4: GitHub Integration & Branchless Discipline

### Phase 12: GitHub Client, Authentication & Webhook Receiver
**Status:** ✅ Complete (2026-11-15)  
**Objective:** Author strongly-typed GitHub API client (Octokit / fetch wrapper), configure GitHub App / PAT authentication, and create secure webhook route (`/api/github/webhook`) with HMAC SHA-256 signature verification (`REQ-GH-01`, `REQ-GH-02`).  
**Depends on:** Phase 11  
**Requirements:** REQ-GH-01, REQ-GH-02  

**Plans:**
- [x] Plan 12.1: Type-safe GitHub API client supporting repository info, commit retrieval, tree diff inspection, and GitHub App / PAT auth.
- [x] Plan 12.2: Next.js App Router webhook route (`/api/github/webhook`) with HMAC SHA-256 signature verification (`X-Hub-Signature-256`) and event routing (`push`, `workflow_run`, `check_run`).

---

### Phase 13: Remote Git Push Approval Gate & Branchless Safety Guard
**Status:** ✅ Complete (Executed in Wave 1 & Wave 2)  
**Objective:** Build automated pre-push gate verifying working tree cleanliness, 100% test pass proofs, and strict `main`-only branch lock (`NFR-SEC-01`), requiring explicit human approval in `ApprovalRepository` before executing `git push origin main` (`REQ-GH-03`).  
**Depends on:** Phase 12  
**Requirements:** REQ-GH-03, NFR-SEC-01  

**Plans:**
- [x] Plan 13.1: Pre-push validation engine inspecting git diffs, working tree status, test execution results, and branch invariant.
- [x] Plan 13.2: Remote push approval gate service integrating with `ApprovalRepository`, triggering interactive approval cards (Web + Telegram), and executing authenticated push.

---

### Phase 14: Repository Synchronization Monitor & Dual-Channel Status
**Status:** ✅ Complete (Executed in Wave 1 & Wave 2)  
**Objective:** Track commit divergence between local `main` HEAD and remote `origin/main` commit SHA, computing ahead/behind counts, and broadcasting real-time sync metrics to Web Dashboard and Telegram (`REQ-GH-04`).  
**Depends on:** Phase 13  
**Requirements:** REQ-GH-04  

**Plans:**
- [x] Plan 14.1: Repository Synchronization service polling/listening for remote SHA updates, computing ahead/behind divergence, and persisting sync status.
- [x] Plan 14.2: Dual-channel sync status display on Web Dashboard (sync widget) and Telegram command router (`/status`, `/projects`).

---

### Phase 15: Coding Agent Interface & Execution Engine Contract
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Define the standard TypeScript coding agent interface (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`), engine registry, and context synthesis from approved execution plans (`REQ-EX-01`).  
**Depends on:** Phase 14  
**Requirements:** REQ-EX-01  

**Plans:**
- [x] Plan 15.1: Coding agent contract types, engine registry, and execution artifact models.
- [x] Plan 15.2: Task context synthesizer transforming approved execution plan steps and project workspace into `CodingTaskContext`.

---

### Phase 16: Headless Aider CLI Adapter & Configuration Synthesizer
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Author headless Aider CLI adapter executing non-interactive batch tasks with strict file-modification boundaries, OpenRouter provider mapping, commit extraction, and bounded repair loop (`REQ-EX-02`).  
**Depends on:** Phase 15  
**Requirements:** REQ-EX-02  

**Plans:**
- [x] Plan 16.1: Aider configuration synthesizer (`.aider.conf.yml` / CLI arguments generator) and batch command runner.
- [x] Plan 16.2: Output parser extracting commit hashes, git diff patches, exit codes, and 3-strike bounded repair handler.

---

### Phase 17: Ephemeral Sandbox Runner Environment (GitHub Actions & Local Fallback)
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Build ephemeral sandbox runner environment supporting GitHub Actions workflow dispatch (`workflow_dispatch`), ephemeral credential scoping, and local development runner fallback (`REQ-EX-03`).  
**Depends on:** Phase 16  
**Requirements:** REQ-EX-03  

**Plans:**
- [x] Plan 17.1: GitHub Actions runner workflow dispatch service with scoped repository credentials and workflow run polling.
- [x] Plan 17.2: Local process / Docker fallback runner for isolated offline development.

---

### Phase 18: Execution Telemetry, Artifact Capture & Run State Machine Integration
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Implement end-to-end execution pipeline capturing build/test logs, diff patches, test summaries, persisting durable state in `public.agent_runs`, and broadcasting real-time updates to Web Dashboard and Telegram (`REQ-EX-04`).  
**Depends on:** Phase 17  
**Requirements:** REQ-EX-04  

**Plans:**
- [x] Plan 18.1: Execution telemetry and artifact storage service writing diffs and logs to Supabase Storage / database tables.
- [x] Plan 18.2: Integration with Agent Run State Machine, Task status transitions, and dual-channel progress notifications.

---

## Milestone 6: Quality, Verification & Self-Review

### Phase 19: Automated Verification Framework & Test Runner Harness
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Standardized multi-stage verification pipeline running Vitest/Jest, ESLint, TypeScript compiler checks (`tsc --noEmit`), and production build with custom command overrides and structured JSON test artifact generation (`REQ-VR-01`).  
**Depends on:** Phase 18  
**Requirements:** REQ-VR-01  

**Plans:**
- [x] Plan 19.1: Universal test verification engine running lint, typecheck, unit tests, and production build checks with structured `TestSummary` outputs.
- [x] Plan 19.2: Pluggable project-level test command configuration, custom acceptance-criteria verification scripts, and diagnostic API routes.

---

### Phase 20: Automated Diff Inspector & Quality Gate
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Semantic diff inspection engine enforcing declared file modification boundaries, catching accidental deletions or out-of-scope alterations, and computing code churn/quality metrics (`REQ-VR-02`).  
**Depends on:** Phase 19  
**Requirements:** REQ-VR-02  

**Plans:**
- [x] Plan 20.1: Git diff parser, file boundary validator, and unauthorized file mutation detector.
- [x] Plan 20.2: Quality scoring heuristics, automated formatting checks, and Web Dashboard / Telegram diff presentation.

---

### Phase 21: Pre-Commit Entropy & Secret Scanner
**Status:** ✅ Complete (2026-11-16)  
**Objective:** High-entropy string detector and sensitive credential pattern scanner blocking private keys, tokens, and database passwords from being committed, backed by explicit owner approval override workflows (`REQ-VR-03`).  
**Depends on:** Phase 20  
**Requirements:** REQ-VR-03, NFR-SEC-02  

**Plans:**
- [x] Plan 21.1: Multi-pattern secret scanner and Shannon entropy detector for diffs and execution artifacts.
- [x] Plan 21.2: Human-in-the-loop secret override approval flow via `ApprovalRepository` and Telegram interactive approval cards.

---

### Phase 22: Autonomous Self-Review & Bounded Repair Protocol
**Status:** ✅ Complete (2026-11-16)  
**Objective:** Diagnostic analysis of verification failure logs, prompt synthesis for targeted fixes, 3-strike bounded retry execution, and automated safe rollback to pre-run git HEAD with Telegram alerts upon exhaustion (`REQ-VR-04`).  
**Depends on:** Phase 21  
**Requirements:** REQ-VR-04  

**Plans:**
- [x] Plan 22.1: Failure log diagnostic analyzer and targeted repair prompt synthesizer for coding agents.
- [x] Plan 22.2: 3-strike bounded retry runner, automated git rollback on exhaustion, and Telegram alert with one-click recovery options.

---

## Future Milestones Overview (from PRD §12 & docs/ROADMAP.md)

- **Milestone 7:** Projects, Agents & Memory UI (pgvector semantic memory retrieval).
- **Milestone 8:** Approvals, Security & Cost Controls (Kill switch, backup/recovery drills).
- **Milestone 9:** Deployment & Continuous Maintenance.
- **Milestone 10:** Hardening, Security Audits & Release.

---

## Progress Summary

| Phase | Description | Status | Plans | Complete |
|---|---|---|---|---|
| 1 | Environment & Project Foundation | ✅ | 2/2 | 100% |
| 2 | Database & Auth Infrastructure | ✅ | 2/2 | 100% |
| 3 | Core Domain Models & Repositories | ✅ | 2/2 | 100% |
| 4 | Provider Adapters & AI Gateway | ✅ | 2/2 | 100% |
| 5 | Authenticated UI Shell & Dashboard | ✅ | 2/2 | 100% |
| 6 | Task Intake & Specification Engine | ✅ | 2/2 | 100% |
| 7 | Execution Planning Engine | ✅ | 2/2 | 100% |
| 8 | Plan Review UI & Approval Gate | ✅ | 2/2 | 100% |
| 9 | Telegram Core Client & Security Guard | ✅ | 2/2 | 100% |
| 10 | Telegram Remote Task Intake & Status | ✅ | 2/2 | 100% |
| 11 | Telegram Approval Cards & Decision Webhook | ✅ | 2/2 | 100% |
| 12 | GitHub Client, Auth & Webhooks | ✅ | 2/2 | 100% |
| 13 | Remote Push Approval Gate & Branchless Guard | ✅ | 2/2 | 100% |
| 14 | Repository Sync Monitor & Dual-Channel Status | ✅ | 2/2 | 100% |
| 15 | Coding Agent Interface & Engine Contract | ✅ | 2/2 | 100% |
| 16 | Headless Aider CLI Adapter | ✅ | 2/2 | 100% |
| 17 | Ephemeral Sandbox Runner Environment | ✅ | 2/2 | 100% |
| 18 | Execution Telemetry & Artifact Pipeline | ✅ | 2/2 | 100% |
| 19 | Automated Verification Framework | ✅ | 2/2 | 100% |
| 20 | Automated Diff Inspector & Quality Gate | ✅ | 2/2 | 100% |
| 21 | Pre-Commit Entropy & Secret Scanner | ✅ | 2/2 | 100% |
| 22 | Autonomous Self-Review & Bounded Repair | ✅ | 2/2 | 100% |

---

## Timeline

| Phase | Started | Completed | Duration |
|---|---|---|---|
| Phase 1 | 2026-11-15 | 2026-11-15 | ~45m |
| Phase 2 | 2026-11-15 | 2026-11-15 | ~35m |
| Phase 3 | — | — | — |
| Phase 3 | — | — | — |
| Phase 4 | — | — | — |
| Phase 5 | — | — | — |
