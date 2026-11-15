# Phase 15 Research: Coding Agent Interface & Execution Engine Contract

## 1. Requirements & Core Invariants

Phase 15 begins Milestone 5 (Coding Execution Sandbox) by establishing the standard TypeScript abstraction layer that decouples high-level task orchestration from concrete coding CLI tools (`REQ-EX-01`).

### Target Requirements
- **REQ-EX-01:** Standard Coding Agent Interface: Provider-agnostic TypeScript contract (`ICodingAgentEngine`, `CodingTaskContext`, `CodingTaskResult`, `ExecutionArtifact`) and engine registry for swappable headless code runners (`docs/CODING_AGENT_INTERFACE.md §2`).
- **NFR-SEC-01:** Main-Only Branch Lock: The execution contract strictly enforces `targetBranch: 'main'`. Any attempt to specify or checkout a non-`main` branch must fail validation immediately.
- **NFR-SEC-02:** Zero Secret Leakage: The context synthesizer strictly isolates and sanitizes task instructions, environment variables, and file patterns, preventing master Supabase keys or host secrets from entering sandbox contexts.
- **NFR-REL-01:** Durable Persistence: All engine outputs (`exitCode`, `diffPatch`, `commitHash`, `testSummary`, `artifacts`) conform to schemas compatible with `public.agent_runs` and `public.audit_events`.

---

## 2. Technical Architecture & Component Design

### 2.1 Domain Models & Zod Schemas (`src/lib/agents/engine/types.ts`)
Conforms to `docs/CODING_AGENT_INTERFACE.md` with runtime validation using Zod:

```typescript
export const ArtifactTypeSchema = z.enum([
  "test_log",
  "build_log",
  "diff",
  "patch",
  "screenshot",
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ExecutionArtifactSchema = z.object({
  name: z.string().min(1),
  artifactType: ArtifactTypeSchema,
  content: z.union([z.string(), z.instanceof(Buffer)]),
  mimeType: z.string().min(1),
  path: z.string().optional(),
});
export type ExecutionArtifact = z.infer<typeof ExecutionArtifactSchema>;

export const TestSummarySchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative().default(0),
  durationMs: z.number().nonnegative(),
});
export type TestSummary = z.infer<typeof TestSummarySchema>;

export const TaskExecutionStatusSchema = z.enum([
  "success",
  "test_failure",
  "timeout",
  "error",
]);
export type TaskExecutionStatus = z.infer<typeof TaskExecutionStatusSchema>;

export const CodingTaskResultSchema = z.object({
  runId: z.string().uuid(),
  status: TaskExecutionStatusSchema,
  exitCode: z.number().int(),
  commitHash: z.string().regex(/^[0-9a-f]{7,40}$/i).optional(),
  diffPatch: z.string().optional(),
  testSummary: TestSummarySchema,
  artifacts: z.array(ExecutionArtifactSchema),
  errorDetails: z.string().optional(),
});
export type CodingTaskResult = z.infer<typeof CodingTaskResultSchema>;

export const CodingTaskContextSchema = z.object({
  taskId: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().min(1).optional(),
  projectSlug: z.string().min(1),
  repositoryUrl: z.string().min(1),
  targetBranch: z.literal("main"), // NFR-SEC-01 strictly enforced at schema level
  scopedInstructions: z.string().min(10),
  allowedFilePatterns: z.array(z.string().min(1)).min(1),
  maxRetries: z.number().int().positive().default(3),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CodingTaskContext = z.infer<typeof CodingTaskContextSchema>;

export interface EngineValidationResult {
  valid: boolean;
  engineName: string;
  version?: string;
  details?: string;
  missingRequirements?: string[];
}

export interface ICodingAgentEngine {
  readonly engineName: string;
  executeTask(context: CodingTaskContext): Promise<CodingTaskResult>;
  validateEnvironment(): Promise<EngineValidationResult>;
}
```

### 2.2 Coding Engine Registry (`src/lib/agents/engine/registry.ts`)
A centralized registry managing available coding engines:
- `registerEngine(engine: ICodingAgentEngine, isDefault?: boolean): void`
- `getEngine(name?: string): ICodingAgentEngine` (returns named or default engine; throws `EngineNotFoundError` if not found)
- `hasEngine(name: string): boolean`
- `listEngines(): string[]`
- `validateAll(): Promise<Record<string, EngineValidationResult>>`
- `clear(): void` (for testing cleanup)

### 2.3 Mock Coding Engine (`src/lib/agents/engine/mock-engine.ts`)
A deterministic, configurable implementation of `ICodingAgentEngine`:
- Implements `executeTask` returning configurable results (`simulateSuccess`, `simulateTestFailure`, `simulateTimeout`, `simulateError`).
- Generates synthetic diffs, commit SHAs, test summaries, and log artifacts.
- Allows automated unit testing and end-to-end dry runs of the execution pipeline without external dependencies or sandbox containers.

### 2.4 Task Context Synthesizer (`src/lib/agents/engine/context-synthesizer.ts`)
Transforms an approved execution plan step into a fully-formed `CodingTaskContext`:
1. **Branch Lock Guard:** Verifies `targetBranch === "main"`. Throws if any caller attempts non-`main` target branch.
2. **File Pattern Sanitization:** Normalizes targeted file paths (`step.filesTargeted`), strips relative path traversal attempts (`../`), and generates strict positive glob patterns for the sandbox runner.
3. **Scoped Prompt Generation:** Compiles structured Markdown prompt containing:
   - Task goal and step title/description.
   - Acceptance criteria and verification command (`step.verificationCommand`).
   - Rollback instructions (`step.rollbackProcedure`).
   - Strict boundaries: files allowed to modify vs. read-only context files.
4. **Credential Isolation:** Strips any sensitive environment variable keys (e.g., matching `/KEY|SECRET|PASSWORD|TOKEN/i` unless explicitly whitelisted for runtime like `OPENROUTER_API_KEY`).

### 2.5 App Router API Route (`src/app/api/agents/engine/route.ts`)
Exposes registry state and engine diagnostics:
- `GET /api/agents/engine`: Returns list of registered engines and their `validateEnvironment()` statuses.

---

## 3. Plan Decomposition & Wave Allocation

- **Wave 1 (Plan 15.1):**
  - Task 1: Type contracts, Zod schemas, and error classes in `src/lib/agents/engine/types.ts`.
  - Task 2: Engine registry in `src/lib/agents/engine/registry.ts` and Mock Engine in `src/lib/agents/engine/mock-engine.ts`.
  - Task 3: Unit test suite in `tests/unit/agents/engine/registry.test.ts`.

- **Wave 2 (Plan 15.2):**
  - Task 1: Task context synthesizer in `src/lib/agents/engine/context-synthesizer.ts`.
  - Task 2: App Router diagnostic route in `src/app/api/agents/engine/route.ts` and barrel exports in `src/lib/agents/engine/index.ts`.
  - Task 3: Comprehensive unit tests in `tests/unit/agents/engine/context-synthesizer.test.ts` and `tests/unit/api/agents-engine-route.test.ts`.

---

## 4. Verification & Testing Strategy
- Unit tests verify schema enforcement: `targetBranch !== "main"` fails with Zod error.
- Registry tests verify dynamic registration, default fallback, and exception handling for unknown engines.
- Context synthesizer tests verify file normalization, path traversal blocking, markdown instruction assembly, and environment variable sanitization.
- Full Vitest test suite and Next.js build verification with zero warnings.
