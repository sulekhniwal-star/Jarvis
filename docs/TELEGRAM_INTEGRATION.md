# JARVIS — Telegram Bot Gateway & Mobile Interface

**Document:** `docs/TELEGRAM_INTEGRATION.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Gateway Purpose & Philosophy

The Telegram Bot Gateway provides the primary mobile interface for Jarvis. It allows the owner to:
1. Submit natural-language coding tasks from anywhere without opening the web dashboard.
2. Receive immediate alerts when tasks complete, tests fail, or budgets reach warning thresholds.
3. Review and approve/reject sensitive actions (such as git pushes or paid model usage) with one-click inline buttons.
4. Monitor running tasks, agent statuses, and financial consumption.

---

## 2. Security & Authentication Architecture

Telegram messages originate outside the secure application perimeter. Therefore, strict authentication is enforced:
1. **Single Owner Lockdown (`OWNER_TELEGRAM_ID`):**
   - Every incoming update is checked against the configured owner numeric ID:
     ```typescript
     if (ctx.from.id.toString() !== process.env.OWNER_TELEGRAM_ID) {
       console.warn(`Unauthorized Telegram access attempt from ID: ${ctx.from.id}`);
       return; // Silently drop or return 403 Forbidden
     }
     ```
   - No data, project names, or error messages are returned to unauthorized Telegram users.
2. **Webhook Token Verification:**
   - In production, updates are received via HTTPS webhook with secret token header `X-Telegram-Bot-Api-Secret-Token`.
3. **Local Polling vs Cloud Webhook:**
   - **Local Development:** Long polling mode enabled via `getUpdates` to allow local testing behind NAT without public IP.
   - **Cloud Production:** HTTPS webhook registered with Telegram servers.

---

## 3. Interactive Approval Cards

When an approval request is generated, Jarvis delivers an interactive Telegram card formatted with MarkdownV2 and inline buttons:

```text
🚨 APPROVAL REQUIRED: Remote Git Push

Project: Jarvis (main)
Action: Push commit to origin/main
Commit: a1b2c3d — feat(api): add health check
Files Changed: 2 files (+45, -2)
Test Proof: 14/14 tests passed (vitest)
Risk Level: Low

Do you authorize pushing this commit to GitHub main?
[ ✅ Approve Push ]   [ ❌ Reject / Keep Local ]
```

### Callback Handling:
- Clicking `[ Approve Push ]` sends a callback query containing the approval UUID.
- The webhook handler validates that the callback originates from `OWNER_TELEGRAM_ID`.
- Upon successful execution, the message is updated in-place:
  ```text
  ✅ APPROVED & PUSHED by Owner at 17:35 UTC.
  Commit a1b2c3d is live on origin/main.
  ```

---

## 4. Supported Command Set

| Command | Description | Response / Behavior |
|---|---|---|
| `/start` | Verify bot connection | Returns system status and connection confirmation. |
| `/status` | Active runs & state | Lists in-progress tasks, active runners, and pending approvals. |
| `/budget` | Financial overview | Displays today's spend, monthly spend, and remaining quota in INR. |
| `/projects` | Active projects | Lists tracked repositories and recent commits. |
| `/approve <id>`| CLI approval | Manually approves a pending approval request. |
| `/reject <id>` | CLI rejection | Manually rejects a pending approval request. |
| `<free text>` | Task intake | Ingests text as a new task for the active project. |
