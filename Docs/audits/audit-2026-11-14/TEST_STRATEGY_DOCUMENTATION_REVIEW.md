# Project Jarvis — Test Strategy Documentation Review

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent QA & Test Strategy Audit Board  
**Target Documents:** `TEST_STRATEGY.md`, `MVP_ACCEPTANCE_CHECKLIST.md`, `ROADMAP.md`, `CHANGELOG.md`, `TASK_BOARD.md`

---

## 1. Executive Evaluation of Test Strategy

The documented test strategy for Project Jarvis establishes a rigorous, comprehensive quality engineering framework. 

Particularly commendable is the principle of **Evidence Over Claims**: the documentation repeatedly mandates that an agent or worker must never mark a task or test suite as passed based on natural-language claims alone. Passing status requires a captured operating system process exit code `0` and verified assertion output logs.

However, the audit board uncovered a critical governance issue:
$$\mathbf{Status\ Disconnect:\ Implementation\ Claims\ vs\ Acceptance\ Evidence}$$
While `CHANGELOG.md` and `TASK_BOARD.md` claim that **43 automated tests** have passed across Milestones 1 through 7, `MVP_ACCEPTANCE_CHECKLIST.md` remains completely unchecked, and no test execution or code inspection was permitted during this documentation-only phase. All claims of existing passed tests are formally classified as:
$$\mathbf{NOT\ VERIFIED\ —\ SOURCE\text{-}CODE\ AUDIT\ PENDING}$$

---

## 2. Review of the 6-Layer Testing Pyramid

`TEST_STRATEGY.md` defines 6 distinct verification layers:

```
                      +---------------------------------------+
                      | Layer 6: Operational & Chaos Tests    |
                      | (Rate Limits, Timeouts, Kill-Switch)  |
                      +-------------------+-------------------+
                                          |
                              +-----------v-----------+
                              | Layer 5: Recovery     |
                              | (Restarts, Restores)  |
                              +-----------+-----------+
                                          |
                          +---------------v---------------+
                          | Layer 4: Security & Injection |
                          | (Sandboxing, Auth Bypass)     |
                          +---------------+---------------+
                                          |
                      +-------------------v-------------------+
                      | Layer 3: End-to-End Autonomous Runs   |
                      | (Task Intake -> Scoped Diff -> PR)    |
                      +-------------------+-------------------+
                                          |
                  +-----------------------v-----------------------+
                  | Layer 2: Subsystem Integration Tests         |
                  | (PostgreSQL, LangGraph, GitHub, Telegram)     |
                  +-----------------------+-----------------------+
                                          |
          +-------------------------------v-------------------------------+
          | Layer 1: Unit & Domain Logic Tests                            |
          | (State Transitions, Policy Tokenizer, Pydantic Schema Checks) |
          +---------------------------------------------------------------+
```

### Layer-by-Layer Assessment:

| Layer | Documented Scope | Strengths | Missing Specifications / Deficiencies |
|:---|:---|:---|:---|
| **1. Unit Tests** | Pydantic models, state transitions, command allowlist tokenizer, approval hashing. | Fast, in-memory execution; validates deterministic policy layer without network. | Lacks property-based testing (Hypothesis) for the command tokenizer and JSON payload normalizer. |
| **2. Integration Tests** | Database sessions, Alembic migrations, LangGraph checkpoints, GitHub API client, Telegram service. | Uses `httpx.AsyncClient` with `ASGITransport` for in-memory FastAPI testing. | Omits explicit test harness for verifying Supabase transaction pooling under concurrent load. |
| **3. End-to-End Tests** | Full autonomous coding lifecycle against a demo repository. | Requires verified PR creation and diff evidence capture. | Lacks concrete specification of the synthetic demo repository structure and expected code edits. |
| **4. Security Tests** | Prompt injection, directory traversal (`../`), command bypass, secret leakage. | Dedicated test cases defined in `THREAT_MODEL.md` §4. | Lacks fuzzing tests for path normalization and environment variable redactors. |
| **5. Recovery Tests** | Process restart mid-task, interrupted worker cleanup, database restore from backup. | Validates LangGraph state rehydration from PostgreSQL checkpoints. | Does not define automated assertions for validating row counts and schema integrity post-restore. |
| **6. Operational Tests**| Model rate limiting (429), worker timeout (10 min), paid circuit breaker. | Verifies system behavior under degraded infrastructure. | Lacks chaos testing specification for sudden network disconnection during git push or PR creation. |

