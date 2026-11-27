# JARVIS — Technical Research & Verification Log

**Document:** `docs/RESEARCH_LOG.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date Checked:** 2026-11-15  

---

## 1. Overview & Verification Standards

In accordance with Section 8 of the Master Directive:
- All technical selections, API endpoints, SDK patterns, and pricing quotas are verified against official documentation.
- No research findings, API capabilities, or test results are fabricated.
- Every entry records the source URL, verification date, and concrete architectural impact.

---

## 2. Technical Research Log

### 2.1 Supabase Architecture & Quotas
- **Source:** [Supabase Platform & Pricing Documentation](https://supabase.com/docs) | [Supabase Free Plan Limits](https://supabase.com/docs/guides/platform/manage-your-usage)
- **Date Checked:** 2026-11-15
- **Verified Findings:**
  - Free Tier includes 500 MB database storage, 1 GB file storage, 2 active projects, and 50,000 MAU.
  - Projects on the free plan automatically pause after **7 consecutive days of inactivity** (zero API or database queries).
  - PostgreSQL 15 and 16 support the `vector` extension natively.
  - Local development is supported via Supabase CLI (`supabase init`, `supabase start`, `supabase db diff`, `supabase gen types typescript`).
- **Architectural Impact:**
  - Designed automated 3-day health ping (`SELECT 1;`) to prevent project pause.
  - Capped stored logs and screenshots with 30-day retention to strictly stay under 1 GB file storage.
  - Database schema written in standard portable PostgreSQL DDL, enabling 100% self-hosted compatibility.

### 2.2 OpenRouter AI Gateway & Model Pricing
- **Source:** [OpenRouter API Docs](https://openrouter.ai/docs) | [OpenRouter Models Catalog](https://openrouter.ai/models)
- **Date Checked:** 2026-11-15
- **Verified Findings:**
  - API endpoint: `https://openrouter.ai/api/v1/chat/completions` (OpenAI-compatible schema).
  - Offers permanently free or promotional free-tier models (e.g., `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `qwen/qwen-2.5-coder-32b-instruct:free`).
  - Response object provides token counts: `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`.
  - OpenRouter Generation Stats API (`https://openrouter.ai/api/v1/generation?id=:id`) returns exact USD cost charged.
- **Architectural Impact:**
  - Prioritized free-tier models in the AI Gateway hierarchy.
  - Configured hard daily ceiling of ₹25.00 INR and monthly budget of ₹750.00 INR.
  - Enforced approval-gate interceptor that halts execution when paid models are requested.

### 2.3 Next.js App Router Architecture
- **Source:** [Next.js Documentation](https://nextjs.org/docs/app)
- **Date Checked:** 2026-11-15
- **Verified Findings:**
  - React Server Components (RSC) allow direct server-side data fetching from Supabase without exposing client-side credentials.
  - Route Handlers (`app/api/*/route.ts`) provide secure REST endpoints for GitHub/Telegram webhooks and task runners.
  - Edge and Node.js runtimes available; Node.js runtime selected for complete compatibility with crypto, AST parsing, and network tools.
- **Architectural Impact:**
  - Architecture cleanly separates client UI (Orb, Command Bar, Kanban) from server-only orchestration logic.

### 2.4 GitHub Actions & Ephemeral Sandbox Runners
- **Source:** [GitHub Actions Runner Documentation](https://docs.github.com/en/actions)
- **Date Checked:** 2026-11-15
- **Verified Findings:**
  - GitHub-hosted runners (`ubuntu-latest`) provide a clean, isolated virtual machine for each workflow run.
  - Workflows can mount Docker containers directly, ensuring that user-generated code or packages cannot manipulate runner secrets or host environment.
  - GitHub App installation tokens provide fine-grained, repository-scoped access with automatic 1-hour expiration.
- **Architectural Impact:**
  - Selected GitHub Actions + Docker as the primary disposable execution sandbox.
  - Prohibited mounting master API keys or database connection strings inside runner environments.

### 2.5 Telegram Bot API
- **Source:** [Telegram Bot API Official Documentation](https://core.telegram.org/bots/api)
- **Date Checked:** 2026-11-15
- **Verified Findings:**
  - Supports long-polling (`getUpdates`) for local development without public IP or SSL cert.
  - Supports HTTPS Webhooks for production with secret verification header `X-Telegram-Bot-Api-Secret-Token`.
  - Inline keyboards (`InlineKeyboardMarkup`) allow embedding arbitrary callback data for one-click interactive approvals.
- **Architectural Impact:**
  - Built single-owner verification (`OWNER_TELEGRAM_ID`) to reject untrusted senders.
  - Designed interactive approval cards with Markdown formatting.

### 2.6 Updated Quota & Pricing Verification (2026-11-27)
- **Date Checked:** 2026-11-27
- **Supabase Free Tier** (`https://supabase.com/docs`): 500 MB database, 1 GB file storage, 5 GB egress, 50,000 MAU, 2 active projects; pauses after **7 days of inactivity** (retained up to 1 year).
- **OpenRouter Free Models** (`https://openrouter.ai/docs`): Free `:free` models and `openrouter/free` router are capped at **20 RPM** and **50 RPD** on Standard Free Tier (**1,000 RPD** unlocked after $10 lifetime credit purchase); failed requests count toward RPD.
- **GitHub Actions** (`https://docs.github.com/en/billing`): Free tier includes compute allowance equivalent to **2,000 minutes/month** on standard 2-core Linux (`ubuntu-latest`) runners for private repositories (unlimited for public repos).
- **Vercel Hobby Plan** (`https://vercel.com/docs`): $0/month personal non-commercial; includes **1,000,000 function invocations**, **4 CPU-hours**, **360 GB-hours** provisioned memory, **300s max duration** (Fluid Compute), 250 MB uncompressed bundle limit (500 MB Python), single `iad1` region. No overage billing; usage pauses on limit exhaustion.
