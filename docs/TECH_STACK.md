# JARVIS — Technology Stack Specification

**Document:** `docs/TECH_STACK.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Stack Overview & Selection Criteria

The Jarvis technology stack is selected based on five non-negotiable criteria:
1. **Developer Productivity & Type Safety:** Comprehensive end-to-end TypeScript types across client, server, and database.
2. **Zero-Cost / Low-Cost Baseline:** Usable on free-tier infrastructure (Vercel hobby, Supabase free, GitHub Actions free public/private runner allowances, OpenRouter free models) with strict local self-hostability.
3. **Resilience & Portability:** Avoid proprietary vendor lock-in. Ensure seamless migration from Supabase Cloud to self-hosted Docker on standard Linux/Windows hosts.
4. **Isolated Execution:** Strict sandboxing for untrusted AI-generated code.
5. **Modern, Accessible UI:** Cinematic, accessible dark-mode UI with robust component primitives.

---

## 2. Core Technology Matrix

| Layer | Component | Version / Spec | License | Cost Profile | Rationale & Trade-offs |
|---|---|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 14.2+ / 15.x | MIT | Free | React Server Components for secure data fetching, fast streaming, and cohesive fullstack architecture. |
| **Language (Platform)** | TypeScript | 5.4+ | Apache 2.0 | Free | Strict type safety, shared interfaces across frontend and API route handlers. |
| **Styling & Design** | Tailwind CSS | 3.4+ / 4.x | MIT | Free | Utility-first styling enabling custom cinematic color palette and token systems. |
| **Component Library** | shadcn/ui + Radix UI | Latest | MIT | Free | Unstyled, accessible, composable headless UI components with total code ownership. |
| **Icons & Visuals** | Lucide React + Canvas/WebGL | Latest | ISC / MIT | Free | Lightweight vector icons; custom Canvas/Three.js shader for the Holographic Orb. |
| **Database & Auth** | Supabase (PostgreSQL) | PostgreSQL 15.x / 16.x | Apache 2.0 / PostgreSQL | Free Tier / Self-hostable | Managed database, GoTrue auth, Row Level Security (RLS), S3-compatible storage, and Realtime pub/sub. |
| **Vector Storage** | `pgvector` | 0.5+ / 0.7+ | PostgreSQL | Free | Vector similarity search directly in PostgreSQL, eliminating separate vector database infrastructure. |
| **Work Queues** | `pgmq` / PostgreSQL Queues | Latest | PostgreSQL | Free | ACID-compliant, durable message queueing inside PostgreSQL, enabling worker reliability. |
| **AI Gateway** | OpenRouter API | v1 REST API | Proprietary API | Free Tier primary | Model-agnostic gateway supporting Llama 3.3, Gemini 2.0 Flash, Qwen 2.5 Coder. Strict approval for paid usage. |
| **Coding Agent Engine** | Aider (Adapter-wrapped) | 0.50+ | Apache 2.0 | Free (CLI) | State-of-the-art terminal coding agent with git-aware diff editing; wrapped behind generic interface. |
| **Execution Sandbox** | GitHub Actions + Docker | ubuntu-latest | MIT (Actions) | Free tier minutes | Ephemeral, isolated runner environment; destroys untrusted build artifacts upon job completion. |
| **Specialized AI Service** | Python | 3.11+ | PSF | Free | Rich ecosystem for AST parsing, code chunking, tree-sitter integration, and scientific analysis. |
| **Mobile / Messaging** | Telegram Bot API | v7.x | MIT | Free | Zero-cost mobile push notifications, interactive keyboard approvals, and task submission. |
| **Testing (Platform)** | Vitest + Testing Library | Latest | MIT | Free | Fast, ESM-native unit and integration test runner with Jest-compatible syntax. |
| **Testing (E2E)** | Playwright | Latest | Apache 2.0 | Free | Headless browser testing for end-to-end user journeys and screenshot verification. |
| **Testing (Python)** | Pytest | 8.x | MIT | Free | Standard Python testing framework for worker scripts and AST analyzers. |
| **Code Quality** | ESLint + Prettier + Ruff | Latest | MIT | Free | Multi-language linting, formatting, and security static analysis. |

---

## 3. Detailed Component Architecture

### 3.1 Next.js App Router Architecture
- **Directory Structure:**
  - `app/(auth)/`: Sign-in, sign-up, password recovery routes.
  - `app/(dashboard)/`: Authenticated dashboard layouts, Home (Orb), Projects, Tasks, Approvals, Agents, Memory, Analytics, Settings.
  - `app/api/`: REST endpoints for webhooks (GitHub, Telegram), agent task dispatch, and status polling.
  - `components/ui/`: shadcn/ui primitive components.
  - `components/dashboard/`: Project-specific widgets (Orb, AgentGraph, ApprovalCard, BudgetMeter).
  - `lib/`: Shared utilities (Supabase server/client, OpenRouter client, permission engine, logger).
  - `types/`: Shared TypeScript interfaces and database schemas.

### 3.2 Supabase & Database Architecture
- **Local Development:** Managed via `supabase/config.toml` and Docker Compose. Migrations stored in `supabase/migrations/`.
- **Database Types:** Automatically generated via `supabase gen types typescript --local > types/supabase.ts`.
- **Portability:** All tables, foreign keys, RLS policies, and functions avoid Supabase Cloud proprietary features. Can be exported via standard `pg_dump` and restored to any standard PostgreSQL instance.

### 3.3 AI Gateway Adapter Layer
- **Interface:** `IAIGateway` defining `chatCompletion()`, `streamCompletion()`, and `calculateCost()`.
- **Model Hierarchy:**
  1. *Primary Free Models:* `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `qwen/qwen-2.5-coder-32b-instruct:free`.
  2. *Paid Models (Approval Gated):* `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`.
- **Safety Interceptor:** Verifies available daily budget (<= INR 25) before dispatching any billable token request.

### 3.4 Python Service Contract
- **Protocol:** HTTP JSON-RPC or REST microservice running locally or in Docker.
- **Contract Schema:** Defined via shared Pydantic / TypeScript models:
  - Input: `{ "repository_path": string, "task_type": "ast_parse" | "chunk_code", "params": object }`
  - Output: `{ "status": "success" | "error", "data": object, "error": string | null }`

---

## 4. Hardware & Environment Compatibility

- **Host Operating System:** Windows 11 (fully supported; scripts provided in PowerShell `.ps1` and Bash `.sh`).
- **RAM Footprint:** Engineered to stay well within 16 GB host memory:
  - Next.js development server: ~250 MB
  - Local Supabase (Docker containers): ~1.2 GB
  - Python worker: ~150 MB
  - Ephemeral test runs: delegated to GitHub Actions runners where possible.
- **Cloud Independence:** Production deployment on Vercel + Supabase Cloud operates 24/7 without requiring the host laptop to remain online.
