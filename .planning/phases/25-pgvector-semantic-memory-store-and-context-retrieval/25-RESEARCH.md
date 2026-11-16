# Phase 25 Research: pgvector Semantic Memory Store & Context Retrieval

## 1. Domain Overview & Problem Statement

Phase 25 is the third phase of **Milestone 7 (v7.0 — Projects, Agents & Memory UI)**. It fulfills:
- **`REQ-MEM-01` (pgvector Semantic Memory Repository):** Typed `MemoryRepository` integrating with `public.memories` using 1536-dimensional vector embeddings via OpenRouter (with deterministic local fallback) across 4 categories: `user_preference`, `project_decision`, `architecture_pattern`, `historical_error`.
- **`REQ-MEM-02` (Memory Retrieval & Agent Context Injection):** Vector similarity search querying memories by cosine distance and injecting top-K relevant past architectural patterns and historical errors into `SpecifierAgent` and `PlannerAgent`.
- **`REQ-MEM-03` (Memory Curation & Management UI):** Web interface (`/memory` and API `/api/memories`) to browse, filter by category/project, search semantically, manually create, and delete memories with full provenance and timestamp tracking.
- **`NFR-PERF-01` (Performant Vector Queries):** Semantic memory similarity searches execute in <150ms using HNSW cosine index.

Currently, `public.memories` exists in the database with an HNSW cosine index (`idx_memories_embedding`), but lacks:
1. A typed data access repository (`MemoryRepository`).
2. A reliable 1536-dimensional embedding generator supporting both OpenRouter (`text-embedding-3-small`) and an offline deterministic fallback.
3. A Supabase RPC stored procedure (`match_memories`) for cosine similarity filtering.
4. Agent context synthesis wiring to automatically feed relevant past decisions and error mitigations into prompt pipelines.
5. An interactive curation web interface for reviewing, searching, and managing memories.

---

## 2. Technical Architecture & Information Flow

```
                                User Request / Task Prompt
                                            │
                                            ▼
                                   EmbeddingService
                         (OpenRouter text-embedding-3-small
                          or Deterministic 1536-dim Fallback)
                                            │
                                            ▼
                                    MemoryRepository
                              (searchSimilarMemories)
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
           Supabase RPC: match_memories                  Candidate Fallback
            (HNSW Cosine Vector Search)              (In-Memory Cosine Sim)
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            │
                                            ▼
                         Top-K Memories Partitioned by Category
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
              SpecifierAgent                                  PlannerAgent
         (Injects user_preference &                    (Injects architecture_pattern
          project_decision into prompt)                 & historical_error into DAG)
```

And for Memory Management:
```
                                      /memory
                               (MemoryBrowserPage)
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 MemoryMetricsBar               MemoryFilterBar
            (Total, Preferences, Decisions,   (Category tabs, Project select,
             Patterns, Historical Errors)      Semantic / Text Search Input)
                         │                             │
                         └──────────────┬──────────────┘
                                        ▼
                                MemoryCardsGrid
                    (Category Badge, Content, Project Tag,
                     Cosine Similarity Score, Actions: Delete/Copy)
                                        │
                                        ▼
                               CreateMemoryModal
                    (Category, Project, Content Textarea,
                     Embedding Generation Trigger)
```

---

## 3. Database Schema & RPC Function

### 3.1 Existing `public.memories` Table
Defined in `supabase/migrations/20261115000001_initial_schema.sql`:
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `user_id`: UUID (References `public.user_profiles(id)`)
- `project_id`: UUID (Optional reference to `public.projects(id)`)
- `category`: TEXT (Check constraint: `'user_preference'`, `'project_decision'`, `'architecture_pattern'`, `'historical_error'`)
- `content`: TEXT
- `embedding`: VECTOR(1536)
- `metadata`: JSONB (Default `'{}'::jsonb`)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ
- Indexes:
  - `idx_memories_embedding`: HNSW index using `vector_cosine_ops`
  - `idx_memories_user_cat`: B-tree index on `(user_id, category)`

### 3.2 Required RPC Migration: `match_memories`
A new migration `supabase/migrations/20261116000001_match_memories_rpc.sql`:
```sql
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  category text,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.project_id,
    m.category,
    m.content,
    m.metadata,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at,
    m.updated_at
  FROM public.memories m
  WHERE (filter_user_id IS NULL OR m.user_id = filter_user_id)
    AND (filter_project_id IS NULL OR m.project_id = filter_project_id OR m.project_id IS NULL)
    AND (filter_category IS NULL OR m.category = filter_category)
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 4. Embedding Generation & Fallback Mathematics

### 4.1 Primary Provider: OpenRouter `text-embedding-3-small`
- Target dimension: **1536**.
- API: `https://openrouter.ai/api/v1/embeddings`
- Input: String content or text chunk.
- Output: Float32 array of length 1536.

### 4.2 Offline Deterministic Fallback Generator
When offline, without `OPENROUTER_API_KEY`, or in test environments:
1. Tokenize input string into words and character n-grams (bigrams/trigrams).
2. For each token, compute its 32-bit FNV-1a or Murmur/SHA-256 hash.
3. Project hash onto vector positions $0..1535$ using a pseudorandom Gaussian mapping seeded by the token hash.
4. Accumulate weights and normalize the resulting vector to unit Euclidean norm ($\|v\|_2 = 1.0$).
5. Mathematical property:
   - Identical texts yield identical vectors ($\text{sim} = 1.0$).
   - Texts sharing vocabulary or n-grams have high cosine similarity.
   - Distinct semantic texts produce lower similarity scores.
   - Vector dimension is strictly 1536, perfectly compatible with `pgvector VECTOR(1536)`.

---

## 5. Agent Context Injection Protocol

### 5.1 Specifier Agent Context
- Query: Raw user task prompt.
- Categories: `user_preference`, `project_decision`.
- Limit: Top 5 memories, similarity $\ge 0.70$.
- Injected section:
  ```markdown
  ### Relevant Project Decisions & Preferences:
  1. [project_decision] All API endpoints must return standardized JSON error envelopes with code and message.
  2. [user_preference] Prefer Tailwind CSS utility classes over custom CSS modules.
  ```

### 5.2 Planner Agent Context
- Query: Task title + specification scope + acceptance criteria.
- Categories: `architecture_pattern`, `historical_error`.
- Limit: Top 5 memories, similarity $\ge 0.70$.
- Injected section:
  ```markdown
  ### Historical Errors to Avoid & Architectural Patterns:
  1. [historical_error] Do not omit type casting on Zod schema records; z.record requires two arguments in v3.24+.
  2. [architecture_pattern] All repository operations must extend BaseRepository and wrap Supabase client calls with error handling.
  ```

---

## 6. Verification & Quality Plan

1. **Embedding Service:** Test OpenRouter client, deterministic fallback generation, vector dimension (1536), unit length ($\|v\| = 1$), and cosine similarity helper.
2. **Memory Repository:** Test memory creation with embedding generation, listing with category/project filters, semantic search with thresholding, update, and deletion.
3. **Agent Context Injection:** Test that `SpecifierAgent` and `PlannerAgent` correctly retrieve and incorporate top-K memories into prompt generation without exceeding context limits.
4. **API Routes & Web UI:** Test `GET /api/memories`, `POST /api/memories`, `DELETE /api/memories/[id]`, and UI components (`MemoryBrowserView`, `CreateMemoryModal`, category filtering, search).
5. **Next.js Production Build:** Full compile with zero errors and zero warnings across all 24+ routes.
