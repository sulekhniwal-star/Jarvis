import { describe, it, expect } from "vitest";
import {
  synthesizeCodingTaskContext,
  sanitizeFilePatterns,
  sanitizeEnvironmentVariables,
  compileScopedInstructions,
  TaskContextSynthesizer,
} from "@/lib/agents/engine/context-synthesizer";
import {
  BranchSecurityViolationError,
  CodingEngineError,
} from "@/lib/agents/engine/types";
import { PlanStep } from "@/lib/agents/planner/types";

describe("TaskContextSynthesizer & synthesizeCodingTaskContext", () => {
  const sampleStep: PlanStep = {
    id: "step-15.1",
    title: "Implement Coding Agent Engine Interface",
    description: "Create standard TypeScript contracts and engine registry for coding agents.",
    filesTargeted: ["src/lib/agents/engine/types.ts", "src/lib/agents/engine/registry.ts"],
    actionType: "create",
    wave: 1,
    dependencies: [],
    riskLevel: "low",
    requiresApproval: false,
    verificationCommand: "pnpm test tests/unit/agents/engine/registry.test.ts",
    rollbackProcedure: "git checkout HEAD -- src/lib/agents/engine/",
  };

  const sampleProject = {
    slug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    name: "Jarvis AI Autonomous System",
  };

  const sampleParams = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    step: sampleStep,
    project: sampleProject,
    taskContext: {
      title: "Milestone 5 Foundation",
      description: "Establish swappable coding agent architecture.",
      userPrompt: "Please build the coding agent interface.",
    },
    acceptanceCriteria: [
      "ICodingAgentEngine interface defined",
      "Strict targetBranch === 'main' validation",
      "Unit tests pass with 100% green",
    ],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:secret@localhost:5432/jarvis",
      SUPABASE_SERVICE_ROLE_KEY: "ey...secret-service-role-key",
      SAFE_CONFIG_FLAG: "true",
    },
  };

  it("synthesizes a valid CodingTaskContext matching schema", () => {
    const context = synthesizeCodingTaskContext(sampleParams);

    expect(context.taskId).toBe(sampleParams.taskId);
    expect(context.runId).toBe(sampleParams.runId);
    expect(context.stepId).toBe(sampleStep.id);
    expect(context.projectSlug).toBe("jarvis");
    expect(context.targetBranch).toBe("main");
    expect(context.allowedFilePatterns).toEqual([
      "src/lib/agents/engine/types.ts",
      "src/lib/agents/engine/registry.ts",
    ]);
    expect(context.maxRetries).toBe(3);
    expect(context.metadata).toBeDefined();
    expect(context.metadata?.wave).toBe(1);
    expect(context.metadata?.riskLevel).toBe("low");
  });

  it("strictly enforces targetBranch === 'main' and rejects non-main branches (NFR-SEC-01)", () => {
    const invalidBranches = ["feature/coder", "dev", "master", "staging"];

    for (const branch of invalidBranches) {
      expect(() =>
        synthesizeCodingTaskContext({
          ...sampleParams,
          targetBranch: branch,
        })
      ).toThrow(BranchSecurityViolationError);
    }
  });

  describe("sanitizeFilePatterns", () => {
    it("normalizes backslashes and relative paths", () => {
      const patterns = [
        "src\\lib\\engine\\types.ts",
        "./src/lib/engine/registry.ts",
        "tests/unit/engine/test.ts/",
      ];

      const clean = sanitizeFilePatterns(patterns);
      expect(clean).toEqual([
        "src/lib/engine/types.ts",
        "src/lib/engine/registry.ts",
        "tests/unit/engine/test.ts",
      ]);
    });

    it("rejects path traversal attempts (../)", () => {
      const traversalAttempts = [
        "../secrets.env",
        "src/../../etc/passwd",
        "./../config.json",
        "..",
      ];

      for (const pattern of traversalAttempts) {
        expect(() => sanitizeFilePatterns([pattern])).toThrow(CodingEngineError);
      }
    });

    it("rejects absolute path escapes", () => {
      const escapes = ["/etc/hosts", "C:/Windows/System32", "D:\\secrets.txt"];

      for (const pattern of escapes) {
        expect(() => sanitizeFilePatterns([pattern])).toThrow(CodingEngineError);
      }
    });

    it("throws when patterns list is empty", () => {
      expect(() => sanitizeFilePatterns([])).toThrow(CodingEngineError);
    });
  });

  describe("sanitizeEnvironmentVariables", () => {
    it("strips master database credentials and service role keys (NFR-SEC-02)", () => {
      const rawEnv = {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:pass@host:5432/db",
        SUPABASE_SERVICE_ROLE_KEY: "secret-key",
        TELEGRAM_BOT_TOKEN: "bot-token",
        GITHUB_WEBHOOK_SECRET: "gh-secret",
        SAFE_VARIABLE: "allowed-value",
      };

      const sanitized = sanitizeEnvironmentVariables(rawEnv);

      expect(sanitized.NODE_ENV).toBe("production");
      expect(sanitized.SAFE_VARIABLE).toBe("allowed-value");
      expect(sanitized.DATABASE_URL).toBeUndefined();
      expect(sanitized.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect(sanitized.TELEGRAM_BOT_TOKEN).toBeUndefined();
      expect(sanitized.GITHUB_WEBHOOK_SECRET).toBeUndefined();
    });

    it("handles undefined env gracefully", () => {
      expect(sanitizeEnvironmentVariables(undefined)).toEqual({});
    });
  });

  describe("compileScopedInstructions", () => {
    it("compiles structured markdown with step details, boundaries, and commands", () => {
      const instructions = compileScopedInstructions(sampleParams);

      expect(instructions).toContain("# Task Execution: Implement Coding Agent Engine Interface");
      expect(instructions).toContain("Step ID: `step-15.1`");
      expect(instructions).toContain("## Overall Task Goal");
      expect(instructions).toContain("## File Modification Boundaries");
      expect(instructions).toContain("- `src/lib/agents/engine/types.ts`");
      expect(instructions).toContain("pnpm test tests/unit/agents/engine/registry.test.ts");
      expect(instructions).toContain("git checkout HEAD -- src/lib/agents/engine/");
      expect(instructions).toContain("ICodingAgentEngine interface defined");
    });
  });

  it("TaskContextSynthesizer class delegates methods correctly", () => {
    const synthesizer = new TaskContextSynthesizer();
    const context = synthesizer.synthesize(sampleParams);
    expect(context.targetBranch).toBe("main");

    const cleanedPatterns = synthesizer.sanitizeFilePatterns(["./src/file.ts"]);
    expect(cleanedPatterns).toEqual(["src/file.ts"]);

    const cleanEnv = synthesizer.sanitizeEnvironmentVariables({
      NODE_ENV: "test",
      DATABASE_URL: "secret",
    });
    expect(cleanEnv).toEqual({ NODE_ENV: "test" });
  });
});
