# Project Task Board

Update this board after every work session. Link issues, PRs, commits,
test runs, and decisions.

## Status definitions

-   Backlog
-   Ready
-   In progress
-   Blocked
-   In review
-   Done
-   Deferred

## Milestones

### M0 --- Research and specification

-   [ ] Verify official docs and current versions.
-   [ ] Verify provider data-use and API pricing.
-   [ ] Verify hosting and free-tier constraints.
-   [ ] Review threat model.
-   [ ] Approve architecture decisions.
-   [ ] Create repository and CI skeleton.

### M1 --- Core foundation

-   [ ] Backend project and health endpoints.
-   [ ] Authentication.
-   [ ] Database migrations.
-   [ ] Task CRUD and state machine.
-   [ ] Basic dashboard.
-   [ ] Unit/integration tests.

### M2 --- Orchestration

-   [ ] Durable workflow.
-   [ ] Plan and task-step schema.
-   [ ] Pause/resume/cancel.
-   [ ] Retry and timeout limits.
-   [ ] Mock model provider.
-   [ ] Approval checkpoints.

### M3 --- GitHub

-   [ ] GitHub App registration.
-   [ ] Restricted installation permissions.
-   [ ] Repository selection and verification.
-   [ ] Branch/commit adapter.
-   [ ] PR creation.
-   [ ] Webhook signature validation.

### M4 --- Coding execution

-   [ ] Disposable worker.
-   [ ] Scoped source checkout.
-   [ ] File editing and command tools.
-   [ ] Test execution and evidence.
-   [ ] Resource and network restrictions.
-   [ ] Artifact collection and cleanup.

### M5 --- User interface

-   [ ] Telegram identity allowlist.
-   [ ] Task intake.
-   [ ] Notifications.
-   [ ] Dashboard task timeline.
-   [ ] Approval details and decision.
-   [ ] Mobile usability.

### M6 --- Memory and security

-   [ ] Shared/project memory.
-   [ ] Decision history and conflict handling.
-   [ ] Audit events.
-   [ ] Secret redaction.
-   [ ] Prompt-injection test suite.
-   [ ] Kill switch and credential revocation.
-   [ ] Backup/restore test.

### M7 --- Self-development

-   [ ] Read-only self-analysis.
-   [ ] Isolated self-improvement branch.
-   [ ] Automated tests.
-   [ ] Security review.
-   [ ] Pull request.
-   [ ] Human-approved release process.

## Current state

All items are Backlog until implementation evidence is attached.
Documentation pack is a proposed baseline, not evidence of working
software.
