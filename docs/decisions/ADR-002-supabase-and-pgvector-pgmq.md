# ADR-002: Managed & Self-Hosted Supabase with pgvector and pgmq

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** Database Architect, Staff Backend Engineer  

---

## Context and Problem Statement
Jarvis requires relational persistence for projects, tasks, and state machines; a message queue for distributing background agent jobs; and vector similarity search for architectural decision retrieval. Introducing separate cloud services (e.g. Neon, AWS SQS, Redis BullMQ, Pinecone) introduces prohibitive infrastructure costs, complex billing, and fragmented security boundaries.

## Decision Drivers
- Zero or minimal initial hosting cost (Supabase Free tier).
- Elimination of external message broker dependencies (e.g., Redis, SQS).
- Transactional atomicity: enqueuing background tasks within the same DB transaction as domain state updates.
- 100% portability to self-hosted Docker Compose.
- Robust Row Level Security (RLS) and server-side authorization.

## Considered Options
1. PostgreSQL (Supabase) + External Redis (Upstash) + External Vector DB (Pinecone).
2. Managed Supabase with PostgreSQL native extensions (`pgmq` for queues, `pgvector` for memory).
3. Pure SQLite on a persistent VPS.

## Decision Outcome
Chosen option: **Managed Supabase with PostgreSQL native extensions (`pgmq` for queues, `pgvector` for memory)**.

### Positive Consequences
- **Native Queuing with `pgmq`:** Guarantees transactional consistency; messages are enqueued atomically with task updates via SQL `select pgmq.send()`.
- **Co-located Semantic Memory:** Vectors live directly alongside relational records; queries join entities seamlessly with cosine similarity filters.
- **Portability:** All extensions (`pgmq`, `pgvector`) are open-source and run identically in Docker Compose self-hosted PostgreSQL.

### Negative Consequences / Trade-offs
- Supabase Free tier has inactivity pause limits, requiring periodic health checks or rapid migration to self-hosted if paused.
