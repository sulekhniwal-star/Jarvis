import { describe, it, expect, vi } from "vitest";
import { DiffInspector, diffInspector } from "@/lib/agents/engine/verification/diff-inspector";
import { VerificationHarness } from "@/lib/agents/engine/verification/verification-harness";

describe("DiffInspector & VerificationHarness Integration (REQ-VR-02)", () => {
  describe("DiffInspector End-to-End Analysis", () => {
    it("approves changes within allowed file patterns and clean churn limits", () => {
      const diff = `diff --git a/src/lib/feature.ts b/src/lib/feature.ts
--- a/src/lib/feature.ts
+++ b/src/lib/feature.ts
@@ -1,2 +1,3 @@
 export const feature = true;
+export const enabled = true;
`;

      const report = diffInspector.inspect(diff, {
        allowedFilePatterns: ["src/lib/**"],
      });

      expect(report.passed).toBe(true);
      expect(report.metrics.filesCount).toBe(1);
      expect(report.metrics.riskTier).toBe("low");
      expect(report.violations).toHaveLength(0);
      expect(report.markdownSummary).toContain("# ✅ Diff Inspection Quality Report (PASSED)");
      expect(report.markdownSummary).toContain("`src/lib/feature.ts` (+1/-0)");
    });

    it("blocks diffs exceeding single-file churn limit (800 lines)", () => {
      const addedLines = Array.from({ length: 850 }, (_, i) => `+const line${i} = ${i};`).join("\n");
      const giantDiff = `diff --git a/src/big.ts b/src/big.ts
--- a/src/big.ts
+++ b/src/big.ts
@@ -1,1 +1,851 @@
${addedLines}
`;

      const report = diffInspector.inspect(giantDiff);

      expect(report.passed).toBe(false);
      expect(report.metrics.riskTier).toBe("extreme");
      expect(report.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "SINGLE_FILE_CHURN_LIMIT_EXCEEDED",
            severity: "blocker",
          }),
        ])
      );
      expect(report.markdownSummary).toContain("# ❌ Diff Inspection Quality Report (BLOCKED)");
    });

    it("detects debug residue and reports it as warning without blocking if no blocker exists", () => {
      const diff = `diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,2 +1,3 @@
+console.log("debugging something");
`;

      const report = diffInspector.inspect(diff);

      expect(report.passed).toBe(true); // Warning does not block
      expect(report.metrics.debugResidueCount).toBe(1);
      expect(report.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "DEBUG_RESIDUE_DETECTED",
            severity: "warning",
          }),
        ])
      );
      expect(report.markdownSummary).toContain("**Debug Residue:** ⚠️ 1 instance(s) detected");
    });
  });

  describe("VerificationHarness Integration with DiffInspector", () => {
    it("runs verification harness with passing diffPatch and produces diff-quality artifact", async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: "Tests 1 passed",
        stderr: "",
        durationMs: 10,
      });

      const harness = new VerificationHarness(
        {
          stages: ["test"],
          diffPatch: `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,1 +1,2 @@
+export const x = 1;
`,
        },
        mockRunner
      );

      const result = await harness.runAll();

      expect(result.status).toBe("passed");
      expect(result.diffReport).toBeDefined();
      expect(result.diffReport?.passed).toBe(true);

      const diffArtifact = result.artifacts.find((a) => a.name === "diff-quality.md");
      expect(diffArtifact).toBeDefined();
      expect(diffArtifact?.mimeType).toBe("text/markdown");
      expect(diffArtifact?.content).toContain("Diff Inspection Quality Report (PASSED)");
    });

    it("fails verification harness when diff inspection encounters blocker violations", async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: "All ok",
        stderr: "",
        durationMs: 10,
      });

      const harness = new VerificationHarness(
        {
          stages: ["test"],
          failFast: true,
          allowedFilePatterns: ["src/allowed/**"],
          diffPatch: `diff --git a/forbidden/secret.ts b/forbidden/secret.ts
new file mode 100644
--- /dev/null
+++ b/forbidden/secret.ts
@@ -0,0 +1,1 @@
+export const secret = true;
`,
        },
        mockRunner
      );

      const result = await harness.runAll();

      expect(result.status).toBe("failed");
      expect(result.failureDetails).toContain("Diff inspection quality gate failed");
      expect(result.diffReport).toBeDefined();
      expect(result.diffReport?.passed).toBe(false);

      // Since fail-fast is true and diff failed, the test stage should be skipped
      expect(result.stages[0]?.status).toBe("skipped");

      const diffArtifact = result.artifacts.find((a) => a.name === "diff-quality.md");
      expect(diffArtifact).toBeDefined();
      expect(diffArtifact?.content).toContain("Diff Inspection Quality Report (BLOCKED)");
    });
  });
});
