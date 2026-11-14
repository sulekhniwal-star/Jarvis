# Memory Architecture & Vector Retrieval: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Senior AI-Agent Engineer & Database Architect  
**Date:** November 14, 2026  

---

## 1. Memory Tiering Model

To operate effectively over months and across multiple codebases without incurring extreme token overhead or losing context, Jarvis implements a three-tier memory hierarchy:

```
[ Tier 1: Ephemeral Working Memory ]
  ├── Active task prompt, current file diffs, runner stdout
  └── Lifetime: Duration of a single agent run / task step

[ Tier 2: Project-Scoped Relational Context ]
  ├── Project roadmap, active milestones, open issues, task history
  └── Lifetime: Lifespan of the project in PostgreSQL

[ Tier 3: Persistent Long-Term Memory (pgvector + Full-Text) ]
  ├── Architectural Decision Records (ADRs), user preferences, past bug patterns
  └── Lifetime: Permanent, searchable via vector similarity & full-text fallback
```

---

## 2. Vector Retrieval Pipeline (`pgvector`)

### 2.1 Storage & Schema
Long-term memories reside in `public.memories` using the PostgreSQL `vector(1536)` type with an HNSW index for high-speed approximate nearest neighbor (ANN) search:

```sql
create index idx_memories_hnsw on public.memories
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);
```

### 2.2 Ingestion & Semantic Chunking
1. **Decision Ingestion:** Whenever an ADR is created, a PR is merged, or a complex bug fix loop succeeds, the Review Agent summarizes the key lesson or decision.
2. **Embedding Generation:** The text is embedded via an affordable/free embedding model (or OpenRouter text-embedding endpoint) producing a 1536-dimensional vector.
3. **Metadata Indexing:** Stored with structured JSON metadata (`projectId`, `category`, `filesAffected`, `timestamp`).

### 2.3 Hybrid Retrieval & Fallback Strategy
When an agent prepares a new task specification, it executes a **Hybrid Search**:
1. **Semantic Search:** Queries cosine similarity between task prompt embedding and stored memory vectors:
   ```sql
   select id, content, 1 - (embedding <=> :query_embedding) as similarity
   from public.memories
   where project_id = :project_id and (1 - (embedding <=> :query_embedding)) > 0.75
   order by similarity desc limit 5;
   ```
2. **Full-Text Search Fallback:** If vector similarity yields fewer than 2 high-confidence results, a PostgreSQL full-text search fallback query is executed using `to_tsquery('english', :keywords)`.

---

## 3. Memory Governance: Correction, Deletion, & Audit

1. **User Control & Deletion:** Through the Web Dashboard or Telegram command (`/memory forget <id>`), users can inspect, correct, or permanently purge any memory record.
2. **Audit History:** Every modification, correction, or deletion of a memory item is recorded in `audit_logs` to maintain transparency and prevent subtle context corruption.
