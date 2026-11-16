# Phase 22 Research: Autonomous Self-Review & Bounded Repair Protocol

## 1. Domain Overview & Problem Statement

Phase 22 is the culminating phase of **Milestone 6 (v6.0 — Quality, Verification & Self-Review)**. It implements **`REQ-VR-04` (Autonomous Self-Review & Bounded Repair Protocol)**, ensuring that when an AI coding agent introduces a defect during execution, the system autonomously reviews the failure logs, synthesizes a targeted surgical repair prompt, and bounds repairs to a strict 3-strike budget. If the 3-strike budget is exhausted, the system automatically and safely rolls back the workspace to the pre-run git HEAD on `main` (`NFR-SEC-01`), records failure telemetry, and alerts the owner via Telegram with one-click recovery options.

Key challenges addressed:
1. **Multi-Source Error Diagnostics:** Failures originate from disparate stages (Vitest assertions, TypeScript compile errors, ESLint rule breaks, Next.js build errors, Diff quality gate boundary violations, or Secret scanner leaks). A diagnostic analyzer must parse raw logs, categorize the failure, extract affected file paths and line numbers, and provide structured root cause summaries.
2. **Context-Optimized Repair Prompts:** Generic "fix this error" prompts lead to repetitive or degrading attempts. The prompt synthesizer must generate tiered instructions:
   - **Strike 1 (Surgical fix):** Narrow fix for specific assertions or compiler errors.
   - **Strike 2 (Structural & Dependency check):** Examines imports, side-effects, type definitions, and diff context.
   - **Strike 3 (Conservative fallback):** Final attempt before rollback warning.
3. **Strict 3-Strike Budget Enforcement:** Under no circumstances should an agent enter an infinite loop or blow the user's token budget. The state machine must terminate after 3 strikes.
4. **Safe Git Rollback to Pre-Run HEAD:** Prior to running a task or repair loop, the system captures the clean git HEAD SHA. Upon strike exhaustion, it restores the working directory via `git reset --hard <preRunCommitSha>` and `git clean -fd` within allowed boundaries.
5. **Telegram Failure Alert & Recovery Cards:** When bounded repair exhausts, the owner receives a rich MarkdownV2 Telegram alert with details of the failure and inline buttons to retry, inspect logs, or dismiss.

---

## 2. Technical Architecture & Component Design

### 2.1 Failure Categorization & Diagnostics
```
                 Raw Multi-Stage Verification Output
                                  │
                                  ▼
                        FailureAnalyzer.analyze()
                                  │
      ┌──────────────┬────────────┼─────────────┬─────────────┐
      ▼              ▼            ▼             ▼             ▼
Typecheck/TS   Vitest Test    ESLint/Lint   Next.js Build   Diff/Secret
  (TS2345,       (Assertion    (Unused var,   (Webpack,       (Out of scope,
   TS2322)        mismatch)     formatting)    500 error)     leaked key)
      │              │            │             │             │
      └──────────────┴────────────┼─────────────┴─────────────┘
                                  ▼
                         FailureDiagnostic:
                - category: FailureCategory
                - primaryError: string
                - affectedFiles: string[]
                - errorSnippets: string[]
                - suggestedStrategy: string
```

### 2.2 Category-Aware Prompt Synthesis
The `RepairPromptSynthesizer` uses the `FailureDiagnostic` to construct markdown instructions that guide the coding agent:
- **`syntax_type_error`:** Injects exact line numbers and expected vs received TypeScript types.
- **`test_assertion_failure`:** Injects test name, failed assertion, expected value, and received value.
- **`diff_boundary_violation`:** Warns agent that it touched files outside `allowedFilePatterns` and instructs it to discard out-of-scope edits.
- **`secret_leak_violation`:** Warns agent that hardcoded credentials or high-entropy tokens were detected and instructs it to use environment variables or mock fixtures.

### 2.3 Bounded Repair Runner Lifecycle
```
                 [Task Execution (Initial)]
                             │
                             ▼
                 [VerificationHarness.runAll()]
                     /              \
                (Passed)          (Failed)
                   │                  │
                   ▼                  ▼
               [Success]       Capture Strike 1
                                      │
                                      ▼
                            Synthesize Prompt 1
                                      │
                                      ▼
                             [Aider Repair Pass]
                                      │
                                      ▼
                         [VerificationHarness.runAll()]
                             /              \
                        (Passed)          (Failed)
                           │                  │
                           ▼                  ▼
                       [Success]       Capture Strike 2
                                              │
                                              ▼
                                    Synthesize Prompt 2
                                              │
                                              ▼
                                     [Aider Repair Pass]
                                              │
                                              ▼
                                 [VerificationHarness.runAll()]
                                     /              \
                                (Passed)          (Failed)
                                   │                  │
                                   ▼                  ▼
                               [Success]       Capture Strike 3
                                                      │
                                                      ▼
                                           [Safe Git Rollback]
                                           (reset to pre-run HEAD)
                                                      │
                                                      ▼
                                           [Telegram Alert Card]
                                           ([Retry], [Logs], [Dismiss])
```

### 2.4 Pre-Run HEAD Capture & Safe Rollback
Before task execution, `BoundedRepairRunner` checks:
```ts
const preRunSha = gitExec(["rev-parse", "HEAD"]).trim();
```
If strike 3 fails:
```ts
gitExec(["reset", "--hard", preRunSha]);
gitExec(["clean", "-fd"]);
```
This guarantees that unverified or broken changes are never left behind in the workspace.

---

## 3. Wave Breakdown & Plan Architecture

- **Plan 22.1: Failure Diagnostic Analyzer & Targeted Repair Prompt Synthesizer**
  - Define domain interfaces and failure category schemas (`src/lib/agents/engine/verification/repair/types.ts`).
  - Implement `FailureAnalyzer` parsing Vitest, TypeScript, ESLint, Next.js build, diff boundary, and secret leak errors into structured `FailureDiagnostic` (`failure-analyzer.ts`).
  - Implement `RepairPromptSynthesizer` generating strike-tiered, category-specific prompts with constraints (`prompt-synthesizer.ts`).
  - Author unit tests for diagnostic analysis and prompt synthesis (`tests/unit/agents/engine/failure-analyzer.test.ts`).

- **Plan 22.2: Bounded Repair Runner, Automated Git Rollback, Telegram Recovery & API Route**
  - Implement `BoundedRepairRunner` orchestrating the 3-strike loop, pre-run HEAD snapshotting, and automated rollback upon exhaustion (`repair-runner.ts`).
  - Implement `TelegramRecoveryNotifier` dispatching MarkdownV2 failure alerts with recovery callbacks (`telegram-notifier.ts`).
  - Create App Router endpoint `src/app/api/verification/repair/route.ts` (`GET` metadata, `POST` failure log analysis).
  - Wire `BoundedRepairRunner` into `AiderCliAdapter` and verification exports.
  - Author integration tests (`tests/unit/agents/engine/repair-runner.test.ts` and `tests/unit/api/verification-repair-route.test.ts`).
  - Verify full Vitest suite and Next.js production build with zero warnings.

---

## 4. Quality & Compliance Gates

- **Strict `main`-only Git policy:** Direct commits to local `main`. Safe rollbacks always reset to `main` HEAD.
- **Zero Warnings standard:** 0 compiler errors, 0 ESLint warnings, 0 Vitest failures.
- **Token Budget Protection:** Absolute hard limit of 3 repair strikes.
