# Architecture Research & System Topology — Jarvis

## Overview

Jarvis is architected as an event-driven, state-persistent AI command centre separating user interfaces, core orchestration, database persistence, and isolated execution runners.

---

## 1. System Topology & Component Boundaries

```
[ Web Dashboard (Next.js) ]       [ Telegram Bot ]
             │                             │
             └──────────────┬──────────────┘
                            ▼
              [ Orchestration API Layer ]
              (Auth, Guards, Task Intake)
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
[ Supabase / Postgres ]  [ AI Gateway ]   [ Runner Coordinator ]
 (RLS, State, Storage)   (OpenRouter)     (Isolated Sandbox / Actions)
                                                 │
                                                 ▼
                                        [ Ephemeral Runner ]
                                        (Aider / Git on main)
```

---

## 2. Security Boundaries & Invariants

1. **Browser Isolation:**
   - No database service-role keys, OpenRouter API keys, GitHub tokens, or Telegram bot tokens in client bundles.
   - Client access to Supabase relies on authenticated JWTs subject to Row-Level Security (RLS).
2. **Execution Sandboxing:**
   - Coding agents run in isolated Docker containers or ephemeral GitHub Actions runners.
   - Runners mount only the working repository; secrets are injected as short-lived, least-privilege environment tokens.
3. **Repository Policy Enforcement:**
   - Branch enforcement is validated prior to every git operation.
   - If `git branch --show-current` is not `main`, operations hard-abort immediately.
   - Pushes to remote require explicit owner approval by default.
4. **Approval Enforcement Gate:**
   - Protected actions (paid AI inference, git push, production deployment, destructive operations) verify a valid, non-expired, matching approval record before invoking downstream providers.

---

## 3. Data Flow

1. **Intake:** User submits intent via Web UI or Telegram.
2. **Analysis & Specification:** AI Gateway generates structured requirements and acceptance criteria using free-tier models (e.g. Meta LLaMA 3.3 70B, Google Gemini 2.0 Flash / Experimental on OpenRouter).
3. **Plan Generation:** Decomposes requirement into waves of atomic tasks (2-3 tasks per plan).
4. **Approval:** If the plan incurs costs or requests external writes, an approval record is created.
5. **Execution:** Runner Coordinator spins up disposable sandbox, runs agent, runs test suite.
6. **Verification & Audit:** Captures outputs, diff review, logs run events to Postgres, updates task state.
