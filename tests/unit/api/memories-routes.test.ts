import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/memories/route";
import { DELETE } from "@/app/api/memories/[id]/route";

const mockListMemories = vi.fn();
const mockCreateMemory = vi.fn();
const mockSearchSimilarMemories = vi.fn();
const mockDeleteMemory = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/repositories/memory-repository", () => ({
  MemoryRepository: vi.fn().mockImplementation(() => ({
    listMemories: mockListMemories,
    createMemory: mockCreateMemory,
    searchSimilarMemories: mockSearchSimilarMemories,
    deleteMemory: mockDeleteMemory,
  })),
}));

describe("/api/memories Route Handlers", () => {
  const sampleMemory = {
    id: "mem-01",
    user_id: "user-123",
    project_id: null,
    category: "project_decision",
    content: "All database queries must use BaseRepository error handling",
    created_at: "2026-11-17T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/memories", () => {
    it("returns memories with computed category metrics", async () => {
      mockListMemories.mockResolvedValueOnce({
        data: [
          sampleMemory,
          {
            ...sampleMemory,
            id: "mem-02",
            category: "user_preference",
            content: "Prefer TypeScript strict mode",
          },
        ],
        total: 2,
      });

      const request = new NextRequest("http://localhost:3000/api/memories");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.total).toBe(2);
      expect(data.memories).toHaveLength(2);
      expect(data.metrics).toEqual({
        total: 2,
        userPreferences: 1,
        projectDecisions: 1,
        architecturePatterns: 0,
        historicalErrors: 0,
      });
    });

    it("triggers semantic vector search when q parameter is provided", async () => {
      mockSearchSimilarMemories.mockResolvedValueOnce([
        {
          ...sampleMemory,
          similarity: 0.94,
        },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/memories?q=database%20query%20handling"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(mockSearchSimilarMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "database query handling",
          userId: "user-123",
        })
      );
      expect(data.memories).toHaveLength(1);
      expect(data.memories[0].similarity).toBe(0.94);
    });
  });

  describe("POST /api/memories", () => {
    it("creates memory and returns 201 when payload is valid", async () => {
      mockCreateMemory.mockResolvedValueOnce(sampleMemory);

      const request = new NextRequest("http://localhost:3000/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "project_decision",
          content: "All database queries must use BaseRepository error handling",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.memory).toEqual(sampleMemory);
      expect(mockCreateMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "project_decision",
          content: "All database queries must use BaseRepository error handling",
        })
      );
    });

    it("returns 400 when validation fails", async () => {
      const request = new NextRequest("http://localhost:3000/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "invalid_category",
          content: "abc", // too short (<5)
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });
  });

  describe("DELETE /api/memories/[id]", () => {
    it("deletes memory with user authorization", async () => {
      mockDeleteMemory.mockResolvedValueOnce(true);

      const request = new NextRequest("http://localhost:3000/api/memories/mem-01", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "mem-01" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockDeleteMemory).toHaveBeenCalledWith("mem-01", "user-123");
    });
  });
});
