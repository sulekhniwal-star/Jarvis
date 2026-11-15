import { describe, it, expect, vi } from "vitest";
import { TaskRepository } from "@/lib/repositories/task-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("TaskRepository", () => {
  it("throws validation error on empty task title", async () => {
    const mockClient = {} as SupabaseClient<Database>;
    const repo = new TaskRepository(mockClient);

    await expect(repo.create("proj-1", { title: "" })).rejects.toThrow(
      /Task title is required/i
    );
  });

  it("creates a task in intake status with zero initial actual cost", async () => {
    const fakeTask = {
      id: "task-101",
      project_id: "proj-1",
      milestone_id: null,
      title: "Configure Database",
      description: null,
      priority: "high",
      risk_level: "low",
      status: "intake",
      estimated_cost_inr: 50.0,
      actual_cost_inr: 0.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: fakeTask, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new TaskRepository(mockClient);

    const result = await repo.create("proj-1", {
      title: "Configure Database",
      priority: "high",
      estimatedCostInr: 50.0,
    });

    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "proj-1",
        title: "Configure Database",
        status: "intake",
        priority: "high",
        estimated_cost_inr: 50.0,
        actual_cost_inr: 0.0,
      })
    );
    expect(result).toEqual(fakeTask);
  });
});
