# JARVIS — Verified Current State (Audit Snapshot)

**Last Verified:** 2026-11-27  
**Git Branch:** `main` (`c8a2615`, synced with `origin/main`)  
**Overall Classification:** **NON-OPERATIONAL**

## Verified Baseline Checks
- **TypeScript (`npx.cmd tsc --noEmit`):** PASS (0 errors)
- **ESLint (`pnpm.cmd run lint`):** PASS with 65 warnings (0 errors)
- **Vitest (`pnpm.cmd test`):** PASS — 132 files / 821 tests (all external services mocked)
- **Production Build (`pnpm.cmd run build`):** PASS outside sandbox (57 routes); fails with `EPERM` mkdir inside Windows sandbox
- **Live Runtime (`pnpm.cmd run dev`):** **FAIL** — 6 of 9 UI pages and `/api/projects` return HTTP 500 due to missing `.env.local` and uncaught `createAdminClient()` errors; `/api/health` returns 503; unauthenticated RCE/auth bypasses present on `/api/verification` and `/api/agents/runs`.
- **Browser DevTools Audit:** **BLOCKED** (Chrome remote debugging `DevToolsActivePort` not active).

## Key Gaps Blocking Operation
1. Missing `.env.local`, Supabase instance, OpenRouter API key, Telegram credentials, Docker, and `aider` CLI.
2. Critical security vulnerabilities (unauthenticated RCE on `POST /api/verification`, auth bypass via `createAdminClient()` + hardcoded UUID, missing `src/middleware.ts`, `match_memories` RLS bypass).
3. Missing `/login` UI, missing web chat UI (`/api/conversations`), hardcoded `/` dashboard props, and simulated `deployments` without a database table.

See `AUDIT_REPORT.md`, `BUG_REGISTER.md`, `TEST_RESULTS.md`, `REQUIREMENTS_COVERAGE.md`, and `REMEDIATION_PLAN.md` in this directory for full details.
