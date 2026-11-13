# Product Requirements Document (PRD)

## 1. Problem

AI-assisted development often requires the user to remain present,
manually coordinate tools, inspect logs, and manage handoffs. Jarvis
aims to turn a well-scoped request into an independently executed,
reviewable coding workflow.

## 2. Users

-   Primary: one owner/developer using a phone and Windows 11 computer.
-   Secondary: no multi-tenant or public-user support in MVP unless
    explicitly approved later.

## 3. Constraints

-   16 GB RAM, Intel Core i5, Windows 11 personal computer.
-   Personal computer is not assumed to run 24/7.
-   Cloud-coordinated/hybrid deployment.
-   25+ hours/week available for initial development.
-   Free-first, no paid API or service activation without explicit
    approval.
-   Existing Gemini consumer subscription does not imply API
    entitlement.
-   Multiple AI providers may be added through adapters.

## 4. MVP user stories

### Task intake

-   As the owner, I can submit a task through Telegram or dashboard.
-   I can select an authorised repository and define scope.
-   I can set task priority and optionally add acceptance criteria.
-   I can pause, resume, or cancel a task.

### Planning and execution

-   Jarvis creates a visible plan before execution.
-   Jarvis checks the task's permissions and limits.
-   Jarvis creates an isolated worker and scoped branch.
-   Jarvis can inspect files, edit code, and run approved commands
    inside the worker.
-   Jarvis records every command and result.
-   Jarvis stops after configured retry/time/resource limits.

### Delivery

-   Jarvis reports changed files, tests run, failures, limitations,
    commit, and PR.
-   Jarvis does not claim tests passed without recorded successful
    output.
-   Merge and deployment remain human-controlled.

### Memory

-   Jarvis can retain project facts, preferences, and decisions.
-   Project memory is isolated by project; approved general preferences
    may be shared.
-   History is preserved; latest active decisions are clearly
    identified.
-   Secrets are excluded.

### Control and safety

-   Sensitive actions require approval through an authenticated
    dashboard.
-   Approval is bound to an exact action and parameter set.
-   The owner can stop all workers and revoke credentials.
-   Audit events are queryable.

## 5. Functional requirements

-   FR-01 Authentication and owner identity.
-   FR-02 Task create/read/update/cancel.
-   FR-03 Durable workflow state and recovery.
-   FR-04 Planning and task-step tracking.
-   FR-05 AI provider adapter and mock provider.
-   FR-06 GitHub App repository access.
-   FR-07 Isolated coding execution.
-   FR-08 Command allowlist/denylist and resource limits.
-   FR-09 Test execution and evidence capture.
-   FR-10 Pull request creation.
-   FR-11 Telegram notifications and task intake.
-   FR-12 Dashboard task and project views.
-   FR-13 Project/shared memory.
-   FR-14 Approval requests and decisions.
-   FR-15 Audit logging.
-   FR-16 Emergency stop and token revocation.
-   FR-17 Usage/cost tracking and paid-call block.
-   FR-18 Backup and restore.

## 6. Non-functional requirements

-   Security: least privilege, secrets isolation, authenticated
    approvals.
-   Reliability: durable state, idempotent task operations, bounded
    retries.
-   Observability: structured logs, trace/task IDs, command evidence.
-   Maintainability: modular services, typed interfaces, migrations,
    tests.
-   Portability: avoid unnecessary dependence on one model provider or
    cloud.
-   Accessibility: usable on a mobile browser.
-   Performance: define measurable targets after baseline load testing;
    do not invent capacity claims.

## 7. MVP acceptance criteria

1.  Unauthenticated users cannot access dashboard or task APIs.
2.  Telegram intake accepts only the configured owner identity.
3.  A task survives service restart and resumes or is marked recoverably
    interrupted.
4.  A worker can only access the selected repository and assigned
    branch.
5.  Worker has no production secrets or control-plane credentials.
6.  Tests and command output are stored against the task.
7.  Pull request is created only in the authorised repository.
8.  Paid model calls are disabled unless an explicit, recorded approval
    enables a defined limit.
9.  Sensitive action approval cannot be forged, replayed, or approved by
    an agent.
10. Kill switch prevents new jobs and stops/revokes active execution as
    designed.
11. Backup restore is demonstrated in a separate environment.
12. All known limitations are reported.

## 8. Out of scope

Voice, idea research automation, job applications, message sending,
personal finance, production deployment, and broad personal computer
automation are Version 2/3 candidates.
