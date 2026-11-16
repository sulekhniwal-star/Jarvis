import { describe, it, expect, beforeEach } from "vitest";
import {
  CodingTaskContextSchema,
  CodingTaskResultSchema,
  EngineNotFoundError,
  BranchSecurityViolationError,
  CodingEngineError,
} from "@/lib/agents/engine/types";
import {
  CodingEngineRegistry,
  codingEngineRegistry,
} from "@/lib/agents/engine/registry";
import { MockCodingAgentEngine } from "@/lib/agents/engine/mock-engine";

describe("Coding Agent Engine Types & Schemas", () => {
  const validContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-14.1",
    projectSlug: "jarvis-core",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main" as const,
    scopedInstructions: "Implement the repository synchronization monitor service.",
    allowedFilePatterns: ["src/lib/github/sync-monitor.ts"],
    maxRetries: 3,
    environmentVariables: {
      NODE_ENV: "test",
    },
  };

  it("parses valid CodingTaskContext successfully", () => {
    const parsed = CodingTaskContextSchema.parse(validContext);
    expect(parsed.taskId).toBe(validContext.taskId);
    expect(parsed.targetBranch).toBe("main");
    expect(parsed.maxRetries).toBe(3);
  });

  it("strictly enforces targetBranch === 'main' (NFR-SEC-01)", () => {
    const invalidBranches = ["feature/branch", "dev", "master", "release/v1.0", "staging"];

    for (const branch of invalidBranches) {
      expect(() =>
        CodingTaskContextSchema.parse({
          ...validContext,
          targetBranch: branch,
        })
      ).toThrow();
    }
  });

  it("fails when taskId or runId are not valid UUIDs", () => {
    expect(() =>
      CodingTaskContextSchema.parse({
        ...validContext,
        taskId: "invalid-id",
      })
    ).toThrow();

    expect(() =>
      CodingTaskContextSchema.parse({
        ...validContext,
        runId: "12345",
      })
    ).toThrow();
  });

  it("fails when allowedFilePatterns is empty", () => {
    expect(() =>
      CodingTaskContextSchema.parse({
        ...validContext,
        allowedFilePatterns: [],
      })
    ).toThrow();
  });

  it("fails when scopedInstructions is too short", () => {
    expect(() =>
      CodingTaskContextSchema.parse({
        ...validContext,
        scopedInstructions: "short",
      })
    ).toThrow();
  });

  it("parses valid CodingTaskResult successfully", () => {
    const validResult = {
      runId: "22222222-2222-4222-8222-222222222222",
      status: "success" as const,
      exitCode: 0,
      commitHash: "eab1ecd1234567890abcdef1234567890abcdef1",
      diffPatch: "--- a/file.ts\n+++ b/file.ts\n",
      testSummary: {
        passed: 15,
        failed: 0,
        skipped: 0,
        durationMs: 320,
      },
      artifacts: [
        {
          name: "output.log",
          artifactType: "build_log" as const,
          content: "Compilation successful",
          mimeType: "text/plain",
        },
      ],
    };

    const parsed = CodingTaskResultSchema.parse(validResult);
    expect(parsed.status).toBe("success");
    expect(parsed.commitHash).toBe(validResult.commitHash);
    expect(parsed.artifacts).toHaveLength(1);
  });
});

