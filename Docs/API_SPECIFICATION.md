# API Specification --- MVP Contract

Base path: `/api/v1` (proposed). All endpoints require authentication
unless explicitly marked as a webhook with signature verification.

## Tasks

-   `POST /tasks` --- create task; requires idempotency key.
-   `GET /tasks` --- list owner's tasks with filters and pagination.
-   `GET /tasks/{task_id}` --- task details and current state.
-   `POST /tasks/{task_id}/pause` --- request pause.
-   `POST /tasks/{task_id}/resume` --- resume if policy permits.
-   `POST /tasks/{task_id}/cancel` --- cancel task and stop worker.
-   `GET /tasks/{task_id}/events` --- task timeline.
-   `GET /tasks/{task_id}/artifacts` --- evidence and output metadata.

## Projects

-   `POST /projects`
-   `GET /projects`
-   `GET /projects/{project_id}`
-   `PATCH /projects/{project_id}`
-   `POST /projects/{project_id}/verify-github-access`

## Approvals

-   `GET /approvals`
-   `GET /approvals/{approval_id}`
-   `POST /approvals/{approval_id}/approve`
-   `POST /approvals/{approval_id}/reject`

Approval requests must show exact action, target, parameters,
consequences, expiry, and requester. Approval endpoint must revalidate
current policy and payload hash.

## System

-   `GET /health/live`
-   `GET /health/ready`
-   `GET /system/status`
-   `POST /system/emergency-stop`
-   `POST /system/resume` (owner-only, additional confirmation)

## Webhooks

-   `POST /webhooks/github`
-   `POST /webhooks/telegram` (if webhook mode used)

Verify signatures, timestamps/replay protections where supported, and
event allowlists.

## Response conventions

-   JSON response with `request_id`.
-   Errors include stable `code`, safe `message`, and optional
    validation details.
-   Never return stack traces, secrets, tokens, or raw internal prompts.
-   Use correct HTTP status codes.
-   Enforce rate limits and payload size limits.
-   Paginate list endpoints.
-   Document schemas with OpenAPI.

## Task state enum

`queued`, `planning`, `awaiting_approval`, `ready`, `running`, `paused`,
`failed`, `cancelled`, `completed`, `interrupted`.

Transitions must be validated server-side; clients cannot set arbitrary
states.
