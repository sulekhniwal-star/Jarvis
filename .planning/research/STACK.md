# Technology Stack Evaluation & Recommendations — Jarvis

## Core Stack

### 1. Web Framework: Next.js 15+ (App Router)
- **Features:** Server Components for secure data fetching, Route Handlers for API endpoints, Server Actions for mutations.
- **Styling:** Tailwind CSS with CSS variables adhering to `UI_DESIGN_SYSTEM.md`.
- **Components:** Radix UI / shadcn/ui for accessible, unstyled primitives styled with custom Jarvis cinematic dark theme tokens.
- **Icons:** Lucide React for consistent UI iconography.

### 2. Database & State Store: Supabase (PostgreSQL 15+)
- **Local Dev:** Supabase CLI running in Docker on Windows 11.
- **Extensions:**
  - `uuid-ossp` or `pgcrypto` for UUID primary keys.
  - `pgvector` for long-term memory embeddings.
  - `pgmq` / PostgreSQL queues for job queuing and state transitions.
- **Security:** RLS enabled on all tables; strict owner isolation using `auth.uid() = user_id`.
- **Typing:** Automated TypeScript definitions generation via `supabase gen types typescript`.

### 3. AI Gateway: OpenRouter API
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Model Strategy:**
  - Priority 1: Free high-capability models (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-r1:free`).
  - Priority 2: Failover to alternative free models.
  - Priority 3: Paid inference halted; requires explicit approval.
- **Accounting:** Log prompt tokens, completion tokens, model ID, latency, and estimated/actual cost.

### 4. Version Control & Repository Guard
- **Branch Strategy:** Main-only (`main`).
- **Validation Hook / Module:** Custom TypeScript Git safety validator checking:
  - Active branch is `main`.
  - Working tree dirty status.
  - Remote is `origin`.
  - Rejection of checkout/branch creation commands.

### 5. Coding Agent Candidate: Aider
- **Architecture:** Packaged into ephemeral Docker container.
- **Integration:** Invoked via headless CLI execution (`aider --yes --no-auto-commits ...`), reporting diffs and terminal transcript back to Jarvis coordinator.
