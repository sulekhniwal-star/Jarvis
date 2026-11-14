# Cost Control and Free-First Policy

## Owner policy

-   Automatic spending: prohibited.
-   Paid API calls: disabled by default.
-   Paid hosting/service activation: requires explicit owner approval.
-   Target budget is a planning ceiling, not spending authority.
-   Existing Gemini consumer subscription does not imply API credits.

## Cost categories

-   Model API requests and tokens.
-   Cloud coordinator/compute.
-   GitHub Actions minutes and storage.
-   Database and backups.
-   Artifact/object storage.
-   Network egress.
-   Domain and email services.
-   Monitoring/log retention.

## Controls

-   Track provider, model, token usage, task, and estimated cost.
-   Distinguish free-tier requests from billable requests.
-   Hard-block paid requests unless a valid approval grant exists.
-   Approval grant must specify provider, model/service, task, maximum
    amount, currency, and expiry.
-   Stop or pause when quotas are reached.
-   Set per-task request, token, time, and retry limits.
-   Alert owner before free-tier quota exhaustion where usage data is
    available.
-   Never silently fall back from free to paid.

## Free-tier verification

Before relying on a free service, record: - Official pricing URL. -
Verification date. - Region and eligibility. - Monthly quota. -
Sleep/idle behavior. - Data-use terms. - Overage behavior. - Whether
payment method is required. - What happens at quota exhaustion.

Recheck at deployment and periodically. Do not hardcode remembered
pricing as fact.

## Approval request format

Service, purpose, alternatives, monthly and one-time cost, quota, data
handling, cancellation method, and expected benefit.
