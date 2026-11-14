# Project Jarvis — Technology Stack & Dependency Inventory

**Document Version:** 1.0.0  
**Status:** Verified Operational Baseline  
**Environment:** Windows 11 Host / Cloud Container Deployable  

---

## 1. Verified Core Runtime Technologies

| Category | Component / Library | Verified Version | Role in Jarvis | Justification & Stability |
|---|---|---|---|---|
| **Runtime** | Python | 3.12.10 (AMD64) | Primary Control & Execution Runtime | Stable LTS Python with modern typing, native UTC datetime, subinterpreters |
| **Runtime** | Node.js | v24.22.1 | Presentation Plane Build Runtime | Modern Node LTS support for Next.js 15 |
| **Package Manager**| pnpm | 10.5.2 | Frontend Package Management | Fast, deterministic hard-linked package management |
| **Web Framework** | FastAPI | 0.115.6 | Control Plane REST Gateway | High-performance async ASGI web framework with OpenAPI docs |
| **ASGI Server** | Uvicorn | 0.34.0 | ASGI HTTP & WebSocket Server | Production-grade standard ASGI server |
| **Data Validation**| Pydantic / Settings | 2.10.4 / 2.7.0 | Schema Validation & Env Configuration | Compile-time and runtime type validation |
| **Database ORM** | SQLAlchemy | 2.0.36 | Async Database Access Layer | Modern async session architecture with 2.0 style syntax |
| **Async Drivers** | aiosqlite / psycopg | 0.20.0 / 3.2.3 | SQLite (Dev) & PostgreSQL (Prod) | Non-blocking async database operations |
| **Migrations** | Alembic | 1.14.0 | Database Schema Migrations | Standard declarative schema versioning |
| **Agent Graph** | LangGraph | 0.2.60 | StateGraph Task Workflow Orchestrator | Graph-based cycle handling, checkpointing, and human interrupts |
| **Checkpointer** | MemorySaver / Postgres | 2.0.2 | Durable Task State Persistence | Crash-recovery and resumable workflow state |
| **Cryptography** | cryptography / Argon2 | 44.0.0 / 23.1.0 | Passwords, AES-256 Fernet, RS256 | OWASP-recommended Argon2id and Fernet encryption |
| **Token Auth** | PyJWT | 2.10.1 | JWT session token minting & verification | Lightweight, RFC 7519 compliant JWT handler |
| **HTTP Client** | httpx | 0.28.1 | Async Outbound API Client | Full async support for GitHub, Telegram, OpenRouter APIs |
| **Structured Logs**| structlog | 24.4.0 | Machine-Readable JSON Logging | Contextual, key-value structured event logging |
| **Mobile Intake** | python-telegram-bot | 21.9 | Telegram Bot Interface | Async event handling for mobile push commands |
| **Frontend Framework**| Next.js | 15.0.3 | Presentation Dashboard | React 19 Server Components, App Router, PWA-ready |
| **UI Library** | React / React-DOM | 19.0.0 | Frontend View Layer | Modern React concurrent rendering |
| **Styling** | TailwindCSS | 3.4.15 | HUD Styling System | Atomic utility-first CSS design |
| **Icons** | Lucide React | 0.460.0 | Dashboard Iconography | High-density SVG icons |
| **Error Tracking** | Sentry SDK | 2.19.2 (Backend), 11.12.0 (Frontend) | Observability & Crash Reporting | Distributed tracing and error alerting |

---

## 2. External Service & Cloud Dependencies

1. **OpenRouter API (`openrouter.ai`):** Primary universal AI gateway configured with `openrouter/auto`. Dynamically meta-routes code generation and architectural planning tasks to the highest-performing available frontier models (Gemini 2.0 Flash, Claude 3.5 Sonnet, DeepSeek V3/R1, Llama 3.3) with automated fallback.
2. **GitHub REST & GraphQL API (`api.github.com`):** GitHub App authentication, repository discovery, branch creation, commit creation, and Pull Request authoring.
3. **Telegram Bot API (`api.telegram.org`):** Mobile notification dispatch and command intake via long-polling or webhooks.
4. **Supabase / Render / Self-Hosted Docker:** PostgreSQL 16 managed database and container deployment targets.

