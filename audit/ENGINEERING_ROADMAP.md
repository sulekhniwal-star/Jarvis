# Project Jarvis — Engineering Roadmap

**Roadmap Version:** 1.0.0  
**Planning Horizon:** MVP 1.0 -> Production Hardening -> Autonomous Fleet Operations  

---

## 1. Prioritized Work Streams

### P0 — Critical Stabilization & Resilience
- **TASK-P0-01 (TECH-002): Persistent Emergency Lockdown State:** Ensure emergency stop status is written to disk/persistence so reboots do not lift lockdown.
- **TASK-P0-02 (TECH-001): Test Suite Cryptographic Fixture Caching:** Optimize Argon2id test password hashing to drop pytest execution time from 18s to under 4s.

### P1 — High Priority Core Completion & Observability
- **TASK-P1-01 (INN-01): Task Retry & Diagnostic Re-execution API:** Add `POST /tasks/{task_id}/retry` to allow immediate recovery without creating duplicate tasks.
- **TASK-P1-02 (INN-04): Dedicated Task Execution Logs Endpoint:** Expose `GET /tasks/{task_id}/logs` for real-time streaming and inspection of worker steps.
- **TASK-P1-03 (TECH-003): Wire Orchestrator Executor to Real Sandbox Runner:** Connect LangGraph's `executor_node` with `LocalSandboxRunner` when running under live workspaces.

### P2 — Product Improvement & UX Polish
- **TASK-P2-01 (INN-05): HUD Task Drilldown & Retry Action:** Add a "Retry Mission" button and detailed log inspector modal in the Next.js HUD.
- **TASK-P2-02: Telegram Notification Broadcast Enhancements:** Send structured Telegram alerts when an emergency stop occurs or when a task completes execution.

### P3 — Long-Term Strategic Innovation
- **TASK-P3-01 (INN-06): Multi-Model Fallback Cascade:** Auto-failover from Google Gemini 2.0 Flash to OpenRouter / DeepSeek when rate-limited.
- **TASK-P3-02 (INN-07): Interactive PR Code Review Agent:** Automatically review opened pull requests with inline comments before human merge.

