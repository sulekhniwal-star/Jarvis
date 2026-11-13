# Architecture Decision Log

Use one entry per important decision. Do not overwrite history;
supersede previous decisions.

## ADR template

### ADR-\[number\]: \[Title\]

-   Status: Proposed / Accepted / Rejected / Superseded
-   Date:
-   Context:
-   Decision:
-   Alternatives:
-   Consequences:
-   Security impact:
-   Cost impact:
-   Verification evidence:
-   Supersedes:

## Initial proposed decisions

### ADR-001: Coding-first product scope

-   Status: Proposed
-   Decision: Deliver autonomous coding workflow before
    personal-assistant features.
-   Reason: Highest-priority user outcome and best validation of core
    platform.

### ADR-002: Separate control and execution planes

-   Status: Proposed
-   Decision: Trusted coordinator and policy services remain separate
    from disposable coding workers.
-   Reason: Limit impact of malicious code and model mistakes.

### ADR-003: Human authority for consequential actions

-   Status: Proposed
-   Decision: External communications, spending, production deployment,
    destructive actions, and account/security changes require explicit
    owner approval.
-   Reason: Preserve owner control.

### ADR-004: Provider-independent AI gateway

-   Status: Proposed
-   Decision: All model calls go through internal provider adapters.
-   Reason: Avoid provider lock-in and support free/local alternatives.

### ADR-005: Free-first and paid-call block

-   Status: Proposed
-   Decision: Paid usage disabled unless a scoped approval grant exists.
-   Reason: Owner explicitly prohibits automatic spending.

### ADR-006: Progressive self-development

-   Status: Proposed
-   Decision: Self-improvement occurs in isolated branches and
    environments; production changes require review and release
    approval.
-   Reason: Prevent self-modification from bypassing safety boundaries.

### ADR-007: Telegram plus web dashboard

-   Status: Proposed
-   Decision: Telegram for task intake/notifications; dashboard for
    detailed control and approvals.
-   Reason: Matches owner interface preference.

## Rule

An IDE or agent may propose an ADR but cannot mark consequential
architecture/security decisions Accepted without owner review.
