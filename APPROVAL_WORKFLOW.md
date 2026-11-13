# Approval Workflow

## Purpose

Provide explicit human control over actions with financial, external,
destructive, account, security, or production impact.

## Actions requiring approval

-   Any paid API usage or paid service activation.
-   Purchases and subscriptions.
-   Sending email, WhatsApp, or other external messages.
-   Production deployment.
-   Merging protected production branches.
-   Deleting important files, databases, repositories, or accounts.
-   Changing credentials, account settings, or security permissions.
-   Sharing private data externally.
-   Any action outside the pre-authorised task scope.

## Approval request fields

-   Approval ID
-   Requesting task and agent
-   Action type
-   Exact target
-   Canonical parameter payload
-   Expected effect
-   Risks and reversibility
-   Cost estimate and maximum exposure, if relevant
-   Expiry
-   Payload hash
-   Status

## Lifecycle

`requested -> approved/rejected/expired/cancelled -> executed/failed`

## Security rules

1.  Approval occurs in authenticated dashboard.
2.  Show exact action and parameters, not vague summary only.
3.  Bind approval to payload hash.
4.  Revalidate policy immediately before execution.
5.  Approval is single-use and expires.
6.  Any payload change requires a new approval.
7.  Agent cannot approve its own request.
8.  Record approver, time, decision, and execution outcome.
9.  Reject stale or replayed approvals.
10. Telegram may notify and link to approval; dashboard is the
    authoritative approval surface.

## Paid usage

Default state is `disabled`. Approval must specify provider,
model/service, task, maximum spend, currency, and expiry. Enforce limits
in a billing gate; do not rely on model instructions.
