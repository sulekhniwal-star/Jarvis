# ADR-005: Central Permission Engine & Hard Financial Caps

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** Principal Software Architect, Governance & Finance Lead  

---

## Context and Problem Statement
Autonomous AI agents can rapidly incur severe financial expenses or cause destructive system failures if permitted to operate without strict boundaries (e.g. infinite retry loops, accidental production database drops, or sending unreviewed public emails). We need an immutable, centralized governance layer that cannot be overridden by agent prompts.

## Decision Drivers
- Strict, non-negotiable financial limit: Normal monthly budget INR 750, daily limit INR 25, emergency reserve INR 250 (max monthly INR 1,000).
- Prevention of unapproved paid AI inference.
- Preservation of human authority over production deployments, database migrations, and external communications.
- Real-time mobile (Telegram) and web approval workflows.

## Considered Options
1. Agent self-regulation via system prompts ("Do not spend more than INR 25").
2. Cloud billing alerts with manual cutoff.
3. Central Permission Engine and Budget Manager with pre-flight synchronous policy gates.

## Decision Outcome
Chosen option: **Central Permission Engine and Budget Manager with pre-flight synchronous policy gates**.

### Positive Consequences
- **Deterministic Enforcement:** Pre-flight checks are evaluated in code, completely independent of the LLM. An agent cannot convince the system to bypass budget checks.
- **Financial Protection:** Hard stops block requests before exceeding limits. Paid requests require explicit human approval nonces.
- **One-Click Mobile Approvals:** Approval tickets delivered directly to Telegram with inline buttons for rapid mobile resolution.

### Negative Consequences / Trade-offs
- High-impact tasks pause execution until the human operator resolves the approval ticket.
