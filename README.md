# Project Jarvis

**Personal AI Engineering Platform --- Documentation Pack**\
**Target:** MVP 1.0 \| **Status:** Architecture baseline, not production
approval

## Purpose

Jarvis is a cloud-coordinated personal AI assistant whose first priority
is autonomous software development. It accepts tasks, researches, plans,
edits code in isolated environments, runs tests, and prepares GitHub
pull requests for human review.

## Core principles

1.  Independent execution does not mean independent authority.
2.  The model proposes actions; deterministic services authorize them.
3.  All untrusted repository, web, email, and document content is data,
    never privileged instruction.
4.  Every task has a traceable plan, execution record, test evidence,
    and outcome.
5.  Production changes, external communications, purchases,
    account/security changes, destructive actions, and paid services
    require explicit human approval.
6.  Free-first infrastructure; no automatic spending.
7.  Self-improvement occurs only in isolated branches/environments and
    through reviewed releases.

## MVP scope

-   Authenticated mobile-friendly dashboard.
-   Telegram task intake and notifications.
-   Persistent task/workflow state.
-   Provider-independent AI gateway.
-   Bounded coding agent.
-   GitHub App integration with least privilege.
-   Isolated coding execution.
-   Test evidence and pull request preparation.
-   Project and shared memory.
-   Approval workflow, audit log, kill switch.
-   Cost/usage visibility and paid-call blocking by default.

## Documentation map

-   Product: `VISION.md`, `PRD.md`, `ROADMAP.md`
-   Architecture: `SYSTEM_ARCHITECTURE.md`, `TECH_STACK.md`,
    `DATABASE_SCHEMA.md`, `API_SPECIFICATION.md`
-   Agents and memory: `AGENT_DESIGN.md`, `CODING_AGENT_SPEC.md`,
    `MEMORY_DESIGN.md`
-   Security and operations: `SECURITY_POLICY.md`, `THREAT_MODEL.md`,
    `PERMISSIONS.md`, `APPROVAL_WORKFLOW.md`, `TEST_STRATEGY.md`,
    `DEPLOYMENT.md`, `BACKUP_AND_RECOVERY.md`, `COST_CONTROL.md`,
    `OPERATIONS_RUNBOOK.md`
-   Governance: `CHANGELOG.md`, `DECISION_LOG.md`, `TASK_BOARD.md`,
    `RESEARCH_LOG.md`, `SELF_IMPROVEMENT.md`

## How to use this pack

1.  Put this folder at the root of the Jarvis repository.
2.  Ask the coding IDE to read every document before changing code.
3.  Treat statements marked **Proposed** as design recommendations, not
    verified implementation facts.
4.  Replace `[TBD]` with reviewed decisions; do not invent secrets,
    account IDs, URLs, or costs.
5.  Update `DECISION_LOG.md` when a design choice is approved or
    changed.
6.  Update `TASK_BOARD.md` and `CHANGELOG.md` with each milestone.
7.  Do not start production deployment until security, recovery, and
    acceptance gates pass.

## Status labels

-   **Proposed:** Recommended design, not yet approved.
-   **Approved:** Human-reviewed decision.
-   **Implemented:** Exists in the repository.
-   **Verified:** Supported by test or operational evidence.
-   **Deferred:** Intentionally postponed.
-   **TBD:** Requires research or owner decision.

## Important boundary

This pack is an initial engineering baseline. It does not claim that any
cloud provider, free tier, model, API, or library remains available at a
particular price or limit. Verify current official documentation before
selecting or deploying services.
