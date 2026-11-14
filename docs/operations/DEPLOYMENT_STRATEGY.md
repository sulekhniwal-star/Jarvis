# Deployment Strategy Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend & DevSecOps Engineer  
**Date:** November 14, 2026  

---

## 1. Hosting Topology & Cost Boundaries

Jarvis is architected to operate at zero or minimal hosting cost during initial personal operations, strictly avoiding unapproved paid VPS expenses.

```
[ User Clients ] ────► [ Vercel Hobby Tier ] (Next.js Dashboard & Webhook Routes)
                              │
                              ▼ (HTTPS / Supabase Client)
                       [ Supabase Managed Free Tier ]
                       ├── PostgreSQL 15+ & RLS
                       ├── pgmq (Native Background Queues)
                       ├── pgvector (Embeddings Store)
                       ├── Supabase Auth & Storage
                              │
                              ▼ (Workflow Dispatch REST API)
                       [ GitHub-Hosted Actions Runners ]
                       └── Ephemeral ubuntu-latest VM (Aider + Docker Sandbox)
```

---

## 2. Platform Allocations

1. **Next.js Dashboard & API Ingress (Vercel Hobby Tier):**
   - Hosts the web dashboard, Telegram webhook handler, and GitHub webhook listener.
   - Enforces personal, non-commercial usage terms.
2. **Backend & Persistence (Supabase Managed Free Tier):**
   - Hosts relational data, message queues (`pgmq`), vector embeddings (`pgvector`), and build artifacts (Storage).
   - Migrations are managed deterministically via Supabase CLI.
3. **Coding Compute (GitHub-Hosted Runners):**
   - Executes coding agents and test suites on-demand.
   - Provides fresh, clean virtual machines per job with zero persistent maintenance cost.

---

## 3. Self-Hosted Portability (Docker Compose)

To safeguard against managed platform lock-in or future quota limits, Jarvis maintains 100% portability to a self-hosted Docker Compose stack:
- Location: `infra/deployment/docker-compose.self-hosted.yml`
- Includes: PostgreSQL with `pgvector` and `pgmq` extensions, PostgREST, GoTrue Auth, and Storage.
- Migration to self-hosted requires only updating connection strings; application code remains untouched.

---

## 4. Environment Variables & Secret Management

All secrets are injected exclusively via environment variables:

| Variable | Target Environment | Sensitivity | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Public) | Low | Supabase API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (Public) | Low | Supabase anon key for public dashboard auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Secret) | Critical | Master key for server-side orchestrator tasks |
| `OPENROUTER_API_KEY` | Vercel (Secret) | High | Master API key for OpenRouter gateway |
| `TELEGRAM_BOT_TOKEN` | Vercel (Secret) | High | Telegram Bot API authentication token |
| `TELEGRAM_WEBHOOK_SECRET` | Vercel (Secret) | High | High-entropy secret for Telegram webhook header |
| `GITHUB_APP_ID` | Vercel (Secret) | Medium | Registered GitHub App Identifier |
| `GITHUB_APP_PRIVATE_KEY` | Vercel (Secret) | Critical | RSA private key for minting GitHub App JWTs |
| `GITHUB_WEBHOOK_SECRET` | Vercel (Secret) | High | Secret for verifying GitHub webhook HMAC signatures |
