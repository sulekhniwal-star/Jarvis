# JARVIS — API Specification

**Document:** `docs/API_SPECIFICATION.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Overview & Protocol Standards

Jarvis exposes a unified API surface across three interfaces:
1. **Next.js Route Handlers (`/api/v1/*`):** RESTful endpoints for dashboard interactions, task workflows, and GitHub webhooks.
2. **Telegram Bot Gateway (`/api/v1/telegram/webhook`):** Ingress endpoint for Telegram bot updates.
3. **Python Automation Service RPC (`/api/v1/python/*`):** Versioned JSON-RPC / REST interface between the Node.js orchestrator and the Python analysis worker.

### Standard Response Envelope
All API endpoints return a standardized JSON structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "metadata": {
    "timestamp": "2026-11-15T17:30:00Z",
    "request_id": "req_01h...abc"
  }
}
```

In the event of an error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BUDGET_EXCEEDED",
    "message": "Daily budget ceiling of INR 25.00 reached. Approval required for paid inference.",
    "details": { "current_daily_spend_inr": 25.12 }
  },
  "metadata": {
    "timestamp": "2026-11-15T17:30:00Z",
    "request_id": "req_01h...abc"
  }
}
```

---

## 2. Next.js Core API Endpoints (`/api/v1`)

### 2.1 Task & Specification Management
- **`POST /api/v1/tasks`**
  - **Description:** Submit a new natural-language coding task.
  - **Auth:** Bearer Token (Supabase JWT).
  - **Request Body:**
    ```json
    {
      "project_id": "uuid",
      "prompt": "Add health check endpoint to Next.js API",
      "priority": "medium"
    }
    ```
  - **Response (201 Created):** Returns created task object with status `INTAKE`.

- **`POST /api/v1/tasks/:id/specify`**
  - **Description:** Trigger AI requirement extraction to produce structured scope and acceptance criteria.
  - **Response (200 OK):** Returns specification object (`scope`, `exclusions`, `acceptance_criteria`).

- **`POST /api/v1/tasks/:id/plan`**
  - **Description:** Decompose specified task into sequential execution steps and identify required approvals.
  - **Response (200 OK):** Returns generated execution plan with status `PENDING_APPROVAL`.

### 2.2 Approvals & Governance
- **`GET /api/v1/approvals`**
  - **Description:** List pending approval requests for the authenticated owner.
  - **Query Params:** `status=pending|approved|rejected`
  - **Response (200 OK):** Array of approval objects with scope, action, and risk level.

- **`POST /api/v1/approvals/:id/decide`**
  - **Description:** Approve or reject a specific pending request.
  - **Request Body:**
    ```json
    {
      "decision": "approved",
      "reason": "Verified diff and test evidence looks clean"
    }
    ```
  - **Response (200 OK):** Returns updated approval status and dispatches blocked workflow.

### 2.3 Agent Run & Runner Dispatch
- **`POST /api/v1/runs/dispatch`**
  - **Description:** Dispatches an approved plan to the GitHub Actions runner sandbox.
  - **Request Body:**
    ```json
    {
      "task_id": "uuid",
      "plan_id": "uuid",
      "runner_type": "github_actions"
    }
    ```
  - **Response (202 Accepted):** Returns `agent_run` record with status `QUEUED`.

- **`POST /api/v1/runs/:id/callback`**
  - **Description:** Ingests execution logs, diffs, test results, and artifacts from the runner.
  - **Auth:** Ephemeral Runner JWT (HMAC-signed with task-specific secret).
  - **Request Body:**
    ```json
    {
      "exit_code": 0,
      "git_commit_hash": "a1b2c3d...",
      "diff_patch": "--- a/api/health.ts...",
      "test_summary": { "passed": 12, "failed": 0, "duration_ms": 1420 },
      "artifacts": [
        { "name": "vitest-output.log", "storage_path": "runs/123/vitest.log" }
      ]
    }
    ```

---

## 3. Telegram Bot Gateway (`/api/v1/telegram/webhook`)

- **Method:** `POST`
- **Security:** Validates secret webhook token (`X-Telegram-Bot-Api-Secret-Token`).
- **Owner Verification:** Validates that `message.from.id` equals `OWNER_TELEGRAM_ID`. Any message from unrecognized users is dropped immediately with HTTP 403.
- **Supported Commands:**
  - `/start`: Greeting and connection verification.
  - `/status`: Summary of active runs, pending approvals, and daily budget.
  - `/approve <id>`: Quick approval of pending action.
  - `/reject <id>`: Reject pending action.
  - Freeform text: Interpreted as a task intake prompt for the active project.

---

## 4. Python Automation Service Contract (`/api/v1/python`)

- **Transport:** HTTP JSON-RPC 2.0
- **`method: "ast.analyze_repository"`**
  - **Params:** `{ "repo_path": "/workspace", "languages": ["typescript", "python"] }`
  - **Result:** `{ "files": 45, "functions": 210, "dependencies": { ... } }`
- **`method: "embeddings.generate_chunks"`**
  - **Params:** `{ "text": "...", "chunk_size": 512, "overlap": 64 }`
  - **Result:** `{ "chunks": [ ... ], "embeddings": [ [0.012, -0.045, ...] ] }`
