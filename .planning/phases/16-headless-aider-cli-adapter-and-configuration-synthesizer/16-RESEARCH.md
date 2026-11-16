# Phase 16 Research: Headless Aider CLI Adapter & Configuration Synthesizer

## 1. Requirements & Core Invariants

Phase 16 builds the concrete coding agent implementation for Aider CLI in headless batch mode (`REQ-EX-02`). It integrates with the standard `ICodingAgentEngine` contract from Phase 15.

### Target Requirements
- **REQ-EX-02:** Headless Aider CLI Adapter: Automated execution engine wrapping Aider in batch, non-interactive mode with file modification boundaries, OpenRouter provider mapping, and 3-strike bounded repair (`docs/CODING_AGENT_INTERFACE.md §3, §5`).
- **NFR-SEC-01:** Main-Only Branch Lock: Execution remains strictly on `main`. Zero branch creations or checkouts.
- **NFR-SEC-02:** Zero Secret Leakage: OpenRouter API key is scoped and temporary files (.aider.conf.yml, instructions.txt) do not persist master secrets or database credentials.
- **NFR-REL-01:** Durable Persistence: Results produce standard `CodingTaskResult` with commit SHA, diff patch, test summary, and log artifacts.

---

## 2. Technical Architecture & Component Design

### 2.1 Aider Configuration Synthesizer (`src/lib/agents/engine/aider/config-synthesizer.ts`)
Synthesizes CLI arguments and configuration options for non-interactive execution:
- `--model openrouter/<provider>/<model>` (defaults to configured model, e.g. `openrouter/qwen/qwen-2.5-coder-32b-instruct`)
- `--yes-always` (headless batch confirmation)
- `--no-show-model-warnings`
- `--no-auto-commits` or `--commit-prompt` depending on whether Jarvis manages commits or delegates to Aider
- `--read <file>` for context files outside `allowedFilePatterns`
- Positional target files strictly matched to `context.allowedFilePatterns`
- Ephemeral instructions file (`instructions.txt`) containing the scoped instructions compiled by `TaskContextSynthesizer`.

### 2.2 Output Parser & Artifact Extractor (`src/lib/agents/engine/aider/output-parser.ts`)
Inspects raw CLI process output and Git working tree:
1. **Commit Extraction:** Parses output for commit SHA patterns (e.g. `Commit ([0-9a-f]{7,40})` or inspects `git rev-parse HEAD`).
2. **Diff Patch Extraction:** Inspects git diff (`git diff HEAD~1` or porcelain diff for edited files).
3. **Artifacts Assembly:** Formats stdout/stderr into `build_log` and `test_log` `ExecutionArtifact` objects.

### 2.3 Bounded Repair Protocol (3-Strike Rule) (`src/lib/agents/engine/aider/repair-handler.ts`)
Enforces `docs/CODING_AGENT_INTERFACE.md §5`:
1. **Strike 1 (Targeted Error Fix):**
   - Ingests test failure output and stack traces.
   - Formulates targeted fix prompt focusing only on the failing assertions.
2. **Strike 2 (Review & Dependency Fix):**
   - Analyzes previous diff for side-effects or missed type dependencies.
   - Formulates targeted structural repair instructions.
3. **Strike 3 (Automatic Termination & Rollback):**
   - If 3 strikes fail, aborts execution.
   - Triggers `rollbackProcedure` or reverts target files via `git checkout HEAD -- <files>`.
   - Returns `status: "test_failure"`, exitCode: 1, and detailed error report.

### 2.4 Aider CLI Adapter (`src/lib/agents/engine/aider/aider-adapter.ts`)
Implements `ICodingAgentEngine`:
- `readonly engineName = "aider"`
- `executeTask(context: CodingTaskContext): Promise<CodingTaskResult>`
- `validateEnvironment(): Promise<EngineValidationResult>`
- Dependency injection: `cliExec?: (command: string, args: string[], options: ProcessOptions) => Promise<ProcessResult>` allows 100% deterministic unit testing without requiring local Python/Aider installation on test runners.

---

## 3. Plan Decomposition & Wave Allocation

- **Wave 1 (Plan 16.1):**
  - Task 1: Type contracts, Aider options, and argument models in `src/lib/agents/engine/aider/types.ts`.
  - Task 2: Configuration synthesizer and argument builder in `src/lib/agents/engine/aider/config-synthesizer.ts`.
  - Task 3: Output parser in `src/lib/agents/engine/aider/output-parser.ts`.
  - Task 4: Unit test suite in `tests/unit/agents/engine/aider-config.test.ts`.

- **Wave 2 (Plan 16.2):**
  - Task 1: 3-strike bounded repair handler in `src/lib/agents/engine/aider/repair-handler.ts`.
  - Task 2: Aider CLI Engine Adapter in `src/lib/agents/engine/aider/aider-adapter.ts` with process runner DI.
  - Task 3: Export and register Aider adapter in `src/lib/agents/engine/index.ts`.
  - Task 4: Comprehensive unit test suite in `tests/unit/agents/engine/aider-adapter.test.ts` verifying batch execution, DI mocks, repair loops, strike 3 rollbacks, and registry integration.
