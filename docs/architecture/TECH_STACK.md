# Technology Stack Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend Engineer & Principal Systems Architect  
**Date:** November 14, 2026  

---

## 1. Core Technology Matrix

| Layer / Domain | Selected Technology | Version / Spec | Primary Rationale | Alternative Evaluated | Why Alternative Rejected |
|---|---|---|---|---|---|
| **Package Manager** | `pnpm` | 10.x / 12.x | Strict workspace dependency resolution, content-addressable storage, symlink safety | `npm`, `yarn` | Slower, flat `node_modules` causes phantom dependency leaks |
| **Monorepo Build System** | `Turborepo` | 2.x | High-speed remote caching, declarative task pipelines, minimal configuration | `Nx` | Higher configuration complexity for solo architect footprint |
| **Primary Language** | `TypeScript` | 5.7+ | Strict type safety, shared domain models across front/backend, broad ecosystem | `Go`, `Rust` | Slower iteration for rich AI agent and web orchestration layers |
| **Worker / ML Language** | `Python` | 3.12+ | Standard ecosystem for AI analysis, code parsing (Tree-sitter), PyTorch/math | `TypeScript only` | Lacks specialized libraries for AST analysis and deep search tooling |
| **Web Framework** | `Next.js` | 15+ (App Router) | React Server Components, streaming UI, built-in edge runtime, Vercel zero-config | `Vite + SPA` | Requires separate API layer, weaker SSR/SEO for project portals |
| **Styling & UI Library** | `Tailwind CSS` + `shadcn/ui` | Tailwind v4 / React 19 | Accessible primitives, zero runtime overhead, copy-paste ownership | `Material UI`, `Chakra` | Heavy bundle size, runtime CSS-in-JS overhead |
| **Primary Database** | `PostgreSQL` via `Supabase` | PostgreSQL 15+ | Relational integrity, built-in RLS, extensions (`pgvector`, `pgmq`, `pg_cron`) | `MongoDB`, `DynamoDB` | Lacks ACID transactional queues, vector similarity, and robust RLS |
| **Message Queueing** | `pgmq` (Supabase Queues) | Native extension | Zero additional infrastructure; transactional atomicity with database records | `RabbitMQ`, `Redis/BullMQ` | Additional paid VPS/hosting required; no shared DB transaction |
| **Vector Embeddings** | `pgvector` | Native extension | Co-located embeddings with relational entities; cosine similarity (`vector_cosine_ops`) | `Pinecone`, `Qdrant` | Separate billing tier, network latency, external security boundary |
| **AI Gateway** | `OpenRouter API` | v1 (OpenAI compatible) | Aggregates 100+ providers, rolling `:free` tier, zero markup, granular cost telemetry | `Direct OpenAI / Anthropic` | Vendor lock-in, no free tier fallback, complex multi-key billing |
| **Coding Agent Engine** | `Aider CLI` | Latest stable | Headless scripted mode (`--message`), git-native diff engine, multi-file awareness | `Raw LLM scripts` | Fragile diff parsing, high token consumption, poor error recovery |
| **Sandboxed Compute** | `GitHub Actions` + `Docker` | Ephemeral ubuntu-latest | Zero cost for public repos / low cost private, clean VM per run, secrets isolation | `Self-hosted VPS runner` | Security risk: untrusted code could compromise persistent server |
| **Remote Mobile Channel** | `Telegram Bot API` | v7+ | Instant mobile alerts, inline keyboards for approval tickets, zero cost, secure webhooks | `Discord`, `Slack` | Slack pricing limits history; Telegram delivers superior low-latency mobile UX |
| **Validation & Schema** | `Zod` | 3.23+ | Runtime schema validation, inferred TypeScript types, JSON schema serialization | `Yup`, `TypeBox` | Zod has native ecosystem alignment with Next.js, tRPC, and AI SDKs |

---

## 2. Language Rationale & Inter-Process Communication

### 2.1 TypeScript (Control Plane, APIs, Dashboard)
TypeScript serves as the default language across the Jarvis control plane:
- Enforces strict contracts via Zod schemas in `@jarvis/shared-contracts`.
- Enables end-to-end type safety between database tables, API routes, and React components.
- Powers the Agent Orchestrator, Budget Manager, and Telegram Bot webhook handlers.

### 2.2 Python (Specialized Workers & Automation)
Python is reserved exclusively for tasks where the Python ecosystem provides clear structural advantages:
- Parsing Abstract Syntax Trees (Tree-sitter, AST) for language refactoring.
- Specialized data analysis, repo health metrics, and automated research scraping.
- Python workers are invoked via strictly typed JSON-over-HTTP or `pgmq` message queues with schemas defined in `@jarvis/shared-contracts`. No shared memory or untyped IPC is permitted.

---

## 3. Database & Storage Architecture

1. **Local Development:**
   - Managed via official `supabase` CLI and Docker Desktop.
   - Migrations live under `supabase/migrations/` using timestamped naming (`YYYYMMDDHHMMSS_name.sql`).
   - Types generated via `supabase gen types typescript --local > packages/database/src/types.ts`.
2. **Production Hosting:**
   - Initial deployment on Supabase Free tier.
   - Long-term portability: The database schema, extensions (`pgvector`, `pgmq`), and RLS policies are 100% compliant with standard PostgreSQL 15+ Docker images, ensuring seamless migration to a self-hosted Docker Compose deployment if quotas demand.

---

## 4. Quality & Security Tooling

- **Linter & Formatter:** ESLint 9+ (Flat Config) + Prettier.
- **Static Analysis & Security:**
  - `Semgrep`: Static analysis for detecting OWASP Top 10 vulnerabilities in generated code.
  - `Trivy`: Container and dependency vulnerability scanner.
  - `Gitleaks`: Secret scanning in pre-commit hooks and GitHub Actions.
- **Testing Frameworks:**
  - `Vitest`: High-speed unit and integration testing across TypeScript packages.
  - `Playwright`: End-to-end testing for Web Dashboard user flows and approval modals.
  - `pytest`: Unit and regression test suite for Python workers.
