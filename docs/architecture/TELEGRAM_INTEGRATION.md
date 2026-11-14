# Telegram Integration Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend Engineer & Mobile Integration Lead  
**Date:** November 14, 2026  

---

## 1. Overview & Operational Model

The Telegram Bot interface serves as the primary mobile command and alerting channel for Jarvis. It enables the human operator to submit tasks, answer clarifying questions, approve sensitive actions, monitor execution progress, and trigger emergency controls on the go.

### Webhook vs. Polling Strategy
- **Production (Cloud / Supabase Edge / Vercel):** Operates via HTTPS Webhook registered via `setWebhook` with a high-entropy `secret_token`.
- **Local Development:** Employs long polling (`getUpdates`) or ngrok/tunnel webhook to facilitate local debugging without public DNS configuration.

---

## 2. Webhook Authentication & Security

1. **Secret Token Handshake:** When registering the webhook:
   ```http
   POST https://api.telegram.org/bot<TOKEN>/setWebhook
   {
     "url": "https://jarvis.yourdomain.com/api/webhooks/telegram",
     "secret_token": "<SECURE_HIGH_ENTROPY_SECRET>"
   }
   ```
2. **Server-Side Validation:** Incoming requests to `/api/webhooks/telegram` are inspected for header `X-Telegram-Bot-Api-Secret-Token`. Constant-time comparison (`crypto.timingSafeEqual`) ensures unauthorized probes are rejected with `401 Unauthorized`.
3. **User Whitelisting:** Even with a valid webhook secret, Jarvis strictly ignores messages from any Telegram `from.id` that does not match the configured `ADMIN_TELEGRAM_CHAT_ID`.

---

## 3. Command Syntax & Capabilities

| Command | Arguments | Description | Example |
|---|---|---|---|
| `/start` | None | Initializes bot session and confirms authentication | `/start` |
| `/status` | None | Displays overall system health, active tasks, and runner status | `/status` |
| `/task` | `<prompt>` | Submits a new software task to the active project | `/task Add JWT refresh token rotation` |
| `/projects` | None | Lists connected projects and sets current active project | `/projects` |
| `/switch` | `<slug>` | Changes active project context | `/switch core-api` |
| `/budget` | None | Displays today's spend, monthly spend, and remaining limits | `/budget` |
| `/approve` | `<ticket_id>` | Approves a pending action (also accessible via 1-click inline button) | `/approve apr-1234` |
| `/reject` | `<ticket_id>` | Rejects a pending action | `/reject apr-1234` |
| `/kill` | None | **Emergency Kill Switch:** Aborts running agents & cancels workflows | `/kill` |

---

## 4. Interactive Inline Keyboards & Real-Time Sync

Whenever an approval is required or a clarifying question is asked, Jarvis sends an interactive message with inline buttons:

```
[ Telegram Alert ]
🔔 Clarification Needed: Task #104
Should the rate-limiter use an in-memory cache or Redis cluster?
-----------------------------------------------------------
[ Option A: Redis ]   [ Option B: In-Memory ]   [ Custom Reply ]
```

When an inline button is clicked:
1. Telegram sends a `callback_query` update.
2. The orchestrator updates the task specification in PostgreSQL.
3. Telegram immediately acknowledges with `answerCallbackQuery` and edits the message to reflect the chosen decision.
4. The Web Dashboard synchronously reflects the update via Supabase Realtime.
