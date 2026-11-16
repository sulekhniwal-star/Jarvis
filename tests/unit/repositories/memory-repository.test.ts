import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRepository } from "@/lib/repositories/memory-repository";
import { EmbeddingService } from "@/lib/ai/embedding-service";

describe("MemoryRepository", () => {
  let mockSupabase: any;
  let mockEmbeddingService: EmbeddingService;
  let repository: MemoryRepository;

  const sampleMemory = {
    id: "mem-001",
    user_id: "user-123",
    project_id: "proj-123",
    category: "project_decision",
    content: "All API routes must return standard JSON envelopes with error and code fields",
    embedding: JSON.stringify(new Array(1536).fill(0.01)),
    metadata: { author: "architect" },
    created_at: "2026-11-17T00:00:00Z",
    updated_at: "2026-11-17T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddingService = new EmbeddingService();

    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    repository = new MemoryRepository(mockSupabase, mockEmbeddingService);
  });

  describe("createMemory", () => {
    it("creates memory record with computed 1536-dim embedding", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: sampleMemory,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const result = await repository.createMemory({
        userId: "user-123",
        projectId: "proj-123",
        category: "project_decision",
        content: "All API routes must return standard JSON envelopes with error and code fields",
        metadata: { author: "architect" },
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("memories");
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(sampleMemory);
    });
  });

  describe("getById", () => {
    it("retrieves memory item by ID", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: sampleMemory,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await repository.getById("mem-001");
      expect(mockEq).toHaveBeenCalledWith("id", "mem-001");
      expect(result).toEqual(sampleMemory);
    });
  });

  describe("listMemories", () => {
    it("lists memories with category, project, and pagination filters", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [sampleMemory],
        count: 1,
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockEqCat = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqProj = vi.fn().mockReturnValue({ eq: mockEqCat });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqProj });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await repository.listMemories({
        userId: "user-123",
        projectId: "proj-123",
        category: "project_decision",
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe("mem-001");
    });
  });

  describe("searchSimilarMemories", () => {
    it("uses pgvector RPC match_memories when available", async () => {
      const mockRpcResults = [
        {
          ...sampleMemory,
          similarity: 0.95,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockRpcResults,
        error: null,
      });

      const results = await repository.searchSimilarMemories({
        query: "API error response format",
        userId: "user-123",
        matchThreshold: 0.7,
        matchCount: 5,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith("match_memories", expect.any(Object));
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.95);
    });

    it("falls back to candidate retrieval and in-memory cosine ranking when RPC fails", async () => {
      // RPC returns error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "function match_memories does not exist" },
      });

      // Candidates query succeeds
      const candidates = [
        {
          ...sampleMemory,
          id: "mem-match",
          content: "API error response format with standard code and message",
          embedding: null, // will compute dynamically
        },
        {
          ...sampleMemory,
          id: "mem-unrelated",
          content: "Baking sourdough bread with hydration ratio",
          embedding: null,
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: candidates,
        error: null,
      });
      const mockEqUser = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const results = await repository.searchSimilarMemories({
        query: "API error response format",
        userId: "user-123",
        matchThreshold: 0.5,
        matchCount: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("mem-match");
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });
  });

  describe("deleteMemory", () => {
    it("deletes memory with user authorization", async () => {
      const mockEqUser = vi.fn().mockResolvedValue({ error: null });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });

      mockSupabase.from.mockReturnValue({ delete: mockDelete });

      const success = await repository.deleteMemory("mem-001", "user-123");
      expect(mockEqId).toHaveBeenCalledWith("id", "mem-001");
      expect(mockEqUser).toHaveBeenCalledWith("user_id", "user-123");
      expect(success).toBe(true);
    });
  });
});
