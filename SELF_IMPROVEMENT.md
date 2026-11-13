# Controlled Self-Improvement

## Objective

Allow Jarvis to analyse and propose improvements to its own software
without allowing it to rewrite live production controls or grant itself
authority.

## Protected components

Autonomous workers must not directly modify or deploy: - Authentication
and owner identity. - Permission and policy engine. - Approval
service. - Secret broker. - Kill switch. - Audit integrity controls. -
Production deployment credentials. - Protected branch rules.

Changes to these components require separate human-led review and
security testing.

## Self-improvement workflow

1.  Read-only analysis of current repository.
2.  Identify issue and evidence.
3.  Propose a change and expected benefit.
4.  Create isolated branch/workspace.
5.  Implement change.
6.  Run full tests and security checks.
7.  Review diff and dependency changes.
8.  Generate risk report.
9.  Open PR.
10. Wait for owner review.
11. Merge/release only through protected process.
12. Verify deployment and retain rollback path.

## Prohibited behavior

-   Editing production files directly.
-   Disabling tests to achieve green CI.
-   Weakening approval or security rules.
-   Creating new credentials or permissions.
-   Hiding failed tests or logs.
-   Self-approving changes.
-   Deploying without approval.

## Evaluation

Measure whether self-generated changes: - Solve a real issue. - Preserve
existing behavior. - Add adequate tests. - Avoid privilege expansion. -
Improve reliability or maintainability. - Include rollback notes.
