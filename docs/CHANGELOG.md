# Changelog: Jarvis Autonomous Personal AI

All notable changes to the Jarvis project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-11-14

### Added
- **Milestone 0 – Architecture & Governance Foundation:**
  - Initialized comprehensive architectural blueprint and system specifications.
  - Documented complete product requirements (`PRODUCT_REQUIREMENTS.md`) and non-functional constraints.
  - Established system architecture with Mermaid sequence and dataflow diagrams (`SYSTEM_ARCHITECTURE.md`).
  - Authored technology stack rationale and selection criteria (`TECH_STACK.md`).
  - Formulated complete relational schema with strict RLS policies (`DATABASE_SCHEMA.md`).
  - Defined REST, webhook, and runner API contracts (`API_SPECIFICATION.md`).
  - Established specialized multi-agent cognitive architecture (`AGENT_DESIGN.md`).
  - Authored abstract coding agent adapter specification and Aider CLI integration (`CODING_AGENT_INTERFACE.md`).
  - Specified distributed DAG workflow engine with `pgmq` native queuing (`WORKFLOW_ENGINE.md`).
  - Conducted STRIDE threat analysis and credential isolation model (`SECURITY_THREAT_MODEL.md`).
  - Defined bounded autonomy matrix and Central Permission Engine (`PERMISSION_POLICY.md`).
  - Formulated strict financial controls (INR 25/day, INR 750/mo) and telemetry tracking (`BUDGET_AND_COST_CONTROL.md`).
  - Designed long-term vector memory architecture with `pgvector` HNSW indexing (`MEMORY_ARCHITECTURE.md`).
  - Specified least-privilege GitHub App integration and runner dispatch (`GITHUB_INTEGRATION.md`).
  - Defined Telegram Bot webhook and interactive inline button contracts (`TELEGRAM_INTEGRATION.md`).
  - Outlined multi-tier hosting topology on Vercel, Supabase, and GitHub Actions (`DEPLOYMENT_STRATEGY.md`).
  - Documented automated testing pyramid and telemetry recording requirements (`TEST_STRATEGY.md`).
  - Authored backup, disaster recovery, and quarter restoration procedures (`BACKUP_AND_RECOVERY.md`).
  - Established staged product roadmap across 11 MVP milestones (`ROADMAP.md`).
  - Created ADRs 001 through 006 capturing foundational architectural decisions.
  - Scaffolded production monorepo folder layout.
