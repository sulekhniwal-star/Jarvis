import { describe, it, expect } from "vitest";
import { validateDAG } from "@/lib/agents/planner/dag";
import { PlanStep, DependencyEdge } from "@/lib/agents/planner/types";

describe("DAG Dependency Analyzer", () => {
  const step1: PlanStep = {
    id: "step-1",
    title: "Database Migration",
    description: "Create tables and constraints.",
    filesTargeted: ["supabase/migrations/test.sql"],
    actionType: "migration",
    wave: 1,
    dependencies: [],
    riskLevel: "high",
    requiresApproval: true,
    verificationCommand: "pnpm supabase db reset",
    rollbackProcedure: "rm supabase/migrations/test.sql",
  };

  const step2: PlanStep = {
    id: "step-2",
    title: "Implement Repository",
    description: "Author typed repository class.",
    filesTargeted: ["src/lib/repositories/test-repo.ts"],
    actionType: "create",
    wave: 2,
    dependencies: ["step-1"],
    riskLevel: "medium",
    requiresApproval: false,
    verificationCommand: "pnpm test tests/unit/repositories/test.test.ts",
    rollbackProcedure: "git checkout -- src/lib/repositories/test-repo.ts",
  };

  const step3: PlanStep = {
    id: "step-3",
    title: "Add API Route",
    description: "Next.js App Router route handler.",
    filesTargeted: ["src/app/api/test/route.ts"],
    actionType: "create",
    wave: 3,
    dependencies: ["step-2"],
    riskLevel: "medium",
    requiresApproval: false,
    verificationCommand: "pnpm test tests/unit/api/test.test.ts",
    rollbackProcedure: "rm src/app/api/test/route.ts",
  };

  it("validates a healthy acyclic multi-wave DAG and produces topological order", () => {
    const steps = [step1, step2, step3];
    const edges: DependencyEdge[] = [
      { from: "step-1", to: "step-2" },
      { from: "step-2", to: "step-3" },
    ];

    const result = validateDAG(steps, edges);

    expect(result.isValid).toBe(true);
    expect(result.maxWave).toBe(3);
    expect(result.sortedStepIds).toEqual(["step-1", "step-2", "step-3"]);
  });

  it("detects circular dependencies and flags error", () => {
    const cyclicStep1: PlanStep = {
      ...step1,
      dependencies: ["step-2"],
      wave: 2,
    };
    const cyclicStep2: PlanStep = {
      ...step2,
      dependencies: ["step-1"],
      wave: 3,
    };

    const edges: DependencyEdge[] = [
      { from: "step-2", to: "step-1" },
      { from: "step-1", to: "step-2" },
    ];

    const result = validateDAG([cyclicStep1, cyclicStep2], edges);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Wave ordering violation");
  });

  it("detects circular dependencies within consistent wave numbers", () => {
    // If wave check didn't catch it, Kahn's algorithm catches cycles
    const stepA: PlanStep = { ...step1, id: "A", wave: 1, dependencies: [] };
    const stepB: PlanStep = { ...step2, id: "B", wave: 2, dependencies: ["A"] };
    const stepC: PlanStep = { ...step3, id: "C", wave: 3, dependencies: ["B"] };

    // Fake edge creating cycle B -> A with invalid wave
    const result = validateDAG([stepA, stepB, stepC], [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
    ]);

    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("flags error when dependent step has wave <= prerequisite step", () => {
    const badWaveStep2: PlanStep = {
      ...step2,
      wave: 1, // Same wave as step-1!
      dependencies: ["step-1"],
    };

    const result = validateDAG([step1, badWaveStep2], [{ from: "step-1", to: "step-2" }]);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Wave ordering violation");
    expect(result.error).toContain("Dependent step wave must be strictly greater");
  });

  it("flags error when a step references a non-existent dependency ID", () => {
    const invalidDepStep: PlanStep = {
      ...step2,
      dependencies: ["step-nonexistent"],
    };

    const result = validateDAG([step1, invalidDepStep], []);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("unknown step ID 'step-nonexistent'");
  });
});
