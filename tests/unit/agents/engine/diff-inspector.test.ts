import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "@/lib/agents/engine/verification/diff-inspector/diff-parser";
import {
  validateFileBoundaries,
  matchesPattern,
} from "@/lib/agents/engine/verification/diff-inspector/boundary-validator";
import { scoreDiffQuality } from "@/lib/agents/engine/verification/diff-inspector/quality-scorer";

describe("Unified Git Diff Parser (REQ-VR-02)", () => {
  const sampleDiff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..89abcdef 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,5 +1,6 @@
 import * as os from "os";
-const port = 3000;
+const port = 8080;
+const host = "0.0.0.0";
 export function start() {}
diff --git a/src/new-feature.ts b/src/new-feature.ts
new file mode 100644
--- /dev/null
+++ b/src/new-feature.ts
@@ -0,0 +1,3 @@
+export function newFeature() {
+  return "hello";
+}
diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export function old() {}
-export default old;
`;

  it("parses multi-file diff with modified, added, and deleted files", () => {
    const files = parseUnifiedDiff(sampleDiff);

    expect(files).toHaveLength(3);

    // Modified file
    expect(files[0]?.newPath).toBe("src/app.ts");
    expect(files[0]?.status).toBe("modified");
    expect(files[0]?.additions).toBe(2);
    expect(files[0]?.deletions).toBe(1);
    expect(files[0]?.hunks).toHaveLength(1);
    expect(files[0]?.hunks[0]?.lines).toHaveLength(5);

    // Added file
    expect(files[1]?.newPath).toBe("src/new-feature.ts");
    expect(files[1]?.oldPath).toBeNull();
    expect(files[1]?.status).toBe("added");
    expect(files[1]?.additions).toBe(3);
    expect(files[1]?.deletions).toBe(0);

    // Deleted file
    expect(files[2]?.oldPath).toBe("src/old.ts");
    expect(files[2]?.newPath).toBeNull();
    expect(files[2]?.status).toBe("deleted");
    expect(files[2]?.additions).toBe(0);
    expect(files[2]?.deletions).toBe(2);
  });

  it("handles empty or invalid diff strings gracefully", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("random text without git diff header")).toEqual([]);
  });
});

describe("File Boundary Validator (REQ-VR-02)", () => {
  it("matches paths accurately with exact, prefix, and wildcard patterns", () => {
    expect(matchesPattern("src/components/button.tsx", "src/components/button.tsx")).toBe(true);
    expect(matchesPattern("src/components/button.tsx", "src/components/")).toBe(true);
    expect(matchesPattern("src/components/button.tsx", "src/components")).toBe(true);
    expect(matchesPattern("src/components/button.tsx", "src/**/*.tsx")).toBe(true);
    expect(matchesPattern("src/components/button.tsx", "*.tsx")).toBe(false);
    expect(matchesPattern("src/lib/secret.ts", "src/components/**")).toBe(false);
  });

  it("passes when all modified files are within allowed boundaries", () => {
    const files = parseUnifiedDiff(`diff --git a/src/components/button.tsx b/src/components/button.tsx
--- a/src/components/button.tsx
+++ b/src/components/button.tsx
@@ -1 +1 @@
-old
+new
`);

    const violations = validateFileBoundaries(files, ["src/components/button.tsx"]);
    expect(violations).toHaveLength(0);
  });

  it("flags blocker violation when a modified file is outside allowed boundaries", () => {
    const files = parseUnifiedDiff(`diff --git a/src/secret-config.ts b/src/secret-config.ts
--- a/src/secret-config.ts
+++ b/src/secret-config.ts
@@ -1 +1 @@
-old
+new
`);

    const violations = validateFileBoundaries(files, ["src/components/**"]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("UNAUTHORIZED_FILE_MUTATION");
    expect(violations[0]?.severity).toBe("blocker");
    expect(violations[0]?.file).toBe("src/secret-config.ts");
  });

  it("flags blocker violation on unexpected file deletion", () => {
    const files = parseUnifiedDiff(`diff --git a/src/critical.ts b/src/critical.ts
deleted file mode 100644
--- a/src/critical.ts
+++ /dev/null
@@ -1 +0,0 @@
-deleted
`);

    const violations = validateFileBoundaries(files, ["src/**"], false);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("UNAUTHORIZED_FILE_DELETION");
    expect(violations[0]?.severity).toBe("blocker");
  });

  it("allows file deletion when explicitly permitted", () => {
    const files = parseUnifiedDiff(`diff --git a/src/obsolete.ts b/src/obsolete.ts
deleted file mode 100644
--- a/src/obsolete.ts
+++ /dev/null
@@ -1 +0,0 @@
-deleted
`);

    const violations = validateFileBoundaries(files, ["src/**"], true);
    expect(violations).toHaveLength(0);
  });

  it("flags blocker violation when diff modifies forbidden security files (.env, keys, certs)", () => {
    const files = parseUnifiedDiff(`diff --git a/config/.env.production b/config/.env.production
--- a/config/.env.production
+++ b/config/.env.production
@@ -1 +1 @@
-OLD_SECRET=1
+NEW_SECRET=2
diff --git a/keys/id_rsa b/keys/id_rsa
--- a/keys/id_rsa
+++ b/keys/id_rsa
@@ -1 +1 @@
-OLD_KEY
+NEW_KEY
`);

    const violations = validateFileBoundaries(files);
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.code === "FORBIDDEN_FILE_PATTERN")).toBe(true);
    expect(violations.every((v) => v.severity === "blocker")).toBe(true);
  });
});

describe("Quality & Churn Scorer (REQ-VR-02)", () => {
  it("calculates total churn and assigns low risk tier for small changes", () => {
    const files = parseUnifiedDiff(`diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,2 +1,3 @@
-old
+new line 1
+new line 2
`);

    const { metrics, violations } = scoreDiffQuality(files);

    expect(metrics.filesCount).toBe(1);
    expect(metrics.additions).toBe(2);
    expect(metrics.deletions).toBe(1);
    expect(metrics.totalChurn).toBe(3);
    expect(metrics.riskTier).toBe("low");
    expect(violations).toHaveLength(0);
  });

  it("detects debug residue (console.log, debugger) and flags warnings", () => {
    const files = parseUnifiedDiff(`diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1,3 @@
+console.log("debug info", data);
+debugger;
 export function run() {}
`);

    const { metrics, violations } = scoreDiffQuality(files);

    expect(metrics.debugResidueCount).toBe(2);
    expect(violations).toHaveLength(2);
    expect(violations[0]?.code).toBe("DEBUG_RESIDUE_DETECTED");
    expect(violations[0]?.severity).toBe("warning");
  });

  it("assigns extreme risk tier when churn exceeds 800 lines", () => {
    // Generate large diff mock
    const largeLines = Array.from({ length: 850 }, (_, i) => `+line ${i}`).join("\n");
    const diff = `diff --git a/src/big.ts b/src/big.ts
--- a/src/big.ts
+++ b/src/big.ts
@@ -0,0 +1,850 @@
${largeLines}
`;

    const files = parseUnifiedDiff(diff);
    const { metrics, violations } = scoreDiffQuality(files);

    expect(metrics.riskTier).toBe("extreme");
    expect(violations.some((v) => v.code === "EXTREME_DIFF_CHURN")).toBe(true);
    expect(violations.some((v) => v.code === "EXCESSIVE_FILE_CHURN")).toBe(true);
  });
});
