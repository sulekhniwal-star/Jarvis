# Deployment Guide

## Deployment philosophy

Start with the smallest architecture that satisfies durable task
coordination and secure execution. Do not force long-running agent work
into a serverless platform with short execution limits.

## Environments

-   Local development
-   CI/test
-   Staging
-   Production (only after explicit owner approval)

Each environment has separate credentials, database, bot configuration,
and GitHub installation where practical.

## Local development

-   Windows 11 host.
-   Docker Desktop for local development only.
-   Python virtual environment.
-   Node.js runtime for dashboard.
-   PostgreSQL local container or approved managed development database.
-   `.env.example` committed; real `.env` ignored.
-   Never copy production secrets into local development.

## Cloud deployment decision checklist

Before selecting a provider, verify: - Current free-tier limits and
sleep/idle behavior. - Region availability and data location. -
Background worker and execution duration support. - Persistent storage
and backup support. - Network egress and private networking. -
Authentication and secret management. - Logging/monitoring limits. -
Pricing after free quota. - Terms governing source-code and AI data.

## Worker deployment

-   Prefer disposable hosted runners (GitHub Actions) or isolated VMs for untrusted code.
-   Never expose cloud control-plane credentials or database connection strings.
-   Do not mount Docker socket into worker.
-   Use resource and execution limits (max 2 GB RAM, 1.5 CPU, 10 min timeout).
-   Enforce two-phase network isolation:
    - *Phase 1 (Hydration):* Outbound network restricted strictly to vetted package registries (`pypi.org`, `registry.npmjs.org`) for dependency installation.
    - *Phase 2 (Testing & Execution):* Outbound network completely disabled (`--network=none`).
-   Destroy workspace after artifact collection.
-   Record image digest and environment metadata.

## Cloud database keep-alive automation

To prevent Supabase Free Tier databases from pausing after 7 days of inactivity, deploy an automated weekly GitHub Actions workflow (`.github/workflows/db-keepalive.yml`):
- Schedule: Sundays at 00:00 UTC (`0 0 * * 0`).
- Action: Executes a lightweight query (`SELECT 1;`) via direct connection or Supabase REST API using encrypted repository secrets.

## Release process

1.  Merge approved change to protected release branch.
2.  CI tests and security checks pass.
3.  Build immutable artifact.
4.  Deploy to staging.
5.  Run smoke and migration checks.
6.  Obtain owner approval.
7.  Deploy production.
8.  Verify health and logs.
9.  Roll back if checks fail.

No production deployment in MVP without human approval.
