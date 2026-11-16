# Phase 19 Research: Automated Verification Framework & Test Runner Harness

## 1. Domain Overview & Problem Statement

In autonomous coding architectures, execution without rigorous, multi-stage empirical verification leads to regressions, silent syntax failures, breaking type changes, and invalid builds. A single test command or exit code check is insufficient for modern full-stack web applications.

`REQ-VR-01` mandates a standardized, multi-stage verification framework capable of:
1. Running linting (`eslint`), typechecking (`tsc --noEmit`), test runner suites (`vitest`/`jest`), and production build compiler checks (`next build`).
2. Supporting custom acceptance-criteria verification commands dynamically specified in execution plans (`PlanStep.verificationCommand`).
3. Parsing raw output into structured `TestSummary` metrics (`passed`, `failed`, `skipped`, `durationMs`) and attaching clean `ExecutionArtifact` objects (`test_log`, `build_log`).
4. Enforcing process timeouts, zero secret leakage in test logs (`NFR-SEC-02`), and deterministic fail-fast vs run-all execution modes.

---

## 2. Technical Findings & Architectural Decisions

### 2.1 Multi-Stage Pipeline Design
The verification framework must operate across 5 distinct stages:
- **`lint`:** Fast static analysis checking code formatting and rule compliance (e.g. `pnpm exec eslint .`).
- **`typecheck`:** TypeScript type validator ensuring zero type errors or broken contracts (e.g. `pnpm exec tsc --noEmit`).
- **`test`:** Unit and integration test runner (e.g. `pnpm exec vitest run`).
- **`build`:** Production compiler ensuring routes, static pages, and client chunks bundle with zero errors (e.g. `pnpm exec next build`).
- **`custom`:** Pluggable step-specific verification script or command from `PlanStep.verificationCommand`.

### 2.2 Output Parsing Heuristics
Raw CLI output varies significantly between tools. The harness requires dedicated regex-based parsers to extract quantitative metrics:
- **Vitest / Jest Parser:**
  - Extracts total tests, passed, failed, and skipped:
    - Pattern: `Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed`
    - Pattern: `(\d+)\s+passed\s+\((\d+)\)`
  - Identifies failure traces and error blocks.
- **TypeScript Compiler (`tsc`) Parser:**
  - Extracts file paths, line numbers, error codes, and messages:
    - Pattern: `(.+\.tsx?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)`
- **Next.js Build Parser:**
  - Detects compile success (`Compiled successfully`) vs webpack/type errors (`Failed to compile`, `Error: EPERM`).
  - Summarizes collected routes and first load JS metrics.
- **Credential Sanitizer (`NFR-SEC-02`):**
  - All stdout/stderr streams must pass through secret redaction patterns before being stored in `ExecutionArtifact` or returned via API.

### 2.3 Process Execution & Dependency Injection
To maintain strict determinism in unit test environments and prevent spawning heavy OS processes during test runs:
- `VerificationHarness` accepts an injectable `ProcessRunner` function:
  ```ts
  export type StageProcessRunner = (
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string>; timeoutMs?: number }
  ) => Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }>;
  ```
- Defaults to a cross-platform child process runner executing commands via `cmd.exe /c` or PowerShell on Windows and `/bin/sh -c` on Unix.

### 2.4 Integration Points in Jarvis Architecture
- **`AiderCliAdapter`:** Connect the `VerificationHarness` to replace the simple single-command runner, enabling multi-stage verification before deciding whether to engage the 3-strike repair loop.
- **`ExecutionCoordinator`:** Aggregate verification stage metrics and logs into `CodingTaskResult.testSummary` and `CodingTaskResult.artifacts`.
- **App Router (`/api/verification`):** Expose diagnostic and on-demand verification execution for the dashboard and automated workflows.

---

## 3. Risk Assessment & Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Process Hangs / Infinite Loops in Tests** | Execution hangs indefinitely, consuming sandbox quota. | Strict stage timeout (default 30s per stage, configurable). Abort controller triggers SIGTERM/SIGKILL. |
| **Command Injection via Custom Commands** | Arbitrary code execution outside workspace bounds. | Restrict execution working directory (`cwd`) strictly to sandbox workspace root; sanitize path arguments. |
| **Secret Leakage in Build/Test Stderr** | Credentials embedded in environment exposed in test logs. | Universal regex sanitization (`[REDACTED_SECRET]`) applied to all captured stage output before artifact creation. |
| **Windows EPERM or Locking in Cleanups** | Transient filesystem locks causing false negative build errors. | Retry logic for build stage or clear sandbox temporary artifacts before starting compile checks. |

---

## 4. Phase Plan Strategy

- **Plan 19.1 (Wave 1):** Domain types, stage output parsers, core `VerificationHarness`, and unit test suite.
- **Plan 19.2 (Wave 2):** Barrel exports, engine integration (`AiderCliAdapter`, `ExecutionCoordinator`), App Router route (`/api/verification`), integration tests, full test suite and production build verification.
