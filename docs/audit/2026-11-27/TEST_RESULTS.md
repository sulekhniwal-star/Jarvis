# JARVIS — Audit Test & Verification Results

**Audit Date:** 2026-11-27  
**Environment:** Windows 11 (`f:\Javis`), Node `v26.13.1`, pnpm `12.21.0`, TypeScript `5.9.3`, Docker: Not installed, `.env` / `.env.local`: Not present.

---

## 1. Static Analysis, Test Suite & Build Results

| Check                              | Exact Command                                | Outcome                  | Observed Details                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript Check**               | `npx.cmd tsc --noEmit`                       | **PASS**                 | Exit code 0, 0 type errors.                                                                                                                                                                     |
| **ESLint**                         | `pnpm.cmd run lint`                          | **PASS (with warnings)** | Exit code 0, **0 errors, 65 warnings** (`no-unused-vars`, `react-hooks/exhaustive-deps`).                                                                                                       |
| **Unit & Integration Tests**       | `pnpm.cmd test` (`vitest run`)               | **PASS (Mocked)**        | **132 test files passed, 821 tests passed** in 106.20s. Note: Tests mock Supabase, OpenRouter, and child processes; stderr shows missing Supabase env var errors and React `act(...)` warnings. |
| **Production Build (Sandbox)**     | `pnpm.cmd run build`                         | **FAIL (Sandbox EPERM)** | Failed twice in Windows sandbox with `EPERM: operation not permitted, mkdir 'F:\Javis\.next\server\app\api\...'`.                                                                               |
| **Production Build (Unsandboxed)** | `pnpm.cmd run build` (`BypassSandbox: true`) | **PASS**                 | Exit code 0. Compiled 57 routes (35 static, 22 dynamic) with `next build --webpack`.                                                                                                            |

---

## 2. Live Runtime HTTP Probe Results (`pnpm.cmd run dev`)

Probed against live `next dev --webpack` on `http://localhost:3000` (with no `.env.local` configured):

| Route                     | Method | Expected            | Actual HTTP Status | Notes / Root Cause                                                                                       |
| ------------------------- | ------ | ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `/`                       | GET    | 200                 | **200**            | Renders with hardcoded empty props (`approvals={[]}`, `projects={[]}`, `events={[]}`).                   |
| `/projects`               | GET    | 200 or 401/Redirect | **500**            | Uncaught `Error: Missing Supabase admin environment variables` in `catch` block (`createAdminClient()`). |
| `/tasks`                  | GET    | 200 or 401/Redirect | **500**            | Uncaught `createAdminClient()` error in `catch` block.                                                   |
| `/approvals`              | GET    | 200 or 401/Redirect | **500**            | Uncaught `createAdminClient()` error in `catch` block.                                                   |
| `/agents`                 | GET    | 200                 | **200**            | `createAdminClient()` is inside `try`, silently returns empty runs.                                      |
| `/memory`                 | GET    | 200 or 401/Redirect | **500**            | Uncaught `createAdminClient()` error in `catch` block.                                                   |
| `/audit`                  | GET    | 200 or 401/Redirect | **500**            | Uncaught `createAdminClient()` error in `catch` block.                                                   |
| `/deployments`            | GET    | 200                 | **200**            | `DeploymentManager` error caught inside `try`, logs error and renders empty.                             |
| `/settings`               | GET    | 200 or 401/Redirect | **500**            | Uncaught `createAdminClient()` error in `catch` block.                                                   |
| `/api/health`             | GET    | 503 (unconfigured)  | **503**            | Correctly reports unhealthy when Supabase is unconfigured.                                               |
| `/api/health/diagnostics` | GET    | 401                 | **401**            | Enforces authentication.                                                                                 |
| `/api/projects`           | GET    | 401                 | **500**            | Uncaught `createAdminClient()` error when `createClient()` fails.                                        |
| `/api/agents/runs`        | GET    | 401                 | **200**            | **Security defect:** No auth check; silently returns empty list when DB fails.                           |
| `/api/agents/engine`      | GET    | 401                 | **200**            | **Security defect:** No auth check; registers `MockCodingAgentEngine`.                                   |
| `/api/agents/sandbox`     | GET    | 401                 | **200**            | **Security defect:** No auth check.                                                                      |
| `/api/approvals`          | GET    | 401                 | **401**            | Enforces authentication.                                                                                 |
| `/api/costs`              | GET    | 401                 | **401**            | Enforces authentication.                                                                                 |

---

## 3. Browser UI & End-to-End Workflow Verification

| Workflow / Check                    | Status                   | Reason / Evidence                                                                                                                                            |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Browser DevTools Audit**          | **BLOCKED**              | Chrome remote debugging (`DevToolsActivePort`) is not running on the host (`ENOENT: C:\Users\JSK\AppData\Local\Google\Chrome\User Data\DevToolsActivePort`). |
| **Workflow A — Authentication**     | **FAIL / BLOCKED**       | No `/login` page or sign-in/sign-out UI exists; no Supabase instance configured.                                                                             |
| **Workflow B — Conversation**       | **NOT IMPLEMENTED**      | No web chat UI or `/api/conversations` API exists.                                                                                                           |
| **Workflow C — Project Management** | **FAIL / BLOCKED**       | `/projects` and `/api/projects` return HTTP 500 without Supabase env; no live DB.                                                                            |
| **Workflow D — Planning**           | **BLOCKED**              | Blocked by missing Supabase & OpenRouter API key (`AIGateway` falls back to `MockAIAdapter`).                                                                |
| **Workflow E — Agent Execution**    | **BLOCKED**              | Blocked by missing Supabase, missing `aider` CLI, missing Docker, and `LocalSandboxRunner` not cloning repos.                                                |
| **Workflow F — Approval**           | **FAIL / BLOCKED**       | `/approvals` returns HTTP 500 without env; `/api/approvals` returns 401 without session.                                                                     |
| **Workflow G — GitHub**             | **PARTIAL / UNVERIFIED** | Local `RepoSyncMonitor` works via `git` CLI; webhook & push execution unverified against remote without credentials.                                         |
| **Workflow H — Telegram**           | **BLOCKED**              | Missing `TELEGRAM_BOT_TOKEN`, `OWNER_TELEGRAM_ID` / `TELEGRAM_OWNER_CHAT_ID` env mismatch.                                                                   |
