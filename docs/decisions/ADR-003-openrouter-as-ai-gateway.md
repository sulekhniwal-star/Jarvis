# ADR-003: OpenRouter as Primary Unified AI Gateway

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** Senior AI-Agent Engineer, Staff Backend Engineer  

---

## Context and Problem Statement
Autonomous software development requires testing across a wide range of LLMs (Claude 3.7 Sonnet, DeepSeek V3, Llama 3.3, Qwen 2.5 Coder). Establishing direct billing accounts with Anthropic, OpenAI, DeepSeek, and Google creates operational friction, multiple monthly minimums, and complex credential management. Furthermore, the system mandates a hard monthly spending limit of INR 750 with default reliance on free models.

## Decision Drivers
- Access to a diverse, rolling catalog of 25+ `:free` models (e.g. `openrouter/free`).
- Zero markup on upstream provider inference costs.
- OpenAI-compatible single API contract (`/chat/completions`).
- Granular post-execution cost and token telemetry via `GET /api/v1/generation?id=...`.
- Single API key management.

## Considered Options
1. Direct provider integrations (OpenAI SDK + Anthropic SDK + Google Vertex SDK).
2. OpenRouter API Gateway.
3. Local self-hosted Ollama runner.

## Decision Outcome
Chosen option: **OpenRouter API Gateway**.

### Positive Consequences
- **Free Tier Default:** Jarvis can execute planning and coding iterations at zero token cost using `:free` models.
- **Authoritative Cost Telemetry:** OpenRouter's `/api/v1/generation` returns exact USD costs billed by the upstream provider.
- **Provider Redundancy:** Automatic fallbacks and dynamic routing prevent vendor outages from halting Jarvis.

### Negative Consequences / Trade-offs
- Free-tier models have community rate limits (e.g., 50 req/day unverified, up to 1,000 req/day with $10 credit deposit).
- Free-tier model privacy policies may permit provider training on prompt data, requiring model-card inspection for sensitive enterprise tasks.
