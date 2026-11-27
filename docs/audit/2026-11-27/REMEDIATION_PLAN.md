# JARVIS — Prioritized Remediation Plan

**Audit Date:** 2026-11-27  
**Goal:** Bring Jarvis from **NON-OPERATIONAL** to **OPERATIONAL** with verified security, persistence, and end-to-end workflows.

---

## Priority 1 — Critical Security & Auth Fixes (Do First)

### 1.1 Eliminate Unauthenticated RCE on `/api/verification` (BUG-001)
- **Affected Modules:** `src/app/api/verification/route.ts`, `diff/route.ts`, `repair/route.ts`, `secrets/route.ts`
- **Action:** Require `supabase.auth.getUser()` (`401` if unauthenticated). Remove arbitrary `customCommand` / `cwd` execution from HTTP input (allow only predefined enum stages: `lint`, `typecheck`, `test`, `build` within `process.cwd()`).
- **Complexity:** Low (1–2 hours)
- **Verification:** Unauthenticated `POST /api/verification` returns `401`; authenticated `POST` with `customCommand` is rejected (`400`).

### 1.2 Remove Auth Bypasses, Admin Fallbacks & Body `userId` Spoofing (BUG-002, BUG-003)
- **Affected Modules:** `src/app/api/projects/**`, `src/app/api/tasks/**`, `src/app/api/agents/**`, `src/app/api/memories/**`, `src/app/api/git/push/route.ts`, `src/app/api/git/sync/route.ts`, `src/app/api/system/kill/**`
- **Action:**
  - Create a shared `requireAuthenticatedUser()` helper using `createClient()` + `supabase.auth.getUser()`.
  - Return `401 Unauthorized` whenever `!user`.
  - Delete all `00000000-0000-0000-0000-000000000001` fallbacks and all `userId` fields from request body schemas.
  - Never fall back to `createAdminClient()` in user-facing API routes.
- **Complexity:** Medium (3–4 hours)
- **Verification:** Automated API integration test verifying `401` on all routes when unauthenticated.

### 1.3 Wire `src/middleware.ts`, Add `/login` UI & Sign-Out Control (BUG-004, BUG-014)
- **Affected Modules:** New `src/middleware.ts`, new `src/app/login/page.tsx`, `src/components/layout/topbar.tsx`, `src/app/api/auth/callback/route.ts`
- **Action:**
  - Export `middleware` in `src/middleware.ts` calling `updateSession(request)` and redirecting unauthenticated page requests to `/login`.
  - Build `/login` page wired to `/api/auth/login` and `/api/auth/session`.
  - Add user email + Sign Out button (`/api/auth/logout`) to `Topbar`.
  - Validate `next` redirect parameter in `/api/auth/callback` (must start with `/` and not `//`).
- **Complexity:** Medium (3–4 hours)
- **Verification:** Unauthenticated visit to `/` redirects to `/login`; sign-in grants access; sign-out revokes access.

### 1.4 Fix `match_memories` RLS Bypass (BUG-006)
- **Affected Modules:** New SQL migration in `supabase/migrations/`
- **Action:** Update `match_memories` to enforce `m.user_id = auth.uid()` when called by authenticated users (or remove `SECURITY DEFINER` and use `SECURITY INVOKER` so RLS applies automatically).
- **Complexity:** Low (30 mins)
- **Verification:** Querying `match_memories` as User A never returns User B's rows.

---

## Priority 2 — Fix Runtime Crashes & Core P0 Workflows

### 2.1 Fix SSR HTTP 500 Crashes on 6 Pages (BUG-005)
- **Affected Modules:** `src/app/projects/page.tsx`, `projects/[id]/page.tsx`, `tasks/page.tsx`, `approvals/page.tsx`, `memory/page.tsx`, `audit/page.tsx`, `settings/page.tsx`
- **Action:** Remove `createAdminClient()` fallbacks; use `requireServerSession()` which redirects to `/login` when unauthenticated and renders a graceful configuration error state if Supabase env vars are missing.
- **Complexity:** Low–Medium (2 hours)
- **Verification:** All 9 pages return `200` (authenticated) or `307 -> /login` (unauthenticated), never `500`.

### 2.2 Connect Dashboard (`/`) to Real Data (BUG-007)
- **Affected Modules:** `src/app/page.tsx`
- **Action:** Fetch real `CostRepository.getSpendSummary(user.id)`, `ApprovalRepository.listPending(user.id)`, `ProjectRepository.list(user.id)`, and `AuditLedgerService.listEvents(user.id)` on the server.
- **Complexity:** Low–Medium (2 hours)
- **Verification:** Dashboard reflects newly created projects, approvals, and spend after refresh.

### 2.3 Implement Web Chat / Conversation Workspace (BUG-008)
- **Affected Modules:** New `src/app/api/conversations/**`, new `src/app/chat/page.tsx` or workspace panel
- **Action:** Expose `ConversationRepository` via authenticated REST endpoints and build a responsive chat UI connected to `AIGateway` / `SpecifierAgent` / `PlannerAgent`.
- **Complexity:** High (1–2 days)
- **Verification:** User can create a conversation, send a message, receive a real AI response, and reload persisted history.

---

## Priority 3 — Infrastructure, Integrations & Reliability

### 3.1 Environment Configuration & Real Service Provisioning
- **Action:** Create `.env.local` from `.env.example` with real Supabase project URL/keys, `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `OWNER_TELEGRAM_ID`. Apply all `supabase/migrations/*.sql`.
- **Complexity:** Medium (1–2 hours)

### 3.2 Fail-Closed AI Gateway & Token-Enforced Approvals (BUG-010, BUG-012)
- **Affected Modules:** `src/lib/ai/gateway.ts`, `src/app/api/approvals/[id]/decision/route.ts`, `src/app/approvals/page.tsx`
- **Action:** Throw an explicit configuration error in `createDefaultAIGateway()` if `OPENROUTER_API_KEY` is missing (except when `NODE_ENV === "test"`). Make HMAC `token` verification mandatory on approval decisions and do not leak tokens in SSR props.
- **Complexity:** Low (1–2 hours)

### 3.3 Fix Telegram Env Mismatches & Add Deduplication (BUG-011)
- **Affected Modules:** `.env.example`, `src/lib/telegram/guard.ts`, `src/app/api/telegram/webhook/route.ts`
- **Action:** Standardize on `TELEGRAM_OWNER_CHAT_ID` (or document `OWNER_TELEGRAM_ID` consistently), require `TELEGRAM_WEBHOOK_SECRET` in production, and deduplicate incoming `update_id` values.
- **Complexity:** Low–Medium (2 hours)

### 3.4 Real Sandbox Repo Cloning & Deployments Table (BUG-009, BUG-013)
- **Affected Modules:** `src/lib/agents/engine/sandbox/local-sandbox-runner.ts`, `supabase/migrations/`, `src/lib/repositories/deployment-repository.ts`
- **Action:** Add `deployments` SQL migration with RLS; remove in-memory `Map` fallback in production; update `LocalSandboxRunner` to shallow-clone `main` into the ephemeral workspace and install/verify `aider` or a Dockerized runner.
- **Complexity:** High (1–2 days)

---

## Priority 4 — Hygiene & Quality Cleanup (BUG-015, BUG-016)
- Clean up the 6 non-`main` remote branches on `origin` (with owner approval).
- Resolve the 65 ESLint warnings and React `act(...)` test warnings.
- Update `docs/MASTER_ENGINEERING_AUDIT.md` to reflect actual verified status.
