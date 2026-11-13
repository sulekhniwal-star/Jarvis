# MVP Acceptance Checklist

A release candidate must satisfy every applicable item.

## User experience

-   [ ] Owner can authenticate.
-   [ ] Owner can submit a coding task.
-   [ ] Owner can select an authorised repository.
-   [ ] Owner can see plan, status, and task history.
-   [ ] Owner receives Telegram completion/failure notifications.
-   [ ] Dashboard works on a mobile browser.

## Coding workflow

-   [ ] Task is persisted before execution.
-   [ ] Worker receives only scoped repository access.
-   [ ] Worker runs in disposable isolation.
-   [ ] Worker records commands and exit codes.
-   [ ] Tests are actually executed.
-   [ ] Failed tests are reported as failed.
-   [ ] Diff is checked for scope creep and secrets.
-   [ ] PR is created in the correct repository.
-   [ ] Worker environment is cleaned up.

## Security

-   [ ] Unauthorised Telegram identity is rejected.
-   [ ] Unauthenticated API access is rejected.
-   [ ] Worker cannot access control-plane secrets.
-   [ ] Worker cannot access unrelated repositories.
-   [ ] Approval payload cannot be altered or replayed.
-   [ ] Agent cannot approve its own request.
-   [ ] Paid calls are blocked by default.
-   [ ] Kill switch prevents new jobs and stops active work.
-   [ ] Audit records exist for privileged actions.
-   [ ] Prompt-injection scenarios are tested.

## Reliability

-   [ ] Task survives coordinator restart.
-   [ ] Duplicate intake is idempotent.
-   [ ] Retry/time/resource limits work.
-   [ ] Backup restoration is demonstrated.
-   [ ] Failed integrations produce actionable errors.

## Release governance

-   [ ] Known limitations documented.
-   [ ] Security review completed.
-   [ ] Owner reviewed PR.
-   [ ] Production deployment requires separate approval.
