# Phase 20 Summary: Automated Diff Inspector & Quality Gate

## 1. Execution Overview

Phase 20 advances Milestone 6 (v6.0 — Quality, Verification & Self-Review) by delivering the Automated Diff Inspector & Quality Gate for Jarvis (`REQ-VR-02`). The system inspects unified git diff patches against strict file modification boundaries, checks for forbidden security files (`.env`, private keys, certificates), enforces churn thresholds, detects debug residue (`console.log`, `debugger;`, test focus flags), and integrates diff quality reporting directly into the verification pipeline and App Router diagnostics.

- **Phase Objective:** Build a unified diff inspection system with semantic patch AST parsing, file boundary validation, security file blocking, churn scoring, risk tier assignment, markdown quality reporting, App Router endpoint (`POST /api/verification/diff`), and `VerificationHarness` integration.
- **Requirements Satisfied:**
  - `REQ-VR-02`: Automated Diff Inspector & Quality Gate (AST/unified diff parser, file boundary verification, deletion protection, churn thresholds, debug residue checks, and structured report generation).
  - `NFR-SEC-01`: Main-Only Branch Lock: Guarantees patch inspection occurs within branchless `main`-only repositories and respects allowed file scope.
  - `NFR-SEC-02`: Zero Secret Leakage: Strictly blocks modifications to forbidden credential and key files (`.env`, `.pem`, `.key`, `.pfx`, `.cert`, `.crt`, `id_rsa`).
  - `NFR-REL-01`: Durable Persistence: Integrates `diffReport` into `VerificationResult` and attaches formatted `diff-quality.md` markdown artifacts.
- **Git Compliance:** 100% compliant with strict `main`-only policy across all commits.

---

## 2. Key Deliverables & Artifacts

### 2.1 Wave 1 (Plan 20.1) — Diff AST Models, Unified Diff Parser, Boundary Validator & Quality Scorer
- **Diff AST Models & Schemas (`src/lib/agents/engine/verification/diff-inspector/types.ts`):**
  - `DiffFileStatus`: `"added" | "modified" | "deleted" | "renamed"`.
  - `DiffHunkLine` & `DiffHunk`: Line-level changes (`add`, `delete`, `context`) with original and new line tracking.
  - `DiffFile`: Structured file change representation with additions, deletions, hunks, and binary detection.
  - `DiffRiskTier`: `"low" | "medium" | "high" | "extreme"`.
  - `DiffQualityMetrics`: Churn measurements (`filesCount`, `additions`, `deletions`, `totalChurn`, `riskTier`, `debugResidueCount`).
  - `DiffViolation`: Quality and policy violations with severity (`blocker` vs `warning`).
  - `DiffInspectionReport`: Aggregated report with pass/fail boolean, metrics, violations, files, and markdown summary.
- **Unified Diff Parser (`src/lib/agents/engine/verification/diff-inspector/diff-parser.ts`):**
  - `parseUnifiedDiff`: Parses raw unified git diffs into structured `DiffFile[]` ASTs, handling file modes, renames, hunk coordinates, and binary diffs.
- **Boundary Validator (`src/lib/agents/engine/verification/diff-inspector/boundary-validator.ts`):**
  - `matchesPattern`: Path matcher supporting exact paths, directory prefixes, and glob wildcards (`*`, `**`).
  - `validateFileBoundaries`: Blocks forbidden files (`FORBIDDEN_FILE_PATTERN`), unauthorized deletions (`UNAUTHORIZED_FILE_DELETION`), and out-of-scope modifications (`UNAUTHORIZED_FILE_MUTATION`).
- **Quality & Churn Scorer (`src/lib/agents/engine/verification/diff-inspector/quality-scorer.ts`):**
  - `scoreDiffQuality`: Computes total churn and assigns risk tiers (`low` <=100, `medium` <=300, `high` <=800, `extreme` >800 or >10 files).
  - Detects single-file churn blockers (>800 lines) and total churn blockers (>2000 lines or >50 files).
  - Scans added lines for debug residue (`console.log`, `debugger`, `print(`, temporary `TODO/FIXME`).
- **Unit Test Suite (`tests/unit/agents/engine/diff-inspector.test.ts`):**
  - 11 unit tests covering unified diff parsing, exact/wildcard pattern matching, boundary violation blocking, deletion authorization, forbidden file blocking, and risk tier scoring.

### 2.2 Wave 2 (Plan 20.2) — DiffInspector Orchestrator, App Router Endpoint & Harness Integration
- **DiffInspector Class (`src/lib/agents/engine/verification/diff-inspector/diff-inspector.ts`):**
  - Orchestrates parsing, boundary checking, and quality scoring into a unified `inspect` API.
  - Generates rich Markdown reports (`generateMarkdownSummary`) featuring status badges, metrics tables, policy violation warnings, and changed file breakdowns.
  - Exports singleton `diffInspector`.
- **Barrel Exports (`src/lib/agents/engine/verification/diff-inspector/index.ts` & `src/lib/agents/engine/verification/index.ts`):**
  - Exports all diff inspector types, functions, and the orchestrator singleton.
- **Verification Harness Integration (`src/lib/agents/engine/verification/verification-harness.ts`):**
  - Expanded `VerificationHarnessConfig` to accept `diffPatch`, `allowedFilePatterns`, and `allowDeletions`.
  - Executes diff inspection prior to or alongside stages, failing fast on blocker violations and attaching `diff-quality.md` to `artifacts`.
- **App Router Route (`src/app/api/verification/diff/route.ts`):**
  - `GET /api/verification/diff`: Returns endpoint description, forbidden extensions, debug patterns, and churn thresholds.
  - `POST /api/verification/diff`: Validates `{ diffPatch, allowedFilePatterns?, allowDeletions? }` with Zod, executes diff inspection, and returns 200 with `DiffInspectionReport`.
- **Unit & Integration Test Suites:**
  - `tests/unit/api/verification-diff-route.test.ts`: 5 tests verifying GET metadata and POST inspection pass/fail/validation behaviors.
  - `tests/unit/agents/engine/diff-inspector-integration.test.ts`: 5 tests verifying end-to-end single-file churn limits, debug residue warnings, and `VerificationHarness` passing/failing integrations with markdown artifact generation.

---

## 3. Empirical Verification Results

- **Phase 20 Unit & Integration Tests:** 3 test files, 21 tests passed (100% green).
  - `tests/unit/agents/engine/diff-inspector.test.ts`: 11/11 passed.
  - `tests/unit/agents/engine/diff-inspector-integration.test.ts`: 5/5 passed.
  - `tests/unit/api/verification-diff-route.test.ts`: 5/5 passed.
- **Full Project Vitest Suite:** **67 test files passed, 420 total tests passed (100% green)**.
- **Production Build:** Next.js production build compiled cleanly across all 18 static and dynamic routes with **0 errors and 0 warnings**:
  - Routes: `/`, `/_not-found`, `/api/agents/*`, `/api/auth/*`, `/api/git/*`, `/api/github/webhook`, `/api/tasks/*`, `/api/telegram/webhook`, `/api/verification`, `/api/verification/diff`, `/tasks/[id]/plan`.

---

## 4. Next Phase Readiness

Phase 20 establishes comprehensive diff quality gating and boundary enforcement. Ready for:
- **Phase 21 (Pre-Commit Entropy & Secret Scanner):** Will implement regex and high-entropy secret detection scanning patches for API keys, tokens, and credentials prior to commit generation (`REQ-VR-03`).
