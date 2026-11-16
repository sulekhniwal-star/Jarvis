import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingService } from "@/lib/ai/embedding-service";

describe("EmbeddingService", () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    embeddingService = new EmbeddingService();
  });

  it("generates deterministic 1536-dimensional unit-normalized embeddings", async () => {
    const text = "Always use Next.js App Router for frontend components";
    const embedding = await embeddingService.generateEmbedding(text);

    expect(embedding).toHaveLength(1536);

    // Compute Euclidean norm: sum of squares must be ~1.0
    const sumSq = embedding.reduce((sum, val) => sum + val * val, 0);
    expect(sumSq).toBeCloseTo(1.0, 4);
  });

  it("produces identical embeddings for identical text inputs", () => {
    const text = "Idempotent database migrations with rollback guards";
    const vec1 = embeddingService.deterministicLocalEmbedding(text);
    const vec2 = embeddingService.deterministicLocalEmbedding(text);

    expect(vec1).toEqual(vec2);
  });

  it("calculates cosine similarity accurately between vectors", () => {
    const text1 = "Autonomous agent execution in secure sandbox";
    const text2 = "Autonomous agent execution in isolated container";
    const text3 = "Complete pizza recipe with mozzarella and tomato";

    const vec1 = embeddingService.deterministicLocalEmbedding(text1);
    const vec2 = embeddingService.deterministicLocalEmbedding(text2);
    const vec3 = embeddingService.deterministicLocalEmbedding(text3);

    // Identical vector similarity must be 1.0
    expect(embeddingService.cosineSimilarity(vec1, vec1)).toBeCloseTo(1.0, 5);

    // Similar text should have higher similarity than completely unrelated text
    const sim12 = embeddingService.cosineSimilarity(vec1, vec2);
    const sim13 = embeddingService.cosineSimilarity(vec1, vec3);

    expect(sim12).toBeGreaterThan(sim13);
  });

  it("normalizes arbitrary vectors to target dimension and unit norm", () => {
    const raw = [3.0, 4.0];
    const normalized = embeddingService.normalizeVector(raw, 4);

    expect(normalized).toHaveLength(4);
    // 3/5 = 0.6, 4/5 = 0.8, padded zeros
    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);
    expect(normalized[2]).toBe(0);
    expect(normalized[3]).toBe(0);
  });

  it("handles empty or whitespace strings gracefully", async () => {
    const emptyEmbedding = await embeddingService.generateEmbedding("   ");
    expect(emptyEmbedding).toHaveLength(1536);
    expect(emptyEmbedding[0]).toBe(1.0);
  });
});
