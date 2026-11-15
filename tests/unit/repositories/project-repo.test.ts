import { describe, it, expect, vi } from "vitest";
import { ProjectRepository } from "@/lib/repositories/project-repository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

describe("ProjectRepository", () => {
  it("slugifies project titles cleanly", () => {
    expect(ProjectRepository.slugify("JARVIS Personal AI")).toBe("jarvis-personal-ai");
    expect(ProjectRepository.slugify("Next.js 15 & React 19!")).toBe("nextjs-15-react-19");
    expect(ProjectRepository.slugify("  Spaces   and -- dashes  ")).toBe("spaces-and-dashes");
  });

  it("throws validation error on empty project name", async () => {
    const mockClient = {} as SupabaseClient<Database>;
    const repo = new ProjectRepository(mockClient);

    await expect(repo.create("user-1", { name: "" })).rejects.toThrow(
      /Project name is required/i
    );
  });

  it("calls supabase insert with correct parameters and returns project", async () => {
    const fakeProject = {
      id: "proj-123",
      user_id: "user-1",
      name: "Alpha Project",
      slug: "alpha-project",
      default_branch: "main",
      status: "active",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: fakeProject, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    const mockClient = { from: mockFrom } as unknown as SupabaseClient<Database>;
    const repo = new ProjectRepository(mockClient);

    const result = await repo.create("user-1", { name: "Alpha Project" });

    expect(mockFrom).toHaveBeenCalledWith("projects");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Alpha Project",
        slug: "alpha-project",
        default_branch: "main",
        status: "active",
      })
    );
    expect(result).toEqual(fakeProject);
  });
});
