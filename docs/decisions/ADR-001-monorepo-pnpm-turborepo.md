# ADR-001: Monorepo Architecture with pnpm and Turborepo

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** Principal Software Architect, Staff Backend Engineer  

---

## Context and Problem Statement
Jarvis consists of multiple user applications (Next.js Dashboard, Telegram Webhook handlers), background workers (Coding Agent runner, Python automation), and shared packages (Core domain models, Database repositories, Contracts, AI provider client). We need a repository architecture that supports shared TypeScript types, strict version control, zero duplicate code, and fast incremental builds.

## Decision Drivers
- Strict workspace boundary enforcement without phantom dependency leakage.
- Shared domain contracts and Zod schemas between backend, frontend, and runner.
- High-speed task caching and pipeline orchestration for CI/CD.
- Developer experience for a single architect managing full-stack workflows.

## Considered Options
1. Multi-repository setup (separate repos for dashboard, backend, agents).
2. Monorepo with npm/yarn workspaces.
3. Monorepo with pnpm workspaces and Turborepo.

## Decision Outcome
Chosen option: **Monorepo with pnpm workspaces and Turborepo**.

### Positive Consequences
- **Strict Dependency Isolation:** pnpm's content-addressable, symlinked store prevents phantom dependencies where packages import undeclared transitive dependencies.
- **Turborepo Caching:** Intelligent remote and local caching accelerates linting, testing, and building across packages.
- **Atomic Commits:** Changes across API contracts and dashboard views are versioned in single, atomic commits.

### Negative Consequences / Trade-offs
- Windows development occasionally requires running pnpm commands with appropriate process permissions.
