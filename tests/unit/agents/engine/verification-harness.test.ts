import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  VerificationHarness,
  StageProcessRunner,
} from "@/lib/agents/engine/verification/verification-harness";
import {
  parseVitestOutput,
  parseTypeScriptOutput,
  parseESLintOutput,
  parseNextBuildOutput,
  sanitizeVerificationOutput,
} from "@/lib/agents/engine/verification/parsers";

describe("Verification Output Parsers & Sanitizer (REQ-VR-01, NFR-SEC-02)", () => {
  it("sanitizes sensitive secrets, tokens, and database credentials", () => {
    const raw = `
      DATABASE_URL=postgres://postgres:secret123456789@db.supabase.co:5432/postgres
      TELEGRAM_BOT_TOKEN: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
      const token = "ghp_abcdefghijklmnopqrstuvwxyz123456";
      const pat = "github_pat_11AAAAAAA0000000000000_1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr";
    `;

    const sanitized = sanitizeVerificationOutput(raw);

    expect(sanitized).not.toContain("secret123456789");
    expect(sanitized).not.toContain("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");
    expect(sanitized).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  it("parses Vitest stdout summary with passed, failed, and skipped metrics", () => {
    const stdout = `
      RUN  v2.1.9 F:/Javis
      ✓ tests/unit/math.test.ts (5 tests) 10ms
      × tests/unit/auth.test.ts (2 tests | 1 failed) 25ms
      Tests  1 failed | 6 passed (7)
      1 skipped
    `;

    const parsed = parseVitestOutput(stdout);

    expect(parsed.passed).toBe(6);
    expect(parsed.failed).toBe(1);
    expect(parsed.skipped).toBe(1);
    expect(parsed.total).toBe(8);
  });

  it("parses Vitest stdout when only passed tests are reported", () => {
    const stdout = `
      RUN  v2.1.9 F:/Javis
      ✓ tests/unit/math.test.ts (10 tests) 10ms
      Tests  10 passed (10)
    `;

    const parsed = parseVitestOutput(stdout);

    expect(parsed.passed).toBe(10);
    expect(parsed.failed).toBe(0);
    expect(parsed.skipped).toBe(0);
  });

  it("parses TypeScript compiler diagnostics", () => {
    const output = `
      src/components/button.tsx(15,8): error TS2322: Type 'string' is not assignable to type 'number'.
      src/lib/utils.ts(42,3): error TS2304: Cannot find name 'foo'.
    `;

    const parsed = parseTypeScriptOutput(output);

    expect(parsed.errorCount).toBe(2);
    expect(parsed.errors[0]).toEqual({
      file: "src/components/button.tsx",
      line: 15,
      col: 8,
      code: "TS2322",
      message: "Type 'string' is not assignable to type 'number'.",
    });
  });

  it("parses ESLint problems report", () => {
    const output = `
      F:/Javis/src/app/page.tsx
        12:5  error  'foo' is assigned a value but never used  @typescript-eslint/no-unused-vars
        18:2  warning  Unexpected console statement              no-console

      ✖ 2 problems (1 error, 1 warning)
    `;

    const parsed = parseESLintOutput(output);

    expect(parsed.errorCount).toBe(1);
    expect(parsed.warningCount).toBe(1);
  });

  it("parses Next.js build compilation outcomes", () => {
    const successOutput = `
      ▲ Next.js 15.5.29
      Creating an optimized production build ...
      ✓ Compiled successfully in 2.1s
      ✓ Generating static pages (16/16)
    `;

    const failedOutput = `
      ▲ Next.js 15.5.29
      Creating an optimized production build ...
      Failed to compile.
      ./src/app/page.tsx:10:5
      Type error: Cannot find module './missing'
    `;

    expect(parseNextBuildOutput(successOutput).success).toBe(true);
    expect(parseNextBuildOutput(failedOutput).success).toBe(false);
    expect(parseNextBuildOutput(failedOutput).summary).toContain("Type error:");
  });
});

describe("VerificationHarness Multi-Stage Engine (REQ-VR-01)", () => {
  let mockRunner: StageProcessRunner;

  beforeEach(() => {
    mockRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "Stage passed successfully",
      stderr: "",
      durationMs: 150,
    });
  });

  it("executes all stages successfully in happy path", async () => {
    const harness = new VerificationHarness(
      {
        stages: ["lint", "typecheck", "test", "build"],
      },
      mockRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("passed");
    expect(result.stages).toHaveLength(4);
    expect(result.stages.every((s) => s.status === "passed")).toBe(true);
    expect(result.artifacts.some((a) => a.name === "test.log")).toBe(true);
    expect(result.artifacts.some((a) => a.name === "build.log")).toBe(true);
    expect(mockRunner).toHaveBeenCalledTimes(4);
  });

  it("halts on first failure and skips subsequent stages when failFast is true", async () => {
    const failingRunner: StageProcessRunner = vi
      .fn()
      .mockImplementation((cmd, args) => {
        const cmdStr = [cmd, ...args].join(" ");
        if (cmdStr.includes("eslint")) {
          return Promise.resolve({
            exitCode: 1,
            stdout: "1 problem (1 error, 0 warnings)",
            stderr: "Linting failed",
            durationMs: 80,
          });
        }
        return Promise.resolve({
          exitCode: 0,
          stdout: "OK",
          stderr: "",
          durationMs: 100,
        });
      });

    const harness = new VerificationHarness(
      {
        stages: ["lint", "typecheck", "test", "build"],
        failFast: true,
      },
      failingRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("failed");
    expect(result.failureStage).toBe("lint");
    expect(result.stages[0].status).toBe("failed");
    expect(result.stages[1].status).toBe("skipped");
    expect(result.stages[2].status).toBe("skipped");
    expect(result.stages[3].status).toBe("skipped");
    expect(failingRunner).toHaveBeenCalledTimes(1);
  });

  it("continues executing remaining stages when failFast is false", async () => {
    const mixedRunner: StageProcessRunner = vi
      .fn()
      .mockImplementation((cmd, args) => {
        const cmdStr = [cmd, ...args].join(" ");
        if (cmdStr.includes("eslint")) {
          return Promise.resolve({
            exitCode: 1,
            stdout: "1 error",
            stderr: "Lint failed",
            durationMs: 50,
          });
        }
        return Promise.resolve({
          exitCode: 0,
          stdout: "Stage passed",
          stderr: "",
          durationMs: 80,
        });
      });

    const harness = new VerificationHarness(
      {
        stages: ["lint", "typecheck", "test"],
        failFast: false,
      },
      mixedRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("failed");
    expect(result.failureStage).toBe("lint");
    expect(result.stages[0].status).toBe("failed");
    expect(result.stages[1].status).toBe("passed");
    expect(result.stages[2].status).toBe("passed");
    expect(mixedRunner).toHaveBeenCalledTimes(3);
  });

  it("supports executing a custom acceptance verification command", async () => {
    const harness = new VerificationHarness(
      {
        stages: ["test"],
        customCommand: "pnpm test:e2e",
      },
      mockRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("passed");
    expect(result.stages).toHaveLength(2); // "test" and "custom"
    expect(result.stages[1].stage).toBe("custom");
    expect(result.stages[1].command).toBe("pnpm test:e2e");
  });

  it("handles process timeout gracefully and marks stage as failed", async () => {
    const timeoutRunner: StageProcessRunner = vi.fn().mockResolvedValue({
      exitCode: 124,
      stdout: "",
      stderr: "Process timed out after 5000ms.",
      durationMs: 5000,
    });

    const harness = new VerificationHarness(
      {
        stages: ["test"],
        timeoutMs: 5000,
      },
      timeoutRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("failed");
    expect(result.stages[0].exitCode).toBe(124);
    expect(result.failureDetails).toContain("timed out");
  });
});
