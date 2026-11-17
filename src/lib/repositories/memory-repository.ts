import { BaseRepository } from "./base";
import { Memory, MemoryCategory, Json, TablesUpdate } from "@/types/database";
import { EmbeddingService } from "@/lib/ai/embedding-service";

export interface CreateMemoryDTO {
  userId: string;
  projectId?: string | null;
  category: MemoryCategory;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface UpdateMemoryDTO {
  category?: MemoryCategory;
  content?: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface MemoryListFilters {
  userId?: string;
  projectId?: string | null;
  category?: MemoryCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SemanticSearchParams {
  query: string;
  userId?: string;
  projectId?: string | null;
  category?: MemoryCategory;
  matchThreshold?: number;
  matchCount?: number;
}

export type ScoredMemory = Memory & { similarity: number };

export class MemoryRepository extends BaseRepository {
  private readonly embeddingService: EmbeddingService;

  constructor(client: any, embeddingService?: EmbeddingService) {
    super(client);
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Creates a new memory item with automatically generated 1536-dimensional vector embedding.
   */
  public async createMemory(dto: CreateMemoryDTO): Promise<Memory> {
    try {
      const embedding =
        dto.embedding ?? (await this.embeddingService.generateEmbedding(dto.content));

      const { data, error } = await this.client
        .from("memories")
        .insert({
          user_id: dto.userId,
          project_id: dto.projectId ?? null,
          category: dto.category,
          content: dto.content,
          embedding: JSON.stringify(embedding),
          metadata: (dto.metadata as Json) ?? {},
        })
        .select()
        .single();

      if (error) {
        this.handleError(error, "Failed to create memory record");
      }

      return data;
    } catch (err) {
      this.handleError(err, "Failed to create memory record");
    }
  }

  /**
   * Retrieves a memory item by ID.
   */
  public async getById(id: string): Promise<Memory | null> {
    try {
      const { data, error } = await this.client
        .from("memories")
        .select()
        .eq("id", id)
        .maybeSingle();

      if (error) {
        this.handleError(error, `Failed to retrieve memory '${id}'`);
      }

      return data;
    } catch (err) {
      this.handleError(err, `Failed to retrieve memory '${id}'`);
    }
  }

  /**
   * Lists memories matching optional user, project, category, and text search filters.
   */
  public async listMemories(
    filters: MemoryListFilters = {}
  ): Promise<{ data: Memory[]; total: number }> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    try {
      let query = this.client
        .from("memories")
        .select("*", { count: "exact" });

      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters.projectId !== undefined) {
        if (filters.projectId === null) {
          query = query.is("project_id", null);
        } else {
          query = query.eq("project_id", filters.projectId);
        }
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.search) {
        query = query.ilike("content", `%${filters.search}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.handleError(error, "Failed to list memory records");
      }

      return {
        data: data ?? [],
        total: count ?? 0,
      };
    } catch (err) {
      this.handleError(err, "Failed to list memory records");
    }
  }

  /**
   * Performs semantic vector similarity search using pgvector cosine distance.
   * Leverages Supabase RPC `match_memories` with an automatic in-memory fallback
   * for test environments or offline execution.
   */
  public async searchSimilarMemories(
    params: SemanticSearchParams
  ): Promise<ScoredMemory[]> {
    const threshold = params.matchThreshold ?? 0.7;
    const count = params.matchCount ?? 5;

    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(params.query);

      // Attempt pgvector RPC first
      try {
        const { data: rpcResults, error: rpcError } = await this.client.rpc(
          "match_memories",
          {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: threshold,
            match_count: count,
            filter_user_id: params.userId ?? null,
            filter_project_id: params.projectId ?? null,
            filter_category: params.category ?? null,
          }
        );

        if (!rpcError && Array.isArray(rpcResults)) {
          return rpcResults.map((r: any) => ({
            ...r,
            similarity: typeof r.similarity === "number" ? r.similarity : 1.0,
          }));
        }
      } catch {
        // Fallback to in-memory cosine similarity ranking
      }

      // Fallback: fetch candidate memories and compute cosine similarities in memory
      let query = this.client.from("memories").select();

      if (params.userId) {
        query = query.eq("user_id", params.userId);
      }
      if (params.category) {
        query = query.eq("category", params.category);
      }

      const { data: candidates, error: candidateError } = await query.limit(100);
      if (candidateError || !candidates) {
        return [];
      }

      const scored: ScoredMemory[] = [];

      for (const item of candidates as Memory[]) {
        let itemEmbedding: number[] | null = null;

        if (item.embedding) {
          if (Array.isArray(item.embedding)) {
            itemEmbedding = item.embedding;
          } else if (typeof item.embedding === "string") {
            try {
              itemEmbedding = JSON.parse(item.embedding);
            } catch {
              itemEmbedding = null;
            }
          }
        }

        // If candidate has no embedding, generate it dynamically for comparison
        if (!itemEmbedding) {
          itemEmbedding = this.embeddingService.deterministicLocalEmbedding(item.content);
        }

        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding,
          itemEmbedding
        );

        if (similarity >= threshold) {
          scored.push({
            ...item,
            similarity,
          });
        }
      }

      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, count);
    } catch (err) {
      this.handleError(err, "Failed to perform semantic memory search");
    }
  }

  /**
   * Updates an existing memory item and refreshes embedding if content was modified.
   */
  public async updateMemory(
    id: string,
    userId: string,
    data: UpdateMemoryDTO
  ): Promise<Memory> {
    try {
      const updates: TablesUpdate<"memories"> = {
        updated_at: new Date().toISOString(),
      };

      if (data.category !== undefined) updates.category = data.category;
      if (data.projectId !== undefined) updates.project_id = data.projectId;
      if (data.metadata !== undefined) updates.metadata = data.metadata as Json;

      if (data.content !== undefined) {
        updates.content = data.content;
        updates.embedding = data.embedding
          ? JSON.stringify(data.embedding)
          : JSON.stringify(await this.embeddingService.generateEmbedding(data.content));
      } else if (data.embedding !== undefined) {
        updates.embedding = JSON.stringify(data.embedding);
      }

      const { data: updated, error } = await this.client
        .from("memories")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        this.handleError(error, `Failed to update memory '${id}'`);
      }

      return updated;
    } catch (err) {
      this.handleError(err, `Failed to update memory '${id}'`);
    }
  }

  /**
   * Deletes a memory item with user authorization.
   */
  public async deleteMemory(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("memories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        this.handleError(error, `Failed to delete memory '${id}'`);
      }

      return true;
    } catch (err) {
      this.handleError(err, `Failed to delete memory '${id}'`);
    }
  }
}

