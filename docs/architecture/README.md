# System Architecture Specifications: Jarvis Autonomous Personal AI

This directory contains technical architecture blueprints, domain models, database schemas, interfaces, and protocol specifications.

## Documents

- [SYSTEM_ARCHITECTURE.md](file:///f:/Javis/docs/architecture/SYSTEM_ARCHITECTURE.md): Multi-tier architecture, data flow diagrams, runner sandboxing, and state machines.
- [TECH_STACK.md](file:///f:/Javis/docs/architecture/TECH_STACK.md): Selection rationale for TypeScript, Python, Next.js, Supabase, OpenRouter, and Aider CLI.
- [DATABASE_SCHEMA.md](file:///f:/Javis/docs/architecture/DATABASE_SCHEMA.md): Complete PostgreSQL schema DDL, Row Level Security (RLS) policies, `pgvector`, and `pgmq`.
- [API_SPECIFICATION.md](file:///f:/Javis/docs/architecture/API_SPECIFICATION.md): Webhook ingress contracts (Telegram, GitHub), Dashboard REST APIs, and runner reporting protocols.
- [AGENT_DESIGN.md](file:///f:/Javis/docs/architecture/AGENT_DESIGN.md): Cognitive architecture for specialized agents (Spec, Plan, Coding, QA, Review).
- [CODING_AGENT_INTERFACE.md](file:///f:/Javis/docs/architecture/CODING_AGENT_INTERFACE.md): Abstract `ICodingAgentAdapter` specification and Aider CLI headless integration.
- [WORKFLOW_ENGINE.md](file:///f:/Javis/docs/architecture/WORKFLOW_ENGINE.md): Distributed DAG execution engine, optimistic concurrency control, and bounded retry matrix.
- [MEMORY_ARCHITECTURE.md](file:///f:/Javis/docs/architecture/MEMORY_ARCHITECTURE.md): `pgvector` HNSW semantic indexing, RAG pipeline, and full-text search fallback.
- [GITHUB_INTEGRATION.md](file:///f:/Javis/docs/architecture/GITHUB_INTEGRATION.md): GitHub App JWT authentication, temporary installation tokens, and pull request automation.
- [TELEGRAM_INTEGRATION.md](file:///f:/Javis/docs/architecture/TELEGRAM_INTEGRATION.md): Telegram Bot API webhook architecture, secret token validation, and mobile command handling.
