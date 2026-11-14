# Risks & Issues Register: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend & DevSecOps Lead  
**Date:** November 14, 2026  

---

## 1. Risk Management Framework

Jarvis actively manages technical, financial, security, operational, and vendor risks. Each identified risk is assigned a severity score based on Probability (1-5) and Impact (1-5), with clear mitigation controls and pre-planned contingencies.

---

## 2. Active Risk Register

| Risk ID | Category | Description | Prob (1-5) | Impact (1-5) | Severity (PxI) | Mitigation Strategy | Contingency Plan |
|---|---|---|---|---|---|---|---|
| **RSK-01** | Financial | Runaway API cost caused by runaway retry loop calling paid LLM. | 2 | 5 | 10 (HIGH) | Hard stop enforced by `BudgetManager` pre-flight check at INR 25/day; paid models require explicit human approval. | Kill Switch triggers automatically if 3 consecutive failures occur. |
| **RSK-02** | Security | Prompt injection via untrusted GitHub issue instructs coding agent to exfiltrate secrets. | 3 | 5 | 15 (CRITICAL) | Runners are ephemeral VMs running Docker; master secrets (Supabase, GitHub, OpenRouter) are NEVER injected into runners. | Ephemeral runner VM terminated after 60 mins; short-lived tokens expire automatically. |
| **RSK-03** | Vendor / AI | OpenRouter free-tier models experience high latency or sudden deprecation. | 4 | 2 | 8 (MEDIUM) | Dynamic model discovery endpoint (`/api/v1/models`) queries live catalog; fallback to `openrouter/free` auto-router. | Notify user on Telegram; offer 1-click approval for low-cost paid alternative (e.g. DeepSeek V3). |
| **RSK-04** | Security | Malicious code modifies `.github/workflows/` to seize repository write permissions. | 2 | 5 | 10 (HIGH) | Path blacklist prohibits Aider from touching workflow files; GitHub branch protection rules require human PR review. | PR blocked by GitHub branch protection rules; alert dispatched to Telegram. |
| **RSK-05** | Platform | Managed Supabase free-tier project paused due to inactivity or exceeds quota limits. | 2 | 4 | 8 (MEDIUM) | Versioned migrations in `supabase/migrations/`; zero proprietary lock-in. | Rapid migration to self-hosted Docker Compose Supabase stack using documented backup dump. |
| **RSK-06** | Operational | Telegram Bot webhook abused or bombarded with unauthorized spam requests. | 3 | 3 | 9 (MEDIUM) | Constant-time HMAC comparison on `X-Telegram-Bot-Api-Secret-Token`; strict user ID whitelisting (`ADMIN_TELEGRAM_CHAT_ID`). | Drop unauthenticated updates immediately with 401 Unauthorized; zero database write. |

---

## 3. Active Issues Log

| Issue ID | Date Reported | Severity | Description | Current Status | Resolution Plan |
|---|---|---|---|---|---|
| **ISS-01** | 2026-11-14 | Low | Supabase CLI requires Docker Desktop to execute local migrations. | Mitigated | Verify Docker Desktop engine status during Milestone 1 local initialization. |
| **ISS-02** | 2026-11-14 | Low | Windows AppContainer sandbox restricts direct `.git` file locks if not running in proper IL context. | Resolved | File creation and repository branch verified on `feat-milestone-0-architecture-and-governance`. |
