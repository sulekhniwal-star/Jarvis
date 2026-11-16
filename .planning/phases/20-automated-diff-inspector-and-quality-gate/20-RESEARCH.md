# Phase 20 Research: Automated Diff Inspector & Quality Gate

## 1. Domain Overview & Problem Statement

In autonomous software development systems, coding agents (such as Aider, Claude Code, or LLM-driven diff generators) can introduce unintended side effects:
1. **Scope Creep / Boundary Escapes:** Modifying files outside the task's approved scope (e.g., altering `package.json`, environment configurations, or shared libraries when asked to fix a single component).
2. **Accidental Deletions:** Deleting critical files or tests rather than fixing root causes.
3. **Debug Residue & Churn Spikes:** Committing excessive `console.log`, `debugger;`, or unnecessary whitespace/structural refactors that make code review difficult.
4. **Lack of Churn & Risk Visibility:** Human operators on Web or Telegram need immediate visibility into what files changed, lines added/removed, and overall risk tier.

`REQ-VR-02` mandates an **Automated Diff Inspector & Quality Gate** that semantically parses git diffs, enforces strict file boundary rules, checks for unexpected deletions, evaluates code quality/churn heuristics, and formats structured inspection reports.

---

## 2. Technical Findings & Architectural Decisions

### 2.1 Unified Git Diff Parsing
A standard unified diff starts with headers:
```diff
diff --git a/src/lib/foo.ts b/src/lib/foo.ts
--- a/src/lib/foo.ts
+++ b/src/lib/foo.ts
@@ -10,4 +10,6 @@ export function foo() {
-  oldLine();
+  newLine();
```
The parser must handle:
- New files (`new file mode ...`) $\to$ `status: "added"`, `oldPath: null`
- Deleted files (`deleted file mode ...`) $\to$ `status: "deleted"`, `newPath: null`
- Renamed files (`rename from ...`, `rename to ...`) $\to$ `status: "renamed"`
- Binary files (`Binary files ... differ`)
- Standard hunk headers (`@@ -oldStart,oldLines +newStart,newLines @@`)

### 2.2 File Boundary Validation
Given `allowedFilePatterns: string[]` from `CodingTaskContext`:
- Normalize paths with forward slashes (`/`).
- Support exact path matches (`src/components/button.tsx`).
- Support directory prefixes (`src/components/`).
- Support wildcard/glob patterns (`src/components/**/*.tsx`).
- If any file in the diff does not match at least one allowed pattern, generate a blocker violation:
  `UNAUTHORIZED_FILE_MUTATION: File 'src/secret.ts' is outside the task's allowed file boundaries.`

### 2.3 Deletion Policy
- Deletions are high-risk operations.
- If a file is deleted and the task step did not explicitly specify `actionType === "delete"`, generate a blocker or high-risk violation:
  `UNEXPECTED_FILE_DELETION: File 'src/utils.ts' was deleted without explicit delete approval.`

### 2.4 Code Churn & Residue Heuristics
- **Risk Tiers:**
  - `low`: $\le 100$ lines churn, $\le 3$ files
  - `medium`: $101 - 300$ lines churn, $4 - 6$ files
  - `high`: $301 - 800$ lines churn, $7 - 10$ files
  - `extreme`: $> 800$ lines churn or $> 10$ files (triggers warning or required approval)
- **Residue Checks (Warnings):**
  - Added lines containing `console.log(`, `debugger;`, `print(`, or `TODO: remove`.

### 2.5 Markdown Presentation for Web & Telegram
The report must format clean markdown:
- Summary banner with status icon (`✅ PASSED` or `❌ BLOCKED`).
- Metrics table: files modified, additions ($+$), deletions ($-$), risk tier.
- Violations list categorized by severity (`blocker` vs `warning`).
- File breakdown with short diff snippets.

---

## 3. Plan Decomposition

- **Plan 20.1 (Wave 1):**
  - Diff AST domain models (`diff-inspector/types.ts`).
  - Unified diff parser (`diff-inspector/diff-parser.ts`).
  - File boundary and deletion validator (`diff-inspector/boundary-validator.ts`).
  - Churn and quality heuristics scorer (`diff-inspector/quality-scorer.ts`).
  - Unit test suite (`tests/unit/agents/engine/diff-inspector.test.ts`).
- **Plan 20.2 (Wave 2):**
  - Core `DiffInspector` class (`diff-inspector/diff-inspector.ts`).
  - Module barrel exports (`src/lib/agents/engine/verification/diff-inspector/index.ts` & verification barrel).
  - App Router route `src/app/api/verification/diff/route.ts`.
  - Integration with `VerificationHarness` as a quality check stage.
  - Integration tests (`tests/unit/api/verification-diff-route.test.ts`, `tests/unit/agents/engine/diff-inspector-integration.test.ts`).
  - Full test suite pass and production build verification.
