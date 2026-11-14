# GitHub Integration Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend Engineer & DevSecOps Lead  
**Date:** November 14, 2026  

---

## 1. Authentication Architecture: GitHub App

Jarvis integrates with GitHub exclusively through a dedicated **GitHub App** rather than personal access tokens (PATs). This ensures:
1. **Granular, Least-Privilege Scoping:** Permissions are granted per repository, not across the entire user account.
2. **Short-Lived Installation Access Tokens:** Generates temporary tokens (`ghs_...`) that automatically expire after 60 minutes.
3. **No Direct Production Commits:** Branch protection policies on default branches (`main`, `master`) are respected.

### JWT Generation & Installation Token Issuance
```
[ Jarvis Control Plane ]
       │
       ▼ Signs RS256 JWT using GitHub App Private Key (10 min TTL)
POST https://api.github.com/app/installations/{installation_id}/access_tokens
       │
       ▼ Returns Installation Access Token (ghs_..., 60 min TTL)
Scoped specifically to target repository: ["owner/target-repo"]
```

---

## 2. GitHub App Permissions Matrix

| Scope | Permission Level | Rationale |
|---|---|---|
| `Repository contents` | Read & Write | Creating task branches (`jarvis/*`), committing code changes |
| `Pull requests` | Read & Write | Opening PRs, adding review summaries, responding to feedback |
| `Issues` | Read & Write | Ingesting software tasks from issues, posting status comments |
| `Workflows / Actions` | Read & Write | Triggering `workflow_dispatch` on coding agent runner workflows |
| `Metadata` | Read-only | Mandatory default for GitHub Apps |
| `Administration` | **NO ACCESS** | Jarvis cannot change repository settings or disable branch protections |

---

## 3. Task Branching & PR Workflow

1. **Branch Isolation:**
   - Every task branches from the latest verified commit of `main`.
   - Branch naming convention: `jarvis/task-{slug}-{short_uuid}`.
   - Pushes directly to `main` are strictly blocked by both GitHub branch rules and Jarvis software guardrails.
2. **Automated Pull Request Delivery:**
   - When tests pass, Jarvis submits a Pull Request:
     - **Title:** `feat(core): [Task #42] Implement Redis Cache Layer`
     - **Body:**
       - **Problem Solved:** Concise summary of user story.
       - **Implementation Details:** Key architectural changes and files touched.
       - **Test Evidence:** Summary of executed tests (passed/failed), duration, and coverage.
       - **Telemetry & Cost:** Token count (prompt + completion) and cost in INR/USD.
       - **Review Request:** Tagging human operator for merge approval.
3. **Webhook Processing:**
   - Webhooks at `POST /api/webhooks/github` are authenticated via HMAC-SHA256 signatures (`X-Hub-Signature-256`).
   - Monitored events: `issues.opened`, `pull_request.closed`, `workflow_run.completed`.
