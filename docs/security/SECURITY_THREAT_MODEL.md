# Security Threat Model: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** DevSecOps Engineer & Principal Security Architect  
**Date:** November 14, 2026  

---

## 1. Security Philosophy & Threat Profile

Jarvis is an autonomous AI agent capable of writing, modifying, and executing arbitrary code. Consequently, the threat surface includes not only standard web application attack vectors, but also **prompt injection**, **code supply-chain contamination**, **sandbox escape**, **credential exfiltration**, and **financial depletion attacks**.

### Zero-Trust Tenet
*All input received from external channels—including GitHub issues, pull request comments, web scrape targets, and even AI-generated code itself—is treated as hostile and untrusted.*

---

## 2. STRIDE Threat Analysis

| Threat Category (STRIDE) | Attack Vector / Scenario | Potential Impact | Mitigations & Architectural Controls |
|---|---|---|---|
| **Spoofing Identity** | Attacker sends fake webhook requests pretending to be Telegram or GitHub. | Unauthorized task creation, malicious code execution. | 1. Telegram webhooks validated via `X-Telegram-Bot-Api-Secret-Token` using constant-time comparison.<br/>2. GitHub webhooks validated via HMAC-SHA256 signature verification (`X-Hub-Signature-256`). |
| **Tampering with Data** | Prompt injection inside a GitHub issue title/body instructs Aider to read `.env` and curl it out. | Sensitive secret theft, repo backdoor injection. | 1. Prompt sanitization and prompt-delimitation.<br/>2. Ephemeral runners never possess master credentials.<br/>3. Aider executed in locked-down container with egress filtering. |
| **Repudiation** | An unauthorized destructive action is executed without an audit trail. | Inability to determine who triggered or approved an action. | 1. Immutable audit logs in `audit_logs` table (`REVOKE UPDATE, DELETE`).<br/>2. Every state change cryptographically linked to authenticated user or runner token. |
| **Information Disclosure** | An agent run prints Supabase service-role key or OpenRouter master key in logs or PR description. | Complete system compromise, unauthorized database access. | 1. Strict credential segregation: master keys NEVER injected into runners.<br/>2. Secret scrubbing filter runs on runner logs before storage or transmission. |
| **Denial of Service / Financial DoS** | Malicious loop or spam task floods OpenRouter API calls, exhausting user funds. | Runaway financial liability, quota starvation. | 1. Central Budget Manager enforces hard stop at INR 25/day and INR 750/month.<br/>2. Default to free models (`:free`).<br/>3. Paid models blocked unless explicitly approved. |
| **Elevation of Privilege** | Agent modifies `.github/workflows/` to grant itself write access to production branch. | Production branch overwrite, malicious release deployment. | 1. GitHub branch protection rules on `main`.<br/>2. Runner token restricted to single repository and task branch.<br/>3. Path blacklist forbids agent from touching `.github/workflows/**`. |

---

## 3. Credential Hierarchy & Isolation Boundaries

```
[ Tier 1: Master Secrets - NEVER Exposed ]
  ├── Supabase Service-Role Key (Stored in Vercel / Supabase Vault)
  ├── GitHub App Private Key (Stored in Vercel Secret Store)
  ├── OpenRouter Master API Key (Stored in Vercel Secret Store)
  └── Telegram Bot Master Token (Stored in Vercel Secret Store)
            │
            ▼ (Orchestrator generates task-scoped ephemeral credentials)
[ Tier 2: Task-Scoped Ephemeral Credentials - TTL: 60 mins ]
  ├── GitHub App Installation Token (ghs_... scoped to 1 repository, 1 branch)
  ├── Runner HMAC Callback Token (Restricted strictly to task report endpoint)
  └── OpenRouter Free/Capped Sub-Key (Optional rate-limited proxy key)
            │
            ▼ (Injected into Ephemeral Runner VM)
[ Tier 3: Untrusted Sandbox Environment (Docker inside GitHub Runner) ]
  └── Zero access to master secrets; file writes restricted to workspace.
```

---

## 4. Emergency Kill Switch Architecture

Jarvis implements a hardware-level and software-level Emergency Kill Switch:

1. **Trigger Channels:**
   - **Telegram:** Command `/kill` or `/emergency_stop`.
   - **Web Dashboard:** Big Red Button in the dashboard header.
2. **Immediate Execution Actions:**
   - The orchestrator issues immediate cancellation to all active GitHub Actions runs via `POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel`.
   - All short-lived runner HMAC tokens and GitHub App installation tokens are immediately revoked.
   - All tasks with status `RUNNING` or `DISPATCHED` are transitioned to `EMERGENCY_ABORTED`.
   - Outbound HTTP proxy to AI models is set to drop all traffic.
   - An alert is broadcast to Telegram and recorded in `audit_logs` with severity `CRITICAL`.
