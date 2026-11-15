# Phase 11 Research: Telegram Interactive Approval Cards & Decision Webhook

## 1. Domain Overview & Requirements

Phase 11 concludes Milestone 3 (Telegram Gateway) by implementing real-time interactive approval cards and decision handling over Telegram (`REQ-TG-05`). 

### Core Requirements
- **REQ-TG-05:** Interactive Approval Cards & Decision Webhook:
  - Rich MarkdownV2 notification cards with inline callback buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`).
  - Webhook and polling handlers for Telegram `callback_query` updates.
  - Durable approval updates in Supabase (`ApprovalRepository`, `PlanRepository`, `TaskRepository`).
  - In-place card message editing to remove buttons and record an immutable decision receipt.
  - Single-owner security guard enforcement on all callback queries (`validateUpdate`).
  - Fallback CLI commands `/approve <id>` and `/reject <id> [reason]` in command router.

---

## 2. Technical Architecture & Protocols

### 2.1 Telegram Callback Query Protocol
1. **Payload Structure:**
   When an owner presses an inline button, Telegram delivers an update with `callback_query`:
   ```typescript
   export interface TelegramCallbackQuery {
     id: string; // Unique query ID (used to acknowledge)
     from: TelegramUser; // User who pressed the button
     message?: TelegramMessage; // Message containing the inline keyboard
     data?: string; // Callback data payload (max 64 bytes)
   }
   ```
2. **Instant Acknowledgment (`answerCallbackQuery`):**
   - Telegram requires `answerCallbackQuery(callback_query_id)` to clear the client loading spinner.
   - If not answered within ~10 seconds, the user sees a clock icon / timeout error.
   - We must call `answerCallbackQuery` immediately upon validating the request.
3. **Data Payload Packing (64-byte limit):**
   - Plan decisions: `appr:plan:<uuid>` (46 bytes) / `rejc:plan:<uuid>` (46 bytes)
   - Action decisions: `appr:act:<uuid>` (45 bytes) / `rejc:act:<uuid>` (45 bytes)
   - Well within the 64-byte Telegram limit.

### 2.2 In-Place Message Replacement
- Once a decision is finalized, the card must be edited using `editMessageText`:
  ```typescript
  await client.editMessageText(chatId, messageId, receiptText, {
    parse_mode: "MarkdownV2",
    reply_markup: { inline_keyboard: [] }, // Clears inline keyboard
  });
  ```
- Prevents button spamming and leaves a permanent audit record in the chat log:
  ```text
  ✅ *PLAN APPROVED*
  *Task:* Implement user authentication
  *Decided By:* Owner at 17:35 UTC
  *Status:* Queued for autonomous execution
  ```

### 2.3 Atomic State Management & Concurrency
- **Double-Click / Already Decided:**
  - Before making database writes, verify that the approval or plan is still in `pending` / `pending_approval` status.
  - If already decided (e.g. approved on Web UI or double-tapped), invoke `answerCallbackQuery(id, "Already decided", true)` and edit message to remove buttons.
- **State Transitions for Plans:**
  - `PlanRepository.updateStatus(planId, 'approved')`
  - Record approval in `ApprovalRepository`
  - `TaskRepository.updateStatus(taskId, 'queued')`
- **State Transitions for Actions:**
  - `ApprovalRepository.recordDecision(approvalId, userId, 'approved' | 'rejected', reason)`

---

## 3. Plan Wave Breakdown

### Wave 1: Approval Card Formatting & Delivery Service (Plan 11.1)
- Author `src/lib/telegram/approvals.ts`:
  - `formatPlanApprovalCard(plan, task)`: MarkdownV2 formatted card with inline buttons `[ ✅ Approve Plan ]`, `[ ❌ Reject Plan ]`.
  - `formatActionApprovalCard(approval, task)`: MarkdownV2 formatted card with inline buttons `[ ✅ Approve ]`, `[ ❌ Reject ]`.
  - `formatDecisionReceipt(type, title, decision, timestamp, notes)`: Formats finalized receipt.
  - `sendPlanApprovalCard(chatId, plan, task)`: Sends card via `TelegramClient`.
  - `sendActionApprovalCard(chatId, approval, task)`: Sends card via `TelegramClient`.
- Author unit tests `tests/unit/telegram/approvals.test.ts`.

### Wave 2: Callback Query Processing, Webhook Handler & CLI Commands (Plan 11.2)
- Author `TelegramDecisionService` in `src/lib/telegram/decision.ts`:
  - `handleCallbackQuery(callbackQuery, userId)`:
    - Parses callback data.
    - Validates state idempotently.
    - Updates repositories (`PlanRepository`, `ApprovalRepository`, `TaskRepository`).
    - Acknowledges with `answerCallbackQuery`.
    - Edits message in-place with `editMessageText`.
- Extend command router in `src/lib/telegram/commands.ts`:
  - Handle `/approve <id>` and `/reject <id> [reason]`.
- Wire `update.callback_query` into:
  - `src/app/api/telegram/webhook/route.ts`
  - `scripts/telegram-polling.ts`
- Author unit tests:
  - `tests/unit/telegram/decision.test.ts`
  - `tests/unit/telegram/commands.test.ts` (approve/reject CLI commands)
  - `tests/unit/api/telegram-webhook-route.test.ts` (callback query webhook tests)

---

## 4. Verification Criteria
- `tests/unit/telegram/approvals.test.ts` passes 100%.
- `tests/unit/telegram/decision.test.ts` passes 100%.
- `tests/unit/api/telegram-webhook-route.test.ts` passes 100%.
- Full test suite passes: `pnpm test`.
- Next.js production build passes: `pnpm build`.
