# Research Log: Jarvis Autonomous Personal AI System

**Author:** Staff Backend & Principal AI Systems Architect  
**Project:** Jarvis Autonomous Personal AI Software-Building System  
**Initial Research Date:** November 14, 2026  
**Status:** Living Document – Continuously Maintained  

---

## 1. Scope & Objective

This document captures primary technical research conducted against current official documentation, specifications, API endpoints, rate limits, pricing models, and security architectures. It serves as the single source of truth for validated technical assumptions across the Jarvis ecosystem.

---

## 2. Findings Log

### Entry 001: OpenRouter AI Gateway Architecture, Model Catalog, & Cost Telemetry
- **Topic:** AI Gateway, Model Discovery, Pricing, and Telemetry
- **Source URL:** [OpenRouter API Docs](https://openrouter.ai/docs) | [OpenRouter Models Endpoint](https://openrouter.ai/api/v1/models) | [OpenRouter Generation Endpoint](https://openrouter.ai/api/v1/generation)
- **Date Checked:** November 14, 2026
- **Key Findings:**
  1. **Base URL & Protocols:** OpenRouter uses `https://openrouter.ai/api/v1` and maintains OpenAI-compatible chat completion endpoints (`/chat/completions`). Required headers include `Authorization: Bearer sk-or-v1-...`, with optional attribution headers `HTTP-Referer` and `X-Title`.
  2. **Free-Tier Architecture:** OpenRouter maintains a rolling tier of 25+ `:free` models (e.g., `openrouter/free` dynamic router, `meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free`). Free tier requests are capped at 50 requests/day for unverified accounts, expandable to 1,000 requests/day with a one-time minimum credit purchase ($10, non-expiring and unconsumed by free model calls).
  3. **Zero-Markup Policy & Paid Models:** Base token prices mirror upstream provider costs (Anthropic, DeepSeek, Google, OpenAI). Credit purchases incur standard payment processing fees (~5.0% - 5.5%). Paid model invocation requires explicit human approval under Jarvis governance.
  4. **Dynamic Model Catalog Discovery:** `GET /api/v1/models` returns real-time model statuses, context window limits, modality capabilities, and prompt/completion pricing per 1M tokens. Never hardcode models as permanently available; query this endpoint dynamically.
  5. **Telemetry & Actual Billing:** OpenRouter exposes `GET /api/v1/generation?id={generation_id}`. This endpoint returns the exact charged cost, prompt tokens, completion tokens, reasoning tokens, cache discount status, and provider routing waterfall. Jarvis must store both estimated upfront cost and actual confirmed generation telemetry.

### Entry 002: Supabase Architecture – PostgreSQL, pgvector, and pgmq Queues
- **Topic:** Relational Persistence, Vector Memory, and Native Background Queuing
- **Source URL:** [Supabase Queues / pgmq](https://supabase.com/docs/guides/queues) | [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns) | [Supabase RLS & Security Invoker](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Date Checked:** November 14, 2026
- **Key Findings:**
  1. **Native Background Queueing (`pgmq`):** Supabase natively supports message queueing via the PostgreSQL `pgmq` extension. Queues are created using `select pgmq.create('queue_name')`. Messages are enqueued via `pgmq.send()`, read with visibility timeouts via `pgmq.read(queue_name, vt_seconds, batch_size)`, and acknowledged via `pgmq.delete()` or `pgmq.archive()`. This eliminates the operational overhead of external Redis/SQS brokers while providing transactional atomicity.
  2. **Vector Memory & Indexing:** Postgres `pgvector` allows embedding persistence and cosine similarity searches directly within the database (`vector_cosine_ops` using HNSW or IVFFlat indexing). Full-text search (`tsvector` / `tsquery`) provides reliable keyword fallback.
  3. **Row Level Security (RLS) Rules:**
     - Exposed schema tables (`public`) must have RLS enabled.
     - Deprecated syntax `auth.role() = 'authenticated'` must be avoided in favor of `TO authenticated`.
     - Combining `TO authenticated` with ownership predicate `USING ((select auth.uid()) = user_id)` prevents IDOR/BOLA.
     - `UPDATE` policies require both `USING` and `WITH CHECK` clauses to prevent tenant re-assignment.
     - Database views must specify `WITH (security_invoker = true)` to avoid bypassing underlying RLS.
     - Functions must prefer `SECURITY INVOKER` unless strictly isolated in private non-exposed schemas.

### Entry 003: GitHub App Architecture, Scoped Tokens, & Workflow Dispatch
- **Topic:** Repository Automation, Least-Privilege Access, and Isolated Runner Dispatch
- **Source URL:** [GitHub REST API – Apps](https://docs.github.com/en/rest/apps/apps) | [GitHub Actions Workflow Dispatch](https://docs.github.com/en/rest/actions/workflows)
- **Date Checked:** November 14, 2026
- **Key Findings:**
  1. **GitHub App Authentication:** Authenticate as an App using an asymmetric RSA Private Key signing a RS256 JWT (valid for 10 minutes maximum). Generate short-lived installation access tokens via `POST /app/installations/{installation_id}/access_tokens`.
  2. **Short-Lived & Scoped Credentials:** Installation access tokens expire after exactly 60 minutes (`ghs_...` format). Jarvis can scope the token to a single repository and restrict permissions (`contents: write`, `pull_requests: write`, `issues: write`).
  3. **Asynchronous Execution via Workflow Dispatch:** Trigger runner workflows using `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` with ref (branch/tag) and JSON payload inputs. Workflow dispatch returns `204 No Content` asynchronously; execution tracking requires polling `GET /repos/{owner}/{repo}/actions/runs` filtered by event and branch.
  4. **Security Boundary:** Untrusted code from external issues/PRs or generated by coding agents must run exclusively inside ephemeral GitHub-hosted runners (`ubuntu-latest`) inside isolated Docker containers without repository write credentials or Jarvis master secrets.

### Entry 004: Telegram Bot API – Webhook Architecture & Security
- **Topic:** Remote Command Intake, Mobile Approvals, and Webhook Verification
- **Source URL:** [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- **Date Checked:** November 14, 2026
- **Key Findings:**
  1. **Webhook Security:** Webhooks configured via `setWebhook` support `secret_token` (1 to 256 alphanumeric characters, dashes, and underscores).
  2. **Header Verification:** Telegram delivers the secret token in header `X-Telegram-Bot-Api-Secret-Token`. Jarvis edge functions / route handlers must validate this header using constant-time string comparison (`crypto.timingSafeEqual`) before parsing incoming updates.
  3. **Unified Backend State:** Telegram updates translate into standard Jarvis Command Envelope objects submitted to the Agent Orchestrator. State changes emit notifications back to Telegram and the Web Dashboard simultaneously via Supabase Realtime and Telegram Bot API outgoing messages.

### Entry 005: Aider CLI Architecture & Headless Non-Interactive Mode
- **Topic:** Autonomous Coding Agent Execution Adapter
- **Source URL:** [Aider Scripting & Headless Mode](https://aider.chat/docs/usage/scripting.html) | [Aider Model Settings](https://aider.chat/docs/config/models.html)
- **Date Checked:** November 14, 2026
- **Key Findings:**
  1. **Non-Interactive Invocation:** Aider supports single-instruction headless execution using `aider --message "<prompt>" <files>`.
  2. **Automation Flags:** `--yes` (or `--yes-always`) bypasses interactive confirmation prompts; `--no-auto-commits` lets Jarvis runner manage git commits deterministically; `--dry-run` allows planning checks.
  3. **OpenRouter Model Integration:** Models are invoked via `--model openrouter/<provider>/<model_name>` with `OPENROUTER_API_KEY` passed as an environment variable in the isolated runner container.
  4. **Adapter Isolation:** The coding agent adapter must remain decoupled behind a standard interface (`ICodingAgentAdapter`) so Aider can be replaced or complemented by custom agent runners or other CLI tools without refactoring core orchestrator logic.

---

## 3. Technical Constraints & Budget Boundaries

| Parameter | Limit | Enforcement Mechanism |
|---|---|---|
| Monthly Budget | INR 750 (Max INR 1,000 with Reserve) | Hard stop enforced by `BudgetManager` pre-flight check |
| Daily Spending Limit | INR 25 | Resets daily at 00:00 UTC; alerts sent at 80% usage |
| Emergency Reserve | INR 250 | Requires explicit human approval via Telegram/Dashboard |
| Free Models Preference | Primary default (`:free` suffix) | Zero token cost; enforces daily request quota ceiling |
| Paid Model Invocations | Blocked by default | Requires explicit single-use approval ticket |
| Database Tier | Supabase Free tier initially | Versioned migrations ensure 100% Docker-Compose self-hosted portability |
| Compute Infrastructure | Ephemeral GitHub Actions runners | 0 permanent VPS cost; isolated ephemeral execution |
| Production Branch Protection| Protected `main` branch | No automated agent pushes directly; PRs require human review |

---

## 4. Architectural Verification Checklist
- [x] OpenRouter API contracts and `/api/v1/generation` telemetry validated.
- [x] Supabase `pgmq` queue syntax and visibility timeout behavior verified.
- [x] Supabase RLS security invoker and token validation rules confirmed.
- [x] GitHub App token issuance and workflow dispatch parameters documented.
- [x] Telegram Bot API `secret_token` header validation specified.
- [x] Aider CLI headless flags and OpenRouter model syntax verified.
