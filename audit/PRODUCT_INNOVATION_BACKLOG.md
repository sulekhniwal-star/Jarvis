# Project Jarvis — Product Innovation & Evolution Backlog

**Document Version:** 1.0.0  
**Status:** Active Prioritized Backlog  
**Product Strategy Lead:** Principal Product Manager & Chief Innovation Officer  

---

## 1. Innovation Framework & Strategic Pillars

Every feature in the backlog is evaluated across 8 criteria (scored 1 to 10):
- **UV:** User Value (Utility & friction reduction)
- **BV:** Business Value (Operational savings & velocity)
- **DIFF:** Differentiation (Competitive advantage)
- **FEAS:** Technical Feasibility (Fit with current architecture)
- **ALIGN:** Strategic Alignment (Adherence to core principles)
- **EFF (Inv):** Implementation Effort (10 = Low effort, 1 = Very high effort)
- **MAINT (Inv):** Maintenance Ease (10 = Low maintenance burden)
- **SEC:** Security & Privacy Safety (10 = Low risk)

---

## 2. Prioritized Product Innovation Proposals

| ID | Title | Pillar | UV | BV | DIFF | FEAS | ALIGN | EFF | MAINT | SEC | Score | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **INN-01** | **Direct Task Retry & Diagnostic Re-run API** | Core SDLC | 9 | 8 | 7 | 10 | 10 | 9 | 9 | 10 | **9.0** | **Critical Improvement** |
| **INN-02** | **Persistent Emergency Lockdown State** | Security & SRE | 9 | 9 | 8 | 10 | 10 | 9 | 9 | 10 | **9.25** | **Critical Improvement** |
| **INN-03** | **Pre-Computed Cryptographic Test Fixtures** | DX & CI/CD | 8 | 8 | 6 | 10 | 10 | 10 | 10 | 10 | **9.0** | **High-Priority Feature** |
| **INN-04** | **Dedicated Real-Time Execution Logs Endpoint** | Usability & Observability | 9 | 7 | 7 | 9 | 10 | 9 | 9 | 10 | **8.75** | **High-Priority Feature** |
| **INN-05** | **Automated PR Diff Inspector in HUD** | Usability & Governance | 9 | 8 | 8 | 8 | 9 | 7 | 8 | 9 | **8.25** | **Competitive Advantage** |
| **INN-06** | **Multi-Model Fallback Cascade** (Gemini -> DeepSeek -> OpenRouter) | Reliability & Cost | 9 | 9 | 9 | 8 | 9 | 7 | 7 | 9 | **8.38** | **Strategic Innovation** |
| **INN-07** | **Interactive Code Review Comments on PRs** | Agent Collaboration | 8 | 8 | 9 | 8 | 9 | 6 | 7 | 9 | **8.0** | **Competitive Advantage** |
| **INN-08** | **Voice-Activated Task Intake (Whisper Audio)** | Mobile UX | 7 | 6 | 8 | 8 | 8 | 6 | 7 | 8 | **7.25** | **Experimental Opportunity** |

---

## 3. Detailed Proposal Profiles

### INN-01: Direct Task Retry & Diagnostic Re-run API
- **User Problem:** When a task experiences an intermittent network glitch, rate-limit, or test failure, the operator currently has to create a brand-new task manually.
- **Solution:** Add `POST /api/v1/tasks/{task_id}/retry` which transitions the task back to `PLANNING` or `EXECUTING`, increments a retry counter, and executes a targeted diagnostic run.

### INN-02: Persistent Emergency Lockdown State
- **User Problem:** When the operator hits Emergency Stop, the system is protected in-memory, but if the process or container restarts, lockdown status is lost.
- **Solution:** Write `.jarvis_system_state.json` on disk atomically; read on startup so that an emergency shutdown state survives restarts until explicitly cleared by the owner.

### INN-03: Pre-Computed Cryptographic Test Fixtures
- **User Problem:** Automated test runs take ~18 seconds due to per-test Argon2id password hashing in fixtures, slowing down local development iterations.
- **Solution:** Memoize the test password hashes so they are computed once per test session.

