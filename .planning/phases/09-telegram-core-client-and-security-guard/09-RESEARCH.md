# Phase 9 Research: Telegram Core Client & Security Guard

## 1. Executive Summary

Phase 9 establishes the foundational Telegram Bot Gateway client and security perimeter for Milestone 3. The gateway provides a direct, mobile communication channel between the solo developer and Jarvis. Because Telegram updates originate outside the trusted application perimeter, this phase implements strict single-owner allow-listing (`OWNER_TELEGRAM_ID`), webhook secret token verification, a robust zero-dependency fetch-based `TelegramClient`, MarkdownV2 formatting, and dual-mode update handling (production Webhook route + local dev long-polling script).

---

## 2. Requirements & Invariants

### 2.1 Functional Requirements
- **`REQ-TG-01`**: Telegram Bot Client with type safety, message delivery (`sendMessage`, `editMessageText`, `answerCallbackQuery`), MarkdownV2 escaping, and error handling.
- **`REQ-TG-02`**: Single-Owner Allow-List & Webhook Security Guard checking `from.id` against `OWNER_TELEGRAM_ID` and verifying `X-Telegram-Bot-Api-Secret-Token`.
- **`REQ-TG-03`**: Dual-Mode update handling via Next.js App Router route handler (`/api/telegram/webhook`) and local dev long-polling script (`scripts/telegram-polling.ts`), with command routing for `/start`, `/status`, `/budget`, and `/projects`.
- **`NFR-SEC-04`**: 100% rejection of unauthorized senders with zero leaked data or execution.

### 2.2 Security Invariants
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `OWNER_TELEGRAM_ID` are server-only environment variables.
- Never commit real bot tokens or secrets to git.
- If an update arrives from an unauthorized sender, log a security audit event and drop the update immediately.
- Telegram webhook route handler must return HTTP 200 to Telegram even on unauthorized updates to prevent Telegram from repeatedly retrying malicious or erroneous payloads.

---

## 3. Telegram API Architecture & Design

### 3.1 Client Design (`src/lib/telegram/client.ts`)
Zero-dependency implementation using native `fetch`:
- Base URL: `https://api.telegram.org/bot${token}`
- Timeout handling via `AbortController`.
- Typed responses wrapping Telegram's standard `{ ok: boolean, result?: T, description?: string, error_code?: number }`.

### 3.2 MarkdownV2 Escaping (`src/lib/telegram/format.ts`)
Per official Telegram Bot API specification, characters requiring escaping inside MarkdownV2 are:
`_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`

```typescript
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
```

### 3.3 Single-Owner Security Guard (`src/lib/telegram/guard.ts`)
```typescript
export function isAuthorizedSender(fromId: number | string | undefined): boolean {
  if (!fromId) return false;
  const ownerId = process.env.OWNER_TELEGRAM_ID;
  if (!ownerId) {
    console.error("OWNER_TELEGRAM_ID environment variable is not configured.");
    return false;
  }
  return fromId.toString() === ownerId.toString();
}
```

### 3.4 Command Routing (`src/lib/telegram/commands.ts`)
- `/start`: Greeting and operational status.
- `/status`: Active tasks and counts from `TaskRepository`.
- `/budget`: Consumption against daily ₹25 and monthly ₹750 ceilings from `BudgetService`.
- `/projects`: Active repositories and recent updates.
- Unknown command: Returns command palette with usage instructions.

### 3.5 Dual-Mode Execution
- **Production Webhook:** App Router endpoint `POST /api/telegram/webhook`. Verifies `X-Telegram-Bot-Api-Secret-Token` header.
- **Local Dev Polling:** `scripts/telegram-polling.ts`. Removes active webhook via `deleteWebhook()`, then polls `getUpdates({ timeout: 30 })` in a non-blocking loop.

---

## 4. Execution Wave Breakdown

- **Wave 1 (Plan 9.1):** `TelegramClient`, Types, MarkdownV2 formatting, and `TelegramSecurityGuard`.
- **Wave 2 (Plan 9.2):** Command Router, App Router Webhook route handler, and dev long-polling runner script.
