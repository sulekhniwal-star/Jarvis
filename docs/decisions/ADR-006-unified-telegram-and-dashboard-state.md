# ADR-006: Unified State Synchronization Across Telegram and Web Dashboard

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** Staff Backend Engineer, Mobile & Frontend Lead  

---

## Context and Problem Statement
Jarvis interacts with the user through two distinct interfaces: the Telegram Bot (mobile convenience, emergency alerts, 1-click approvals) and the Next.js Web Dashboard (project management, DAG visualization, audit inspection). If state is maintained independently in memory or split across webhook caches, user interactions will diverge, leading to split-brain states or conflicting approvals.

## Decision Drivers
- Strict state parity: actions taken on Telegram must reflect instantly on the Web Dashboard and vice versa.
- Durability: state must survive server restarts and local client disconnections.
- Low-latency real-time updates without polling loops.

## Considered Options
1. Separate backends with periodic polling synchronization.
2. Web Dashboard as primary; Telegram as a detached notification pusher.
3. Unified PostgreSQL state with Supabase Realtime subscriptions and Telegram webhook routing.

## Decision Outcome
Chosen option: **Unified PostgreSQL state with Supabase Realtime subscriptions and Telegram webhook routing**.

### Positive Consequences
- **Single Source of Truth:** Both Telegram webhooks and Next.js Server Actions mutate the exact same PostgreSQL tables (`tasks`, `approval_requests`, `projects`).
- **Real-Time Parity:** Dashboard listens via Supabase Realtime; when an approval is clicked in Telegram, the Dashboard modal resolves instantly in real time without a page refresh.
- **Audit Consistency:** All user actions are tagged with their origin channel (`channel: 'TELEGRAM' | 'WEB'`) in the centralized `audit_logs` table.

### Negative Consequences / Trade-offs
- Webhook routes must handle transient network retries idempotently to prevent duplicate commands.
