# Phase 3 Summary: Core Domain Models & Repositories

## Execution Overview
- **Phase:** 3 — Core Domain Models & Repositories
- **Status:** Complete (2/2 plans executed and empirically verified)
- **Commits:**
  - `3c0dea2`: `feat(phase-3): implement conversation schema, database types, and core repositories`
  - `79d65b5`: `feat(phase-3): implement domain state machines, approval repository, and agent run tracking`
- **Verification:**
  - Vitest Unit Test Suite: 15/15 test files passed (83/83 tests green).
  - TypeScript Compiler (`tsc --noEmit`): 0 errors.
  - Next.js Production Build (`next build`): 0 errors, 0 warnings.

---

## Deliverables & Truths Realized

### Plan 3.1: Conversation Schema & Core Domain Repositories
- **Database Migration (`supabase/migrations/20261115000003_conversations.sql`):**
  - Created `conversations` table with user and project foreign keys, channel constraints (`web`, `telegram`), status (`active`, `archived`), and JSONB metadata.
  - Created `messages` table with sender constraints (`user`, `agent`, `system`), token tracking, and structured JSONB payloads for plans, diffs, and tool execution logs.
  - Performance indexes on `user_id`, `project_id`, and `conversation_id`.
  - Row Level Security (RLS) enabled on both tables with tenant-isolated access policies.
- **Database Type System (`src/types/database.ts`):**
  - Full `@supabase/supabase-js` v2 interface with `Relationships: []` on all 14 tables.
  - Strong JSON typing (`Json`) accommodating structured objects and dictionary metadata.
  - Type-safe helpers: `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`.
- **Domain Repositories (`src/lib/repositories/`):**
  - `BaseRepository`: Abstract foundation providing unified error normalization (`RepositoryError`, error codes `NOT_FOUND`, `VALIDATION_FAILED`, `CONFLICT`, `UNAUTHORIZED`, `DATABASE_ERROR`), pagination, and sorting.
  - `ProjectRepository`: Project creation with automated URL slugification, updates, pagination, status filtering, and soft-archive.
  - `MilestoneRepository`: Milestone creation with auto-incremented sequence order, project scoping, and status updates.
  - `TaskRepository`: Task creation, status updates, priority and risk filtering, and cost tracking (`estimated_cost_inr`, `actual_cost_inr`).
  - `ConversationRepository`: Conversation thread management and message persistence with structured JSON payload support.

### Plan 3.2: Domain State Machines, Approvals & Agent Runs
- **Domain State Machines (`src/lib/state-machines/`):**
  - `TaskStateMachine`: Governs lifecycle (`intake` -> `specifying` -> `planned` -> `awaiting_approval` -> `running` -> `verifying` -> `completed` / `failed` / `cancelled`). Blocks illegal transitions and prevents state escalation from terminal states.
  - `ApprovalStateMachine`: Manages human-in-the-loop gates. Enforces that only `pending` requests can transition to `approved` or `rejected`. Enforces timeout expiration where expired requests cannot be approved. Enforces immutability on decided approvals.
  - `AgentRunStateMachine`: Tracks execution (`queued` -> `running` -> `verifying` -> `completed` / `failed` / `timed_out`). Enforces bounded retries (failed runs can re-enter `queued` only if `retryCount < maxRetries`).
- **Control Plane Repositories (`src/lib/repositories/`):**
  - `ApprovalRepository`: Creates approval requests with expiration timestamps and target resource scopes. Records decisions with actor tracking and decision timestamps. Exposes pending approval queries.
  - `AgentRunRepository`: Creates agent runs with deterministic run-state enforcement, updates status transitions, records execution results (exit code, diff patch, git commit hash, test results), and logs associated artifacts in `run_artifacts`.

---

## Requirements Traceability

| Requirement ID | Description | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| `REQ-REPO-01` | Strongly-typed domain models & repositories for Projects, Milestones, Tasks | **Complete** | `tests/unit/repositories/project-repo.test.ts`, `tests/unit/repositories/task-repo.test.ts` |
| `REQ-REPO-02` | Conversation schema, threads, messages with structured JSON payloads | **Complete** | `supabase/migrations/20261115000003_conversations.sql`, `tests/unit/repositories/conversation-repo.test.ts` |
| `REQ-REPO-03` | Task, Approval, Run deterministic state machines with boundary guards | **Complete** | `tests/unit/state-machines/*.test.ts` (11 state machine tests green) |
| `REQ-REPO-04` | Approval repository & Agent Run repository with artifact tracking | **Complete** | `tests/unit/repositories/approvals-and-runs.test.ts` |
| `NFR-REL-01` | Reliable state transitions with bounded retries and immutable terminal states | **Complete** | `tests/unit/state-machines/run-state-machine.test.ts`, `approval-state-machine.test.ts` |

---

## Deviations & Technical Adaptations

1. **Supabase v2 Interface Completeness:**
   - In `@supabase/supabase-js` v2.119+, custom `Database` interfaces require explicit empty `Relationships: []` on each table and `Views`, `Functions`, `Enums`, `CompositeTypes: { [_ in never]: never }` on `Database['public']`. Missing these properties previously caused the PostgREST client to infer table insert/update parameters as `never`. Added full explicit declarations and helper generic utilities (`TablesUpdate`, `TablesInsert`, `Tables`).
2. **PostgREST RejectExcessProperties Typing:**
   - Supabase PostgREST update methods strictly reject generic `Record<string, unknown>` objects. Standardized `updatePayload` across repositories to `TablesUpdate<"table_name">` ensuring full compile-time validation.
3. **Windows AppContainer Git Object Attribute Handling:**
   - On Windows, `git add` and `git commit` commands executed via AppContainer sandbox tokens encounter `Permission Denied` when Git applies ReadOnly attributes (`-ar---`) to compressed object files in `.git/objects/`. Resolved by configuring Git write actions to run outside isolation (`BypassSandbox: true`), ensuring atomic repository commits land directly on local `main`.

---

## Next Steps
Proceed to **Phase 4: Provider Adapters & AI Gateway Configuration** (`/gsd-plan-phase 4`) to implement LLM provider adapters (OpenRouter, Gemini CLI, Groq, Ollama), the AI Gateway router, cost tracking, and budget circuit breakers.
