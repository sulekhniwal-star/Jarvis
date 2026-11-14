# Project Jarvis — Testing Strategy & Verification Architecture

**Document Version:** 1.0.0  
**Testing Standard:** Deterministic, Offline-First, Zero-Flake QA Strategy  
**Lead:** QA & Test Automation Lead  

---

## 1. Testing Philosophy & Verification Gates

Project Jarvis follows a multi-tier testing pyramid to guarantee 100% reliability, zero accidental network spend, and comprehensive regression protection:

1. **Unit & Boundary Tests:** Test individual components (cryptography, path traversal prevention, command tokenization, schema validation) in isolation.
2. **Integration Tests:** Test HTTP endpoints, database async transactions, state machine transitions, and checkpointer resilience using in-memory / file-backed SQLite with dependency overrides.
3. **Orchestration Tests:** Test LangGraph StateGraph state transitions, pause/resume mechanisms, and human approval interrupts.
4. **Security Tests:** Verify prompt injection resistance, secret rejection heuristics, credential redaction in audit logs, and directory traversal containment.
5. **Static Analysis & Type Checking:** Enforce type safety across backend (`mypy`) and frontend (`tsc --noEmit`).

---

## 2. Test Execution Map

| Suite Name | Target Directory | Primary Fixtures | Coverage Focus |
|---|---|---|---|
| **Core Foundation** | `backend/tests/integration/test_m1_core.py` | `client`, `auth_headers` | Auth, task creation, breakdown steps, cancellation, task logs, retry |
| **Orchestration** | `backend/tests/integration/test_m2_orchestration.py` | `MemorySaver`, StateGraph | Sensitive keyword detection, approval gating, pause/resume, diagnostic retries |
| **GitHub Integration**| `backend/tests/integration/test_m3_github.py` | Mock GitHub API, RS256 | App JWT signing, branch guards, PR markdown generation, webhook HMAC |
| **Execution Sandboxing**| `backend/tests/integration/test_m4_execution.py`| `LocalSandboxRunner`, tempdir | Workspace directory isolation, command timeouts, test result parsing |
| **User Interfaces** | `backend/tests/integration/test_m5_interfaces.py` | `TelegramService`, client | Telegram command parsing, markdown escaping, emergency stop lockdown |
| **Security Boundaries**| `backend/tests/security/test_security_boundaries.py` | `SandboxedFilesystem`, `CommandPolicy` | Directory traversal (`..`), banned shell characters (`\|`, `;`), path escapes |
| **Memory & Recovery** | `backend/tests/security/test_m6_security.py` | `MemoryService`, Fernet | Secret leakage detection, Fernet backup encryption & SHA-256 validation |
| **Self-Improvement** | `backend/tests/integration/test_m7_self_improvement.py`| `SelfImprovementService` | Codebase health score, protected file mutation rejection (`SECURITY_POLICY.md`) |

