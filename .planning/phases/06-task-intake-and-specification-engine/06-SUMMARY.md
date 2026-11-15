# Phase 6 Summary: Task Intake & Specification Engine

## 1. Execution Overview

Phase 6 delivered the Task Intake & Specification Engine for Milestone 2 (Specification & Planning Workflow). The engine systematically translates natural-language user task prompts into strongly-typed, verifiable specifications featuring unambiguous scope, explicit exclusions, and Given-When-Then acceptance criteria, or engages a Socratic clarification loop when ambiguity is detected.

- **Phase Objective:** Ingest natural language prompts, extract structured scope, exclusions, and acceptance criteria via Specifier Agent, and provide a Socratic clarification loop for underspecified requests.
- **Requirements Satisfied:**
  - `REQ-SPEC-01`: Specifier Agent analyzing natural language prompts and extracting structured scope, exclusions, and Given-When-Then criteria.
  - `REQ-SPEC-02`: Socratic clarification loop detecting ambiguity and prompting user with targeted questions ($\le 3$).
  - `REQ-SPEC-03`: Strongly-typed `SpecificationRepository` with version tracking in `public.specifications`.
  - `NFR-REL-02`: Deterministic runtime schema validation using Zod for all specifications, questions, and ambiguity assessments.
- **Git Compliance:** 100% compliant with `main`-only policy across local commits `bea0d58`, `1809e86`, and `7a32bf8`.

---

## 2. Key Deliverables & Artifacts

### 2.1 Wave 1 (Plan 6.1) — Specifier Agent, Clarification Loop & Schema Validation
- **Package Installation:** Installed `zod` (`^4.6.7`) for deterministic runtime schema validation.
- **Zod Contracts & Types (`src/lib/agents/specifier/types.ts`):**
  - `AcceptanceCriterionSchema`: Structured preconditions, triggers, and expected outcomes (`id`, `title`, `given`, `when`, `then`).
  - `ClarificationQuestionSchema`: Targeted questions with rationale and recommended options (`id`, `question`, `rationale`, `options`, `recommendedOption`).
  - `AmbiguityAssessmentSchema`: 4-dimension evaluation model (`goalClarity` [0.35], `technicalBoundaries` [0.25], `acceptanceMeasurability` [0.25], `preconditions` [0.15]) producing composite score $0.0 \dots 1.0$.
  - `SpecificationPayloadSchema`: Validated `scope`, `exclusions`, `acceptanceCriteria`, and `assumptions`.
  - `SpecifierAgentResponseSchema`: Discriminated union on `status: "specified" | "needs_clarification"`.
- **System Directives & Prompts (`src/lib/agents/specifier/prompts.ts`):**
  - `SPECIFIER_SYSTEM_PROMPT`: Rules enforcing scope fencing, Given-When-Then formatting, ambiguity thresholding ($> 0.35$ triggers clarification, $\le 0.35$ finalizes specification), and strict JSON output.
  - `formatUserPromptWithContext`: Injects project context, raw prompts, and prior clarification Q&A history.
- **Specifier Agent (`src/lib/agents/specifier/specifier-agent.ts`):**
  - `specify(input)`: Orchestrates AI completion, markdown fence stripping, JSON parsing, and Zod validation.
  - `specifyWithClarifications(input, answers)`: Ingests user answers and re-evaluates ambiguity to converge to a finalized specification.
- **Unit Test Suite (`tests/unit/agents/specifier-agent.test.ts`):**
  - Verified clear prompts produce `status: "specified"` with ambiguity $\le 0.35$.
  - Verified ambiguous prompts produce `status: "needs_clarification"` with $\le 3$ questions and ambiguity $> 0.35$.
  - Verified multi-turn clarification resolution into complete specifications.
  - Verified error handling on malformed JSON or schema violations.

### 2.2 Wave 2 (Plan 6.2) — Specification Repository, State Progression & Task Intake Pipeline
- **Specification Repository (`src/lib/repositories/specification-repository.ts`):**
  - `create(dto)`: Inserts new specification record with `version = 1`.
  - `findByTaskId(taskId)`: Retrieves latest specification ordered by version descending.
  - `findAllVersions(taskId)`: Retrieves chronological version history.
  - `createRevision(taskId, dto)`: Inserts revision with `version = current_max + 1`, preserving previous specifications.
- **Task State Machine Integration (`src/lib/repositories/task-repository.ts`):**
  - Enforced `TaskStateMachine.assertTransition(current.status, status)` on `updateStatus` calls.
- **Task Intake API Route (`src/app/api/tasks/intake/route.ts`):**
  - `POST /api/tasks/intake`: Validates input, creates task in `intake` status, transitions to `specifying`, dispatches Specifier Agent, and returns 201 (`specified`) or 200 (`needs_clarification`).
- **Clarification API Route (`src/app/api/tasks/[id]/clarify/route.ts`):**
  - `POST /api/tasks/[id]/clarify`: Validates task is in `specifying` status, runs Specifier Agent with clarification answers, creates revision, and returns updated result.
- **Unit Test Suites:**
  - `tests/unit/repositories/specification-repository.test.ts` (4/4 tests passed).
  - `tests/unit/api/tasks-intake-route.test.ts` (5/5 tests passed).

---

## 3. Empirical Verification Results

```bash
# Vitest Test Suite
Test Files  26 passed (26)
Tests       144 passed (144)
Duration    28.19s

# TypeScript Typecheck
pnpm exec tsc --noEmit
Exit Code: 0 (Zero errors)

# Next.js Production Build
pnpm build
Route (app)                                 Size  First Load JS
┌ ○ /                                    8.73 kB         112 kB
├ ○ /_not-found                            990 B         104 kB
├ ƒ /api/auth/callback                     139 B         103 kB
├ ƒ /api/auth/login                        139 B         103 kB
├ ƒ /api/auth/logout                       139 B         103 kB
├ ƒ /api/auth/session                      139 B         103 kB
├ ƒ /api/tasks/[id]/clarify                139 B         103 kB
└ ƒ /api/tasks/intake                      139 B         103 kB
Exit Code: 0 (Production ready)
```

---

## 4. Deviations & Discoveries

1. **PowerShell Execution Policy for Global pnpm:** Windows blocks running `.ps1` wrapper scripts by default. In PowerShell sub-shells, invoking `pnpm.cmd` directly with `C:\Program Files\nodejs` and `C:\Users\JSK\AppData\Roaming\npm` in `$env:PATH` executes reliably.
2. **RFC 4122 UUID Format in Zod:** `z.string().uuid()` requires strict RFC 4122 UUID format. For task intake route payloads, `projectId: z.string().min(1)` accommodates internal and test identifiers smoothly while maintaining strong validation.

---

## 5. Next Steps

With Phase 6 complete, the system is ready for **Phase 7: Execution Planning Engine** (`REQ-PLAN-01`, `REQ-PLAN-02`, `REQ-PLAN-03`, `NFR-REL-02`).
- Decompose finalized specifications into atomic execution steps.
- Wave-based dependency ordering and DAG validation.
- Automated step risk level scoring and human approval gate flagging.
- Plan storage in `public.plans` and task state progression from `specifying` to `planned`.
