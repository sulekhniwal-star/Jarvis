import { describe, it, expect, vi } from "vitest";
import { PlanRepository } from "@/lib/repositories/plan-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("PlanRepository", () => {
  it("throws validation error on missing task ID or empty steps", async () => {
    const mockClient = {} as SupabaseClient<Database>;
    const repo = new PlanRepository(mockClient);

    await expect(
      repo.create({
        taskId: "",
        steps: [{ id: "step-1" }],
        dependencies: [],
        riskAssessment: {},
        requiredApprovals: [],
      })
    ).rejects.toThrow(/Task ID is required/i);

    await expect(
      repo.create({
        taskId: "task-1",
        steps: [],
        dependencies: [],
        riskAssessment: {},
        requiredApprovals: [],
      })
    ).rejects.toThrow(/At least one plan step is required/i);
  });

  it("creates a plan with version 1 and draft status by default", async () => {
    const fakePlan = {
      id: "plan-101",
      task_id: "task-1",
      steps: [{ id: "step-1", title: "Setup", wave: 1 }],
      dependencies: [],
      risk_assessment: { overallRisk: "low" },
      required_approvals: [],
      status: "draft",
      version: 1,
      created_at: new Date().toISOString(),
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: fakePlan, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new PlanRepository(mockClient);

    const result = await repo.create({
      taskId: "task-1",
      steps: fakePlan.steps,
      dependencies: [],
      riskAssessment: fakePlan.risk_assessment,
      requiredApprovals: [],
    });

    expect(mockFrom).toHaveBeenCalledWith("plans");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: "task-1",
        version: 1,
        status: "draft",
      })
    );
    expect(result).toEqual(fakePlan);
  });

  it("retrieves the latest plan for a task via findByTaskId", async () => {
    const latestPlan = {
      id: "plan-v2",
      task_id: "task-1",
      steps: [{ id: "step-1", wave: 1 }],
      dependencies: [],
      risk_assessment: {},
      required_approvals: [],
      status: "pending_approval",
      version: 2,
      created_at: new Date().toISOString(),
    };

    const mockLimit = vi.fn().mockResolvedValue({ data: [latestPlan], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new PlanRepository(mockClient);

    const result = await repo.findByTaskId("task-1");

    expect(mockFrom).toHaveBeenCalledWith("plans");
    expect(mockEq).toHaveBeenCalledWith("task_id", "task-1");
    expect(mockOrder).toHaveBeenCalledWith("version", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result).toEqual(latestPlan);
  });

  it("creates a revision incrementing version and marking previous plan superseded", async () => {
    const existingPlan = {
      id: "plan-v1",
      task_id: "task-1",
      steps: [{ id: "step-1" }],
      dependencies: [],
      risk_assessment: {},
      required_approvals: [],
      status: "pending_approval",
      version: 1,
      created_at: new Date().toISOString(),
    };

    const revisedPlan = {
      id: "plan-v2",
      task_id: "task-1",
      steps: [{ id: "step-1" }, { id: "step-2" }],
      dependencies: [],
      risk_assessment: {},
      required_approvals: [],
      status: "draft",
      version: 2,
      created_at: new Date().toISOString(),
    };

    // findByTaskId mock
    const mockLimit = vi.fn().mockResolvedValue({ data: [existingPlan], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqFind = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectFind = vi.fn().mockReturnValue({ eq: mockEqFind });

    // update mock (marking superseded)
    const mockSingleUpdate = vi.fn().mockResolvedValue({ data: { ...existingPlan, status: "superseded" }, error: null });
    const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
    const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    // insert mock
    const mockSingleInsert = vi.fn().mockResolvedValue({ data: revisedPlan, error: null });
    const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

    const mockFrom = vi.fn((table: string) => {
      return {
        select: mockSelectFind,
        update: mockUpdate,
        insert: mockInsert,
      };
    });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new PlanRepository(mockClient);

    const result = await repo.createRevision("task-1", {
      steps: revisedPlan.steps,
      dependencies: [],
      riskAssessment: {},
      requiredApprovals: [],
    });

    expect(result.version).toBe(2);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "superseded" })
    );
  });
});