---

## 3. AI & Autonomous Agent Evaluation Framework

Testing autonomous AI workflows requires testing methodologies fundamentally different from traditional deterministic software. `TEST_STRATEGY.md` correctly emphasizes:
> *"AI output tests should use assertions on structured behavior, not brittle exact wording."*

### 3.1 Deterministic Mock Provider Strategy
- **Mechanism:** Unit and CI tests route AI calls to `MockProvider`.
- **Behavior:** The mock provider returns synthetic, deterministic JSON plans, file diffs, and code edits without making live network requests.
- **Evaluation:** **Exemplary.** This eliminates non-deterministic CI failures, guarantees 100% offline test execution, and eliminates API billing costs during automated testing.

### 3.2 Evaluation Scenarios for Real Model Adapters
For integration and staging runs using live models, the documentation specifies 7 behavioral test cases:
1. **Planning Completeness:** Plan covers all files identified in task requirements.
2. **Correct Tool Selection:** Selects `file_edit` or `run_test` appropriately; does not attempt unapproved shell tools.
3. **Accurate Test Failure Reporting:** Correctly reports stack traces when tests fail; does not claim success.
4. **Refusal to Follow Untrusted Instructions:** Ignores prompt-injection directives embedded in repository markdown or issues.
5. **Zero Secrets in Generated Diff:** Generated code contains no API keys, tokens, or hardcoded passwords.
6. **Correct Approval Escalation:** Pauses workflow and issues `ApprovalRequest` when encountering sensitive actions.
7. **Bounded Retry Behavior:** Halts after 3 consecutive test failures without entering an infinite loop.

---

## 4. End-to-End Acceptance Scenario Evaluation

`TEST_STRATEGY.md` §4 specifies a mandatory end-to-end acceptance scenario:
1. Owner submits task for a designated demo repository via Telegram or Dashboard.
2. Control plane persists task and initiates LangGraph workflow.
3. AI planner analyzes repo and produces structured implementation steps.
4. Worker receives scoped GitHub App installation token.
5. Worker modifies feature in isolated workspace and runs test runner.
6. Process exit code `0` and test logs captured.
7. Pull Request opened against designated feature branch.
8. Owner receives notification with PR link, diff summary, and test logs.
9. System guarantees **no automatic merge or deployment occurs**.

**Audit Verdict:** This scenario is complete, unambiguous, and serves as an ideal benchmark for the future Phase B source-code audit.

---

## 5. Testing Deficiencies & Recommendations

1. **Synthetic Demo Repository Specification:** The documentation mandates testing against an "authorized demo repository" but does not specify its language, structure, or test suite. A minimal Python repository (e.g. `calculator-demo` with `pytest`) should be formally specified.
2. **Postgres Checkpoint Concurrency Tests:** Add explicit test cases for concurrent LangGraph checkpoint writes to verify that connection pooling does not deadlock under rapid state transitions.
3. **Property-Based Parser Testing:** Specify property-based tests (using `hypothesis`) for `workers/test_parser.py` to ensure it cannot be fooled by synthetic test runner outputs (e.g. output containing `=== 10 passed ===` inside a failed exception string).
4. **Reconciliation with Acceptance Checklist:** Ensure all 35 items in `MVP_ACCEPTANCE_CHECKLIST.md` are directly mapped to automated test assertions.