describe("CodingEngineRegistry", () => {
  let registry: CodingEngineRegistry;

  beforeEach(() => {
    registry = new CodingEngineRegistry();
  });

  it("registers and retrieves engines", () => {
    const engine1 = new MockCodingAgentEngine({ engineName: "mock-1" });
    const engine2 = new MockCodingAgentEngine({ engineName: "mock-2" });

    registry.registerEngine(engine1);
    registry.registerEngine(engine2);

    expect(registry.hasEngine("mock-1")).toBe(true);
    expect(registry.hasEngine("mock-2")).toBe(true);
    expect(registry.hasEngine("nonexistent")).toBe(false);
    expect(registry.listEngines()).toEqual(["mock-1", "mock-2"]);
    expect(registry.getEngine("mock-1")).toBe(engine1);
    expect(registry.getEngine("mock-2")).toBe(engine2);
  });

  it("automatically sets first registered engine as default, or uses isDefault", () => {
    const engine1 = new MockCodingAgentEngine({ engineName: "primary" });
    const engine2 = new MockCodingAgentEngine({ engineName: "secondary" });

    registry.registerEngine(engine1);
    expect(registry.getDefaultEngineName()).toBe("primary");
    expect(registry.getEngine()).toBe(engine1);

    registry.registerEngine(engine2, true);
    expect(registry.getDefaultEngineName()).toBe("secondary");
    expect(registry.getEngine()).toBe(engine2);
  });

  it("throws EngineNotFoundError when retrieving unregistered engine", () => {
    expect(() => registry.getEngine("unknown-engine")).toThrow(
      EngineNotFoundError
    );
    expect(() => registry.getEngine()).toThrow(EngineNotFoundError);
  });

  it("allows setting default engine explicitly", () => {
    const engine1 = new MockCodingAgentEngine({ engineName: "e1" });
    const engine2 = new MockCodingAgentEngine({ engineName: "e2" });

    registry.registerEngine(engine1);
    registry.registerEngine(engine2);

    registry.setDefaultEngine("e2");
    expect(registry.getDefaultEngineName()).toBe("e2");
    expect(registry.getEngine()).toBe(engine2);

    expect(() => registry.setDefaultEngine("e3")).toThrow(EngineNotFoundError);
  });

  it("unregisters engines cleanly and updates default", () => {
    const engine1 = new MockCodingAgentEngine({ engineName: "eng-1" });
    const engine2 = new MockCodingAgentEngine({ engineName: "eng-2" });

    registry.registerEngine(engine1);
    registry.registerEngine(engine2);

    expect(registry.unregisterEngine("eng-1")).toBe(true);
    expect(registry.hasEngine("eng-1")).toBe(false);
    expect(registry.getDefaultEngineName()).toBe("eng-2");

    expect(registry.unregisterEngine("nonexistent")).toBe(false);
  });

  it("validates all engines in parallel", async () => {
    const engine1 = new MockCodingAgentEngine({
      engineName: "engine-a",
      validationResult: { valid: true, engineName: "engine-a" },
    });
    const engine2 = new MockCodingAgentEngine({
      engineName: "engine-b",
      validationResult: {
        valid: false,
        engineName: "engine-b",
        details: "Missing CLI",
      },
    });

    registry.registerEngine(engine1);
    registry.registerEngine(engine2);

    const validation = await registry.validateAll();
    expect(validation["engine-a"].valid).toBe(true);
    expect(validation["engine-b"].valid).toBe(false);
    expect(validation["engine-b"].details).toBe("Missing CLI");
  });

  it("clears registry completely", () => {
    registry.registerEngine(new MockCodingAgentEngine());
    expect(registry.listEngines().length).toBe(1);

    registry.clear();
    expect(registry.listEngines().length).toBe(0);
    expect(registry.getDefaultEngineName()).toBeUndefined();
  });
});

describe("MockCodingAgentEngine", () => {
  const validContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-1",
    projectSlug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main" as const,
    scopedInstructions: "Generate mock unit tests.",
    allowedFilePatterns: ["tests/unit/example.test.ts"],
    maxRetries: 3,
  };

  it("executes task in success mode", async () => {
    const engine = new MockCodingAgentEngine();
    const result = await engine.executeTask(validContext);

    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.commitHash).toBeDefined();
    expect(result.diffPatch).toBeDefined();
    expect(result.testSummary.passed).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(engine.executedContexts).toHaveLength(1);
  });

  it("executes task in simulated test failure mode", async () => {
    const engine = new MockCodingAgentEngine({
      defaultStatus: "test_failure",
      exitCode: 1,
    });
    const result = await engine.executeTask(validContext);

    expect(result.status).toBe("test_failure");
    expect(result.exitCode).toBe(1);
    expect(result.commitHash).toBeUndefined();
    expect(result.diffPatch).toBeUndefined();
    expect(result.testSummary.failed).toBeGreaterThan(0);
  });

  it("throws when shouldThrow is true", async () => {
    const engine = new MockCodingAgentEngine({
      shouldThrow: true,
      exitCode: 127,
    });

    await expect(engine.executeTask(validContext)).rejects.toThrow();
  });

  it("resets executedContexts history", async () => {
    const engine = new MockCodingAgentEngine();
    await engine.executeTask(validContext);
    expect(engine.executedContexts).toHaveLength(1);

    engine.reset();
    expect(engine.executedContexts).toHaveLength(0);
  });
});
