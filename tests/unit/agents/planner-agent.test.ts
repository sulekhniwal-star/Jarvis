import { describe, it, expect, beforeEach } from "vitest";
import { AIGateway } from "@/lib/ai/gateway";
import { MockAIAdapter } from "@/lib/ai/adapters/mock";
import {
  PlannerAgent,
  PlannerValidationError,
  PlannerDAGError,
} from "@/lib/agents/planner/planner-agent";
import { PlanPayload, PlannerInput } from "@/lib/agents/planner/types";

describe("PlannerAgent", () => {
  let mockAdapter: MockAIAdapter;
  let aiGateway: AIGateway;
  let plannerAgent: PlannerAgent;

  beforeEach(() => {
    mockAdapter = new MockAIAdapter({
      simulatedLatencyMs: 5,
    });
    aiGateway = new AIGateway({
      adapter: mockAdapter,
    });
    plannerAgent = new PlannerAgent(aiGateway);
  });

  const validPlanPayload: PlanPayload = {
    steps: [
      {
        id: "step-1.1",
        title: "Define DB Schema",
        description: "Create tables and constraints in supabase migration.",
        filesTargeted: ["supabase/migrations/20261115_tasks.sql"],
        actionType: "migration",
        wave: 1,
        dependencies: [],
        riskLevel: "high",
        requiresApproval: true,
        approvalReason: "Database migration requires review.",
        verificationCommand: "pnpm supabase db reset",
        rollbackProcedure: "rm supabase/migrations/20261115_tasks.sql",
      },
      {
        id: "step-2.1",
        title: "Implement Repository",
        description: "Create typed repository class with CRUD.",
        filesTargeted: ["src/lib/repositories/tasks.ts"],
        actionType: "create",
        wave: 2,
        dependencies: ["step-1.1"],
        riskLevel: "medium",
        requiresApproval: false,
        verificationCommand: "pnpm test tests/unit/repositories/tasks.test.ts",
        rollbackProcedure: "git checkout -- src/lib/repositories/tasks.ts",
      },
    ],
    dependencies: [{ from: "step-1.1", to: "step-2.1" }],
    riskAssessment: {
      overallRisk: "high",
      riskFactors: ["Database migration present"],
      requiresHumanApproval: true,
      mitigations: ["Verify schema with unit tests"],
    },
    requiredApprovals: ["database_migration"],
  };

  const sampleInput: PlannerInput = {
    taskId: "task-100",
    specification: {
      scope: "Create a task tracking feature with Supabase database persistence.",
      exclusions: "No push notifications or email alerts.",
      acceptanceCriteria: [
        {
          id: "AC-1",
          title: "Tasks table exists",
          given: "Supabase running",
          when: "Migrations applied",
          then: "tasks table is queryable",
        },
      ],
      assumptions: ["PostgreSQL 15+ with RLS enabled"],
    },
    projectContext: "Jarvis personal AI system",
  };

  it("decomposes an approved specification into atomic execution steps and valid DAG", async () => {
    mockAdapter.setCustomHandler(() => JSON.stringify(validPlanPayload));

    const result = await plannerAgent.plan(sampleInput);

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.id).toBe("step-1.1");
    expect(result.steps[0]?.wave).toBe(1);
    expect(result.steps[1]?.wave).toBe(2);
    expect(result.dependencies).toEqual([{ from: "step-1.1", to: "step-2.1" }]);
    expect(result.riskAssessment.overallRisk).toBe("high");
    expect(result.requiredApprovals).toContain("database_migration");
  });

  it("automatically reconciles step risk and enforces approval gate on migrations", async () => {
    // LLM returned riskLevel: 'low' and requiresApproval: false for a migration step
    const unflaggedPayload: PlanPayload = {
      ...validPlanPayload,
      steps: [
        {
          ...validPlanPayload.steps[0]!,
          riskLevel: "low",
          requiresApproval: false,
        },
      ],
      dependencies: [],
      riskAssessment: {
        overallRisk: "low",
        riskFactors: [],
        requiresHumanApproval: false,
        mitigations: [],
      },
      requiredApprovals: [],
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(unflaggedPayload));

    const result = await plannerAgent.plan(sampleInput);

    // Automated evaluator must upgrade migration step to high risk and requiresApproval: true
    expect(result.steps[0]?.riskLevel).toBe("high");
    expect(result.steps[0]?.requiresApproval).toBe(true);
    expect(result.riskAssessment.requiresHumanApproval).toBe(true);
    expect(result.requiredApprovals).toContain("database_migration");
  });

  it("strips markdown code fences from JSON output", async () => {
    const fencedContent = `\`\`\`json
${JSON.stringify(validPlanPayload)}
\`\`\``;

    mockAdapter.setCustomHandler(() => fencedContent);

    const result = await plannerAgent.plan(sampleInput);
    expect(result.steps).toHaveLength(2);
  });

  it("throws PlannerValidationError when response violates schema", async () => {
    const invalidPayload = {
      steps: [], // min(1) violation
      dependencies: [],
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(invalidPayload));

    await expect(plannerAgent.plan(sampleInput)).rejects.toThrow(
      PlannerValidationError
    );
  });

  it("throws PlannerDAGError when response contains circular dependencies or invalid waves", async () => {
    const invalidDAGPayload: PlanPayload = {
      ...validPlanPayload,
      steps: [
        { ...validPlanPayload.steps[0]!, wave: 2, dependencies: ["step-2.1"] },
        { ...validPlanPayload.steps[1]!, wave: 1, dependencies: [] },
      ],
      dependencies: [{ from: "step-1.1", to: "step-2.1" }],
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(invalidDAGPayload));

    await expect(plannerAgent.plan(sampleInput)).rejects.toThrow(
      PlannerDAGError
    );
  });
});
