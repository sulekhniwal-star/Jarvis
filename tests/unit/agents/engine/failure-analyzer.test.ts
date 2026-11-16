import { describe, it, expect } from "vitest";
import { failureAnalyzer } from "@/lib/agents/engine/verification/repair/failure-analyzer";
import { repairPromptSynthesizer } from "@/lib/agents/engine/verification/repair/prompt-synthesizer";

describe("FailureAnalyzer Multi-Stage Diagnostic Parser (REQ-VR-04)", () => {
  it("classifies TypeScript compiler diagnostics accurately", () => {
    const tsOutput = `
src/lib/calc.ts:15:7 - error TS2322: Type 'string' is not assignable to type 'number'.
15 const x: number = "hello";
         ~
Found 1 error in src/lib/calc.ts:15
    `;

    const diagnostic = failureAnalyzer.analyze(tsOutput);

    expect(diagnostic.category).toBe("syntax_type_error");
    expect(diagnostic.stage).toBe("typecheck");
    expect(diagnostic.affectedFiles).toContain("src/lib/calc.ts");
    expect(diagnostic.primaryError).toContain("error TS2322");
    expect(diagnostic.suggestedStrategy).toContain("Align parameter and return types");
  });

  it("classifies Vitest test assertion failures accurately", () => {
    const vitestOutput = `
 ❯ tests/unit/calc.test.ts (2 tests | 1 failed) 15ms
   × calculateTotal > computes discount correctly 5ms
     → AssertionError: expected 90 to be 85 // Object.is equality

 FAIL  tests/unit/calc.test.ts > calculateTotal > computes discount correctly
AssertionError: expected 90 to be 85
    `;

    const diagnostic = failureAnalyzer.analyze(vitestOutput);

    expect(diagnostic.category).toBe("test_assertion_failure");
    expect(diagnostic.stage).toBe("test");
    expect(diagnostic.affectedFiles).toContain("tests/unit/calc.test.ts");
    expect(diagnostic.primaryError).toContain("AssertionError");
    expect(diagnostic.suggestedStrategy).toContain("Review the test expectations");
  });

  it("classifies ESLint rule violations accurately", () => {
    const lintOutput = `
src/components/card.tsx:5:10 - error: 'unusedVar' is defined but never used. @typescript-eslint/no-unused-vars
1 ESLint error found.
    `;

    const diagnostic = failureAnalyzer.analyze(lintOutput);

    expect(diagnostic.category).toBe("lint_violation");
    expect(diagnostic.stage).toBe("lint");
    expect(diagnostic.affectedFiles).toContain("src/components/card.tsx");
    expect(diagnostic.suggestedStrategy).toContain("Fix formatting, remove unused imports/variables");
  });

  it("classifies Next.js production build failures accurately", () => {
    const buildOutput = `
$ next build
Failed to compile.
Error: Cannot find module '@/lib/missing-module'
    `;

    const diagnostic = failureAnalyzer.analyze(buildOutput);

    expect(diagnostic.category).toBe("build_failure");
    expect(diagnostic.stage).toBe("build");
    expect(diagnostic.suggestedStrategy).toContain("Next.js production compilation");
  });

  it("classifies Diff Inspector boundary violations accurately", () => {
    const diffError = "Diff inspection quality gate failed: File 'src/unauthorized.ts' is outside the authorized file modification boundary.";

    const diagnostic = failureAnalyzer.analyze(diffError);

    expect(diagnostic.category).toBe("diff_boundary_violation");
    expect(diagnostic.stage).toBe("diff");
    expect(diagnostic.suggestedStrategy).toContain("Revert changes to files outside");
  });

  it("classifies Secret Scanner leak violations accurately", () => {
    const secretError = "Secret scan security gate failed: openai_key in src/api.ts:12 ([REDACTED_SECRET:sk...1a])";

    const diagnostic = failureAnalyzer.analyze(secretError);

    expect(diagnostic.category).toBe("secret_leak_violation");
    expect(diagnostic.stage).toBe("secrets");
    expect(diagnostic.suggestedStrategy).toContain("Remove hardcoded credentials");
  });
});

describe("RepairPromptSynthesizer Strike-Tiered Prompt Generation (REQ-VR-04)", () => {
  it("synthesizes surgical Strike 1 instructions", () => {
    const diagnostic = failureAnalyzer.analyze(
      "src/math.ts:10:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
    );

    const prompt = repairPromptSynthesizer.synthesize(diagnostic, 1, {
      allowedFiles: ["src/math.ts"],
    });

    expect(prompt).toContain("# 🛠️ Automated Repair Request: Strike 1 (Targeted Surgical Fix)");
    expect(prompt).toContain("Apply a minimal, surgical fix");
    expect(prompt).toContain("Allowed Files Boundary");
    expect(prompt).toContain("src/math.ts");
    expect(prompt).toContain("Zero Secret Leakage");
    expect(prompt).toContain("Clean Code Standard");
  });

  it("synthesizes structural Strike 2 instructions with diff context", () => {
    const diagnostic = failureAnalyzer.analyze(
      "AssertionError: expected false to be true",
      "test"
    );

    const diffSnapshot = `+export function isReady() { return false; }`;

    const prompt = repairPromptSynthesizer.synthesize(diagnostic, 2, {
      diffSnapshot,
      allowedFiles: ["src/**"],
    });

    expect(prompt).toContain("Strike 2 (Structural & Dependency Alignment)");
    expect(prompt).toContain("Recent Diff Snapshot");
    expect(prompt).toContain(diffSnapshot);
  });

  it("synthesizes critical Strike 3 instructions with termination warning", () => {
    const diagnostic = failureAnalyzer.analyze("Failed to compile", "build");

    const prompt = repairPromptSynthesizer.synthesize(diagnostic, 3);

    expect(prompt).toContain("Strike 3 (Final Attempt Before Revert)");
    expect(prompt).toContain("Final automated attempt before automatic workspace revert");
  });
});
