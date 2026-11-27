# JARVIS — PRD Requirements Coverage Matrix

**Audit Date:** 2026-11-27  
**Reference:** `PRD.md` (P0 & P1 Requirements)

| Requirement ID | Priority | Description | Implementation Evidence | Verification Status |
|---|---|---|---|---|
| **FR-AUTH-001** | P0 | Owner sign in and sign out securely | `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` exist; **no `/login` UI, no sign-out button, no `src/middleware.ts`**. | **Partially implemented** (Fails end-to-end) |
| **FR-AUTH-002** | P0 | Private data scoped to authenticated owner | RLS policies exist in `20261115000002_rls_policies.sql`, but **bypassed** by `createAdminClient()` + hardcoded UUID `00000000-...-0001` in multiple routes/pages and `match_memories` `SECURITY DEFINER`. | **Implemented but failing** |
| **FR-AUTH-003** | P0 | Service-role credentials never exposed to browser | `createAdminClient()` throws if `window !== undefined` (outside test). However, `/approvals` SSR leaks HMAC approval tokens in client props. | **Partially implemented** |
| **FR-AUTH-004** | P0 | Server-side authorization + DB RLS | Enforced on `/api/approvals`, `/api/costs`, `/api/advisory`; **missing** on `/api/verification`, `/api/agents/runs`, `/api/projects`, `/api/git/push`, `/api/system/kill`. | **Implemented but failing** |
| **FR-AUTH-005** | P1 | Owner profile, timezone, theme, AI/cost preferences | `user_profiles` table exists; `/settings` only renders cost management + maintenance card (no profile/timezone editor). | **Partially implemented** |
| **Dashboard Overview** | P0 | Responsive AI-first dashboard & command center | `src/app/page.tsx` renders layout, but passes **hardcoded empty arrays** (`approvals={[]}`, `projects={[]}`, `events={[]}`). | **Implemented but failing** |
| **Conversations & Chat** | P0 | Task conversation workspace & persistent history | `conversations` & `messages` tables + `ConversationRepository` exist, but **no web UI and no `/api/conversations` API**. | **Not implemented** (Web) |
| **Projects & Tasks** | P0 | Create/manage projects, milestones, tasks | Repositories & APIs exist, but `/projects`, `/tasks`, `/api/projects` crash with **HTTP 500** without Supabase env and bypass auth. | **Blocked by dependency** / **Failing** |
| **Specification & Planning** | P0 | Natural language -> spec -> dependency-aware plan | `SpecifierAgent`, `PlannerAgent`, `/api/tasks/intake`, `/api/tasks/[id]/plan` implemented; blocked by missing OpenRouter key & Supabase. | **Blocked by dependency** |
| **Human Approvals** | P0 | Explicit approval gate before consequential execution | `ApprovalRepository`, `approval-token.ts`, `/api/approvals/*` implemented; `/approvals` SSR crashes without env & token check is optional if omitted. | **Implemented but failing** |
| **AI Gateway & Cost Controls** | P0 | Provider-independent gateway, free-first, ₹25/day, ₹750/mo | `AIGateway`, `OpenRouterAdapter`, `InferenceCircuitBreaker`, `CostRepository` implemented; silently falls back to `MockAIAdapter` when key missing. | **Blocked by dependency** |
| **Agent Execution & Sandbox** | P0 | Isolated coding execution, logs, artifacts, verification | `AiderCliAdapter`, `LocalSandboxRunner`, `VerificationHarness` exist; `aider` & Docker missing, `LocalSandboxRunner` doesn't clone repo, `/api/verification` has RCE. | **Implemented but failing** |
| **GitHub & `main`-Only Policy** | P0 | Least-privilege GitHub integration & `main`-only enforcement | `RepoSyncMonitor`, `PushGateService`, `branch-hygiene.ts` exist; `origin` still has 6 non-`main` branches; remote ops unverified. | **Partially implemented** |
| **Telegram Integration** | P0 | Bot intake, owner allow-list, approvals, `/kill` | `src/lib/telegram/*` & `/api/telegram/webhook` implemented; env var mismatch (`OWNER_TELEGRAM_ID` vs `TELEGRAM_OWNER_CHAT_ID`), optional webhook secret, no dedup. | **Blocked by dependency** |
| **Audit Trail** | P0 | Tamper-evident audit log of sensitive actions | `AuditLedgerService` computes SHA-256 chain in JSONB `_audit`; `/audit` crashes with HTTP 500 without env. | **Blocked by dependency** |
| **Deployments** | P1 | Preview & production deployment gate + rollback | `DeploymentManager` & `DeploymentRepository` use **in-memory Map** (no `deployments` table in migrations) and fabricate fake Vercel URLs. | **Implemented but failing** |
