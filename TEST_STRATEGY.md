# Test Strategy

## Test layers

1.  Unit tests: domain logic, state transitions, policy checks, schema
    validation.
2.  Integration tests: database, queue, GitHub adapter, Telegram
    adapter, provider adapter.
3.  End-to-end tests: user task intake through PR notification.
4.  Security tests: auth bypass, permission escalation, prompt
    injection, secret leakage, sandbox boundaries.
5.  Recovery tests: process restart, interrupted job, database backup
    restore.
6.  Operational tests: rate limits, timeouts, queue saturation, kill
    switch.

## CI requirements

-   Lint and formatting.
-   Type checks.
-   Unit and integration tests.
-   Dependency audit.
-   Secret scanning.
-   Container/image scanning where available.
-   Build verification.
-   Migration validation.

## AI tests

Use deterministic mock providers for most CI tests. Add evaluation cases
for: - Planning completeness. - Correct tool selection. - Accurate
reporting of failed tests. - Refusal to follow untrusted instructions. -
No secrets in generated output. - Correct escalation to approval. -
Bounded retry behavior.

AI output tests should use assertions on structured behavior, not
brittle exact wording.

## Required end-to-end scenario

1.  Owner submits task for a designated demo repository.
2.  System creates durable task and plan.
3.  Worker receives only the demo repository capability.
4.  Worker changes a simple feature.
5.  Tests run and evidence is captured.
6.  GitHub branch and PR are created.
7.  Dashboard and Telegram report completion.
8.  Owner can inspect diff and logs.
9.  No merge/deploy occurs.

## Release gate

No milestone is complete until acceptance tests pass, known failures are
documented, and evidence is linked from `TASK_BOARD.md`.
