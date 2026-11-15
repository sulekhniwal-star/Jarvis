import { describe, it, expect, vi } from "vitest";
import { SpecificationRepository } from "@/lib/repositories/specification-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("SpecificationRepository", () => {
  it("throws validation error on missing required fields", async () => {
    const mockClient = {} as SupabaseClient<Database>;
    const repo = new SpecificationRepository(mockClient);

    await expect(
      repo.create({
        taskId: "",
        scope: "Scope text",
        exclusions: "Exclusions text",
        acceptanceCriteria: [],
        rawUserPrompt: "Prompt",
      })
    ).rejects.toThrow(/Task ID is required/i);

    await expect(
      repo.create({
        taskId: "task-1",
        scope: "",
        exclusions: "Exclusions text",
        acceptanceCriteria: [],
        rawUserPrompt: "Prompt",
      })
    ).rejects.toThrow(/Scope description is required/i);

    await expect(
      repo.create({
        taskId: "task-1",
        scope: "Scope text",
        exclusions: "",
        acceptanceCriteria: [],
        rawUserPrompt: "Prompt",
      })
    ).rejects.toThrow(/Exclusions description is required/i);

    await expect(
      repo.create({
        taskId: "task-1",
        scope: "Scope text",
        exclusions: "Exclusions text",
        acceptanceCriteria: [],
        rawUserPrompt: "",
      })
    ).rejects.toThrow(/Raw user prompt is required/i);
  });

  it("creates a specification with version 1 by default", async () => {
    const fakeSpec = {
      id: "spec-101",
      task_id: "task-1",
      scope: "Full API implementation",
      exclusions: "No UI components",
      acceptance_criteria: [
        {
          id: "AC-1",
          title: "Endpoint returns 200",
          given: "Server running",
          when: "GET /api",
          then: "200 OK",
        },
      ],
      raw_user_prompt: "Build API",
      version: 1,
      created_at: new Date().toISOString(),
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: fakeSpec, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new SpecificationRepository(mockClient);

    const result = await repo.create({
      taskId: "task-1",
      scope: "Full API implementation",
      exclusions: "No UI components",
      acceptanceCriteria: fakeSpec.acceptance_criteria,
      rawUserPrompt: "Build API",
    });

    expect(mockFrom).toHaveBeenCalledWith("specifications");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: "task-1",
        version: 1,
        scope: "Full API implementation",
        exclusions: "No UI components",
        raw_user_prompt: "Build API",
      })
    );
    expect(result).toEqual(fakeSpec);
  });

  it("retrieves the latest specification for a task via findByTaskId", async () => {
    const latestSpec = {
      id: "spec-v2",
      task_id: "task-1",
      scope: "Revised scope",
      exclusions: "No UI",
      acceptance_criteria: [],
      raw_user_prompt: "Build API with extra logging",
      version: 2,
      created_at: new Date().toISOString(),
    };

    const mockLimit = vi.fn().mockResolvedValue({ data: [latestSpec], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new SpecificationRepository(mockClient);

    const result = await repo.findByTaskId("task-1");

    expect(mockFrom).toHaveBeenCalledWith("specifications");
    expect(mockEq).toHaveBeenCalledWith("task_id", "task-1");
    expect(mockOrder).toHaveBeenCalledWith("version", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result).toEqual(latestSpec);
  });

  it("creates a revision incrementing the version number", async () => {
    const existingSpec = {
      id: "spec-v1",
      task_id: "task-1",
      scope: "Original scope",
      exclusions: "No UI",
      acceptance_criteria: [],
      raw_user_prompt: "Build API",
      version: 1,
      created_at: new Date().toISOString(),
    };

    const revisedSpec = {
      id: "spec-v2",
      task_id: "task-1",
      scope: "Revised scope",
      exclusions: "No UI and no CLI",
      acceptance_criteria: [],
      raw_user_prompt: "Build API v2",
      version: 2,
      created_at: new Date().toISOString(),
    };

    // findByTaskId mock
    const mockLimit = vi.fn().mockResolvedValue({ data: [existingSpec], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectFind = vi.fn().mockReturnValue({ eq: mockEq });

    // insert mock
    const mockSingle = vi.fn().mockResolvedValue({ data: revisedSpec, error: null });
    const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

    const mockFrom = vi.fn((table: string) => {
      return {
        select: mockSelectFind,
        insert: mockInsert,
      };
    });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new SpecificationRepository(mockClient);

    const result = await repo.createRevision("task-1", {
      scope: "Revised scope",
      exclusions: "No UI and no CLI",
      acceptanceCriteria: [],
      rawUserPrompt: "Build API v2",
    });

    expect(result.version).toBe(2);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: "task-1",
        version: 2,
      })
    );
  });
});
