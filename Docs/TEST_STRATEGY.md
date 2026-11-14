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

## Required end-to-end scenario & synthetic fixture

The end-to-end integration and release gate requires execution against the standardized synthetic test repository (`jarvis-demo-target`):
-   **Repository profile:** Python 3.12 library with `pyproject.toml` and `pytest`.
-   **Baseline defect:** A failing assertion in `tests/test_calculator.py` with clear error output (`AssertionError: 2 != 3`).
-   **Acceptance execution:**
    1.  Owner submits task to fix the failing test.
    2.  System creates durable task and plan.
    3.  Worker receives only the `jarvis-demo-target` scoped installation token.
    4.  Worker inspects AST symbols, identifies defect in `calculator.py`, and applies code patch.
    5.  `pytest` executes inside isolated sandbox; exit code `0` and test logs captured.
    6.  GitHub branch `jarvis/fix-calc-...` pushed and Pull Request opened.
    7.  Dashboard and Telegram report completion with PR link and test evidence badge.
    8.  Owner can inspect diff and logs.
    9.  No merge/deploy occurs.

## Release gate

No milestone is complete until acceptance tests pass, known failures are
documented, and evidence is linked from `TASK_BOARD.md`.
