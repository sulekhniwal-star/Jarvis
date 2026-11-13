# Roadmap

## Planning assumptions

-   Owner availability: 25+ hours/week.
-   Initial target: approximately 8 weeks for an MVP candidate.
-   This is a planning estimate, not a delivery guarantee. Security,
    integration, and free-tier constraints may extend milestones.
-   No paid service may be activated without explicit owner approval.

## Phase 0 --- Research and architecture (Week 1)

**Goals** - Verify current framework versions, provider terms, hosting
limits, and worker isolation options. - Review PRD, architecture,
database model, threat model, and permission matrix. - Create
repository, issue labels, branch protection proposal, and CI skeleton.

**Exit criteria** - Architecture decisions reviewed. - Threat model and
permission boundaries reviewed. - Technology and hosting choices
supported by dated research. - No implementation dependency relies on an
unverified free-tier assumption.

## Phase 1 --- Core foundation (Week 2)

**Goals** - Backend service, authentication, database migrations, task
CRUD, state machine, minimal dashboard.

**Exit criteria** - Owner can create, view, update, and cancel tasks. -
Auth and authorization tests pass. - Task state transitions are
server-validated.

## Phase 2 --- Durable orchestration (Week 3)

**Goals** - Workflow engine, structured plans, persistent checkpoints,
pause/resume/cancel, bounded retry and timeouts. - Mock AI provider and
deterministic test workflows.

**Exit criteria** - A multi-step workflow survives service restart. -
Duplicate task intake is handled idempotently. - Retry and timeout caps
are enforced.

## Phase 3 --- GitHub integration (Week 4)

**Goals** - GitHub App, repository allowlist, short-lived installation
tokens, branch/commit/PR adapter, webhook verification.

**Exit criteria** - Test integration accesses only the selected
repository. - Branch and PR creation are verified. - No personal
account-wide token is required by the worker.

## Phase 4 --- Isolated coding execution (Week 5)

**Goals** - Disposable worker, scoped checkout, file editing, command
execution, test capture, artifact collection, cleanup.

**Exit criteria** - Demo coding task completes in isolation. - Worker
cannot access control-plane secrets or unrelated repositories. - Test
evidence and exit codes are stored.

## Phase 5 --- Phone interface and review (Week 6)

**Goals** - Telegram allowlist and task intake. - Dashboard timeline,
logs, PR review links, approval screens, notifications.

**Exit criteria** - Owner can submit and monitor a task from a phone. -
Sensitive actions cannot be approved through an unauthenticated or
replayed request.

## Phase 6 --- Memory, security, and recovery (Week 7)

**Goals** - Shared and project memory, decision history, audit events,
secret redaction, prompt-injection tests, kill switch, backup and
restore.

**Exit criteria** - Security test cases pass or have documented
blockers. - Kill switch stops new work and terminates/revokes active
worker capabilities. - Restore from backup is demonstrated.

## Phase 7 --- Supervised self-development and MVP release (Week 8)

**Goals** - Jarvis analyses its own repository in read-only mode. - It
proposes a small improvement, implements it in an isolated branch, runs
tests, and opens a PR. - Owner reviews the PR and release process.

**Exit criteria** - Self-improvement does not modify live production. -
Protected components remain protected. - MVP acceptance checklist is
complete or remaining gaps are explicitly documented.

## Later versions

### Version 2

-   Weekly project-idea research and scoring.
-   Specialist research agents.
-   Voice interface.
-   More advanced memory retrieval and evaluation.
-   Additional integrations.

### Version 3

-   Job-application preparation.
-   Message and email drafting.
-   Calendar and reminders.
-   Broader personal workflows with explicit approval for external
    actions.

## Replanning rule

At the end of each week, compare actual results with exit criteria.
Re-estimate remaining work based on observed integration and security
complexity. Do not skip tests to preserve the calendar.
