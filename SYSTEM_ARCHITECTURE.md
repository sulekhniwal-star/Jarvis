# System Architecture

## 1. Proposed logical architecture

### Control plane

Trusted services that manage identity, tasks, policy, approvals,
workflow state, and audit events: - API/authentication service - Task
service - Workflow orchestrator - Policy/permission service - Approval
service - Notification service - Memory service - AI gateway -
Audit/usage service

### Execution plane

Untrusted or lower-trust workers that perform repository tasks: -
Disposable coding worker - Test runner - Optional research/browser
worker - Artifact collector

The execution plane must not have direct access to control-plane secrets
or databases. It receives narrow, expiring job capabilities and returns
outputs through a constrained interface.

## 2. Request flow

1.  Owner submits task through dashboard or Telegram.
2.  Identity layer authenticates the owner.
3.  Task service validates request and creates a durable task record.
4.  Orchestrator creates a plan and records task steps.
5.  Policy service checks repository, tools, resource limits, and
    allowed actions.
6.  Worker is provisioned with scoped repository access.
7.  Worker researches, edits, and tests within isolation.
8.  Worker returns patch, logs, test reports, and metadata.
9.  Control plane validates artifacts and asks GitHub integration to
    create branch/PR.
10. Notification service reports outcome.
11. Owner reviews PR; merge/deploy are separate human-controlled
    actions.

## 3. Trust boundaries

-   Browser/Telegram to API: untrusted network.
-   AI model to tools: untrusted proposal channel.
-   Web/repository/document content to agent: untrusted data.
-   Control plane to worker: constrained job boundary.
-   Worker to GitHub: short-lived repository-scoped capability.
-   Approval UI to approval service: authenticated owner action.

## 4. Design rules

-   Never let model output directly execute privileged actions.
-   Every tool call is validated by deterministic policy code.
-   Use idempotency keys for task creation, webhook handling, and
    approval processing.
-   Use an outbox or durable event pattern for notifications and
    background jobs.
-   Store workflow checkpoints and execution records.
-   Separate model conversation context from durable project memory.
-   Keep worker filesystem ephemeral; persist only approved artifacts.
-   Enforce network egress policy for workers.
-   Keep production deployment outside MVP worker permissions.

## 5. Failure handling

-   Worker crash: mark attempt interrupted; retain logs/artifacts; allow
    bounded retry.
-   Provider timeout: retry with backoff within limits; record provider
    failure.
-   Rate limit: pause/requeue rather than loop.
-   Approval timeout: expire request and leave task waiting.
-   GitHub API failure: retry idempotently; do not duplicate PRs.
-   Database unavailable: fail closed for privileged operations.

## 6. Deployment topology

Initial candidate: - Managed API/web hosting or one small coordinator
service, subject to current free-tier verification. - Managed PostgreSQL
or self-hosted PostgreSQL. - GitHub Actions for bounded jobs, with
limits and runner security reviewed. - Disposable worker environment. -
Telegram webhook or polling service. - Object/artifact storage only if
required and cost-approved.

Do not assume free serverless hosting supports durable long-running
workers. The architecture must tolerate job execution limits and resume
work across separate runs.

## 7. Scaling path

MVP: one owner, low concurrency, queued jobs. Later: dedicated worker
pool, stronger sandbox runtime, separate queue, observability stack, and
optional paid VPS after approval.
