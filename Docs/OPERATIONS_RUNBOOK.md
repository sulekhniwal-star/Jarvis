# Operations Runbook

## Routine checks

-   API liveness and readiness.
-   Database connectivity and migration status.
-   Queue depth and oldest queued task.
-   Running worker count and timeouts.
-   Provider errors and rate limits.
-   GitHub webhook failures.
-   Telegram delivery failures.
-   Backup completion and restore test status.
-   Free-tier usage and paid-call block state.
-   Security/audit alerts.

## Task stuck

1.  Inspect task state and latest event.
2.  Inspect worker heartbeat and execution logs.
3.  Check provider rate limits and queue state.
4.  Do not create duplicate task unless idempotency is understood.
5.  Retry only within configured limits.
6.  Escalate to owner when blocked.

## Worker failure

1.  Mark execution interrupted.
2.  Preserve logs and approved artifacts.
3.  Confirm workspace cleanup.
4.  Revoke worker capability.
5.  Retry in fresh environment if policy allows.
6.  Report failure honestly.

## Suspected compromise

1.  Trigger kill switch.
2.  Stop dispatch and terminate workers.
3.  Revoke GitHub App installation tokens and provider credentials.
4.  Preserve logs.
5.  Isolate services.
6.  Investigate scope.
7.  Rotate secrets.
8.  Restore known-good release if required.
9.  Obtain owner approval before resuming.

## Database incident

-   Stop privileged writes if integrity uncertain.
-   Preserve current snapshot/logs.
-   Restore to separate environment.
-   Validate migrations and data integrity.
-   Obtain owner approval before cutover.

## Release rollback

-   Stop new task dispatch if release is unsafe.
-   Revert to last known-good immutable artifact.
-   Validate health and database compatibility.
-   Do not roll back schema destructively without a reviewed recovery
    plan.

## Contact and escalation

-   **System owner:** Configured via `TELEGRAM_AUTHORIZED_USER_ID` (High-priority Telegram alerts and authenticated web dashboard).
-   **Cloud database support:** Supabase Platform Support (`supabase.com/dashboard/support`).
-   **Source control support:** GitHub Status (`www.githubstatus.com`).
-   **Incident log location:** Control-plane JSON logs (`/var/log/jarvis/control_plane.jsonl`) and database `audit_events` ledger.
-   **Recovery environment:** Local Docker Compose replica running PostgreSQL 16 on port 5433 with matching Alembic migration head.
