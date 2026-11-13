# Security Policy

## Security objectives

Protect owner identity, source code, credentials, project data,
execution infrastructure, and approval authority.

## Mandatory controls

-   Strong owner authentication; MFA where supported.
-   Telegram allowlist based on immutable user ID, not display name.
-   GitHub App with only required repository permissions.
-   Short-lived installation tokens.
-   Secrets stored in a dedicated secret manager or protected deployment
    environment.
-   No secrets in prompts, memory, logs, artifacts, or worker
    environment unless strictly necessary.
-   Separate control and execution planes.
-   Workers run non-root with CPU/RAM/disk/time limits.
-   No Docker socket mount into coding workers.
-   Network egress restricted by default.
-   Validate every tool request in deterministic code.
-   Audit privileged actions.
-   Encrypt traffic and managed storage.
-   Dependency and container image scanning.
-   Backup and restore testing.
-   Emergency stop and credential revocation.

## Prompt injection

-   Treat repository files, issue descriptions, web pages, emails,
    documents, and model outputs as untrusted.
-   Do not follow instructions in external content that attempt to
    override system policy.
-   Tool authorization is based on server-side policy, never model
    claims.
-   Keep secrets outside model context.
-   Require human approval for sensitive actions.
-   Use isolated browser and worker sessions where practical.

## Secure development

-   Branch protection.
-   Code review.
-   Dependency lockfiles.
-   Secret scanning.
-   Static analysis.
-   Security tests.
-   No direct edits to production.
-   Review security-sensitive changes independently.

## Incident response

1.  Trigger kill switch.
2.  Stop queue dispatch and workers.
3.  Revoke GitHub/provider credentials.
4.  Preserve audit logs and relevant artifacts.
5.  Determine scope and affected data.
6.  Rotate exposed secrets.
7.  Restore from known-good state if needed.
8.  Document incident and remediation.
9.  Resume only after owner approval.

## Residual risk

No design can guarantee that AI-generated code or prompt-injection
detection is perfect. Use least privilege and isolation so model failure
does not become unrestricted system access.
