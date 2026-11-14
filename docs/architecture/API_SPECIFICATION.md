# API Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend Engineer & API Architect  
**Date:** November 14, 2026  

---

## 1. Overview & Protocol Architecture

Jarvis exposes a unified, strictly validated API surface across three primary zones:
1. **Public Ingress Webhooks:** Receives inbound events from Telegram and GitHub. Authenticated via cryptographic signatures and secret headers.
2. **Dashboard REST & Server Actions:** Powers the Next.js Web Dashboard. Authenticated via Supabase Auth JWTs with RLS enforcement.
3. **Internal Control Plane & Runner Ingress:** Facilitates orchestrator dispatch, permission checks, budget queries, and runner progress streaming. Authenticated via short-lived task-scoped HMAC tokens.

All request bodies and responses conform to standard JSON schemas defined in `@jarvis/shared-contracts` and validated via Zod.

---

## 2. Ingress Webhook Specifications

### 2.1 Telegram Webhook Endpoint
- **Route:** `POST /api/webhooks/telegram`
- **Authentication:** Header `X-Telegram-Bot-Api-Secret-Token` matched against `process.env.TELEGRAM_WEBHOOK_SECRET` using `crypto.timingSafeEqual`.
- **Purpose:** Ingests user commands, inline button approval clicks, and text queries.

#### Request Headers:
```http
POST /api/webhooks/telegram HTTP/1.1
Host: jarvis.yourdomain.com
Content-Type: application/json
X-Telegram-Bot-Api-Secret-Token: <SECURE_TELEGRAM_SECRET_TOKEN>
```

#### Request Payload (Telegram Update):
```json
{
  "update_id": 100028472,
  "message": {
    "message_id": 412,
    "from": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "Alex",
      "username": "alex_lead"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "date": 1731600000,
    "text": "/task project=core-api Implement Redis cache for user profiles"
  }
}
```

#### Success Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "ok": true }
```

---

### 2.2 GitHub App Webhook Endpoint
- **Route:** `POST /api/webhooks/github`
- **Authentication:** Header `X-Hub-Signature-256` carrying `sha256=<HMAC_HEX>` computed with `process.env.GITHUB_WEBHOOK_SECRET`.
- **Purpose:** Ingests issue creations, pull request status changes, workflow run completion events, and branch events.

#### Request Headers:
```http
POST /api/webhooks/github HTTP/1.1
Host: jarvis.yourdomain.com
Content-Type: application/json
X-GitHub-Event: workflow_run
X-Hub-Signature-256: sha256=d6a9...
```

#### Request Payload (Workflow Run Completed):
```json
{
  "action": "completed",
  "workflow_run": {
    "id": 11847291024,
    "name": "Coding Agent Runner",
    "head_branch": "jarvis/task-redis-cache",
    "conclusion": "success",
    "repository": {
      "full_name": "owner/core-api"
    }
  }
}
```

---

## 3. Dashboard API Endpoints

### 3.1 Task Ingress & Management
- **`GET /api/tasks`**
  - **Auth:** `Authorization: Bearer <SUPABASE_JWT>`
  - **Query:** `?projectId=<uuid>&status=<status>&limit=20`
  - **Response:** `200 OK` with paginated list of tasks.
- **`POST /api/tasks`**
  - **Auth:** `Authorization: Bearer <SUPABASE_JWT>`
  - **Body:**
    ```json
    {
      "projectId": "11111111-2222-3333-4444-555555555555",
      "title": "Add CSRF protection",
      "promptRaw": "Protect all state-changing POST routes with Double Submit Cookie CSRF token",
      "priority": "HIGH"
    }
    ```
  - **Response:** `201 Created` with Task entity.

### 3.2 Approval Actions
- **`POST /api/approvals/{id}/resolve`**
  - **Auth:** `Authorization: Bearer <SUPABASE_JWT>`
  - **Body:**
    ```json
    {
      "decision": "APPROVED",
      "comment": "Proceed with staging deployment"
    }
    ```
  - **Response:** `200 OK`

---

## 4. Runner Ingress API (Reporting from Ephemeral Runners)

- **Route:** `POST /api/runner/report-execution`
- **Authentication:** `Authorization: Bearer <TASK_RUNNER_SECRET_TOKEN>` (Short-lived HMAC signed by Orchestrator with task ID and 2-hour TTL).
- **Purpose:** The ephemeral GitHub Actions runner streams back test outcomes, diff summary, token metrics, and logs.

#### Request Body:
```json
{
  "taskId": "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
  "agentRunId": "99999999-0000-aaaa-bbbb-cccccccccccc",
  "status": "SUCCEEDED",
  "branch": "jarvis/task-redis-cache",
  "commitSha": "3f8b92c",
  "pullRequestNumber": 42,
  "testSummary": {
    "framework": "vitest",
    "passed": 14,
    "failed": 0,
    "skipped": 0,
    "durationMs": 4210
  },
  "tokenTelemetry": {
    "provider": "openrouter",
    "modelId": "meta-llama/llama-3.3-70b-instruct:free",
    "promptTokens": 3840,
    "completionTokens": 1120,
    "actualCostUsd": 0.0,
    "actualCostInr": 0.0,
    "generationId": "gen-abc123xyz"
  },
  "filesModified": [
    "src/cache/redis.ts",
    "src/cache/redis.test.ts"
  ]
}
```

---

## 5. Error Handling & Standard Error Envelope

All API endpoints return standard RFC 7807 problem details:
```json
{
  "type": "https://jarvis.internal/errors/BUDGET_EXCEEDED",
  "title": "Daily Spending Limit Reached",
  "status": 403,
  "detail": "Action blocked: Daily expenditure INR 24.80 is near the limit of INR 25.00. Paid model request of INR 1.50 rejected.",
  "instance": "/api/tasks/dispatch",
  "timestamp": "2026-11-14T18:30:00Z"
}
```
