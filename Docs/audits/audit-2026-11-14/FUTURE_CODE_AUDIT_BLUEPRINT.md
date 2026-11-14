# Project Jarvis — Future Code Audit Blueprint & Evaluation Protocol

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Document Purpose:** Authoritative Evaluation Protocol for Future Phase B Source-Code Audit  
**Operating Role:** Independent Principal Technical Documentation Audit Board  
**Status:** Mandatory Governance Baseline  
**Governing Rule:** No application source code has been inspected or verified during this documentation audit phase. All implementation claims in documentation are classified as `NOT VERIFIED — SOURCE-CODE AUDIT PENDING`.

---

## 1. Objective and Authority

This blueprint serves as the definitive, immutable bridge between the **Phase A Documentation Audit** and the forthcoming **Phase B Source-Code Audit**. 

When the project owner authorizes Phase B, the code audit team must evaluate the repository's codebase (`backend/`, `frontend/`, `workers/`, `scripts/`, `.github/`) strictly against this blueprint and the finalized, approved documentation baseline.

The code audit must **never rely on undocumented developer intentions** or unapproved assumptions. The finalized documentation in `docs/` is the sole source of truth.

---

## 2. Authoritative Baseline Documents

The future code audit must assess compliance against the following 10 primary authoritative documents:

1. **`docs/PRD.md`:** Functional and Non-Functional Requirements baseline (FR-01 to FR-18).
2. **`docs/SYSTEM_ARCHITECTURE.md`:** Bifurcated Enclave Architecture, trust zones, and 11-state state machine.
3. **`docs/TECH_STACK.md`:** Approved libraries, frameworks, versions, and security controls.
4. **`docs/DATABASE_SCHEMA.md`:** Approved relational models, columns, constraints, and migrations.
5. **`docs/API_SPECIFICATION.md`:** Approved REST API endpoints, request/response schemas, and error conventions.
6. **`docs/CODING_AGENT_SPEC.md`:** Autonomous coding execution lifecycle and worker tool policies.
7. **`docs/SECURITY_POLICY.md`:** Mandatory security mandates, secret redaction, and token lifecycles.
8. **`docs/PERMISSIONS.md`:** Role-based capability matrix and least-privilege boundaries.
9. **`docs/APPROVAL_WORKFLOW.md`:** Canonical JSON SHA-256 payload hashing and non-self-approval enforcement.
10. **`docs/MVP_ACCEPTANCE_CHECKLIST.md`:** Definitive 35-item acceptance criteria.

---

## 3. Register of Implementation Claims Requiring Independent Verification

The documentation contains extensive statements asserting that features, services, and tests exist and are functioning. The Phase B code audit must treat each of the following claims as **unverified** until demonstrated with concrete source-code evidence and reproducible command executions:

| Claimed Feature / Milestone | Document Source | Documented Claim | Required Source-Code Verification in Phase B |
|:---|:---|:---|:---|
| **43 Passing Automated Tests** | `CHANGELOG.md`, `TASK_BOARD.md` | "All 43 automated tests passing across Milestones 1 through 7 with zero regressions in 17.75s." | Execute pytest in an isolated environment; inspect test definitions; verify that tests contain real assertions and are not mock stubs. |
| **Bifurcated Enclave Isolation** | `SYSTEM_ARCHITECTURE.md`, `SECURITY_POLICY.md` | Control plane never executes untrusted code; execution worker has zero database credentials. | Inspect process spawning in `workers/runner.py`; verify environment variables passed to worker; check for database credentials. |
| **Deterministic Approval Engine** | `APPROVAL_WORKFLOW.md`, `SYSTEM_ARCHITECTURE.md` | Approvals bound to canonical JSON SHA-256 hash; agent cannot self-approve. | Inspect `services/approval_service.py` and `api/v1/approvals.py`; test parameter tampering; verify worker token is rejected on approve endpoint. |
| **Argon2id & JWT Cookie Auth** | `TECH_STACK.md`, `SECURITY_POLICY.md` | Passwords hashed with Argon2id; session stored in HttpOnly, SameSite=Strict cookies. | Inspect `core/security.py` and `api/v1/auth.py`; verify password hashing algorithm parameters; inspect cookie headers in response. |
| **LangGraph Checkpoint Persistence** | `SYSTEM_ARCHITECTURE.md`, ADR-008 | Workflows survive server restart; state rehydrates from PostgreSQL using `thread_id`. | Simulate coordinator crash mid-task; verify task resumes from exact node checkpoint without duplicating completed steps. |
| **Command Allowlist & Tokenizer** | `CODING_AGENT_SPEC.md`, `CHANGELOG.md` | Blocks shell chaining (`&&`, `;`, `\|`) and disallowed binaries (`curl`, `wget`, `nc`). | Inspect `workers/command_policy.py`; execute malicious chained commands; verify parser rejects them deterministically. |
| **Sandboxed Filesystem** | `SECURITY_POLICY.md`, `CHANGELOG.md` | Blocks path traversal (`../`) and symlink escapes outside the task workspace directory. | Inspect `workers/filesystem.py`; attempt to read/write `../../etc/passwd` or parent directories; verify exception raised. |
| **GitHub App RS256 Auth & Guard** | `TECH_STACK.md`, `CHANGELOG.md` | Generates short-lived installation tokens (`ghs_...`); blocks direct pushes to `main`/`master`. | Inspect `services/github_app_auth.py` and `services/github_service.py`; attempt branch push to `main`; verify guard rejects. |
| **Paid-Call Circuit Breaker** | `COST_CONTROL.md`, ADR-005 | Outbound paid model calls are hard-blocked unless explicit approval grant exists. | Attempt model call with `AI_PAID_CALLS_ENABLED=False`; verify network request is not emitted and `SpendingBlockedException` is raised. |
| **Telegram Single-User Allowlist** | `TECH_STACK.md`, `SECURITY_POLICY.md` | Drops messages from any Telegram user ID not matching authorized ID. | Inspect `services/telegram_service.py`; simulate message from unauthorized ID; verify silent drop and audit log entry. |
| **Secret Redaction Filter** | `SECURITY_POLICY.md`, `TECH_STACK.md` | Scrubs API keys, JWTs, and GitHub tokens from logs and notifications. | Inspect Structlog processor or logging middleware; log dummy tokens; verify `[REDACTED]` replacement in log stream. |
| **Encrypted Backup & Restore** | `BACKUP_AND_RECOVERY.md`, `CHANGELOG.md` | Automated script encrypts database snapshot with Fernet and restores with SHA-256 integrity check. | Execute `scripts/backup_db.py` and `scripts/restore_db.py`; verify snapshot is encrypted and restore succeeds in clean DB. |
| **Protected Core Guard** | `SELF_IMPROVEMENT.md`, `CHANGELOG.md` | Agent cannot modify core security files (`security.py`, `system.py`, `command_policy.py`, `approval_service.py`). | Inspect `services/self_improvement.py`; target a protected file for automated edit; verify `ProtectedComponentViolation`. |
| **Emergency Kill-Switch** | `SECURITY_POLICY.md`, `CHANGELOG.md` | Stops running workers, cancels approvals, revokes installation tokens, and blocks new task intake. | Trigger `/api/v1/system/emergency-stop`; verify executing worker receives `SIGKILL` and GitHub token is revoked. |

---

## 4. Phase B Code Audit Step-by-Step Procedure

The future code audit must execute in 6 sequential stages:

```
[Stage 1: Environment & Dependency Audit]
   |--> Verify Python 3.12, Node.js 20+, poetry/pip dependencies against TECH_STACK.md
   |--> Run automated vulnerability scan (`safety check`, `npm audit`)
   v
[Stage 2: Static Code & Architecture Analysis]
   |--> Inspect directory structure (`backend/`, `frontend/`, `workers/`, `scripts/`)
   |--> Verify Pydantic schemas, SQLAlchemy models, and Alembic migrations
   |--> Validate Bifurcated Enclave boundary: ensure zero DB access in workers
   v
[Stage 3: Automated Test Suite Execution]
   |--> Execute test suite via `pytest -v --cov`
   |--> Verify test pass rate, code coverage, and execution duration
   |--> Inspect test fixtures to ensure assertions are meaningful and not mocked out
   v
[Stage 4: Security & Penetration Testing]
   |--> Execute path traversal injection against `SandboxedFilesystem`
   |--> Execute command chaining injection against `CommandPolicy`
   |--> Attempt unauthorized approval execution and self-approval
   |--> Test Telegram allowlist with unauthorized `from.id`
   v
[Stage 5: Autonomous Coding E2E Verification]
   |--> Execute full end-to-end task against synthetic demo repository
   |--> Verify: intake -> plan -> worker checkout -> edit -> test -> PR
   |--> Inspect generated git commit, branch protection, and PR evidence badge
   v
[Stage 6: Final Baseline Reconciliation & Audit Report]
   |--> Compare code audit findings against documentation baseline
   |--> Generate Phase B Source-Code Audit Report with definitive PASS/FAIL verdict
```

---

## 5. Evidence Standards for Code Audit Findings

Every finding reported in the Phase B code audit must provide verifiable evidence conforming to the following standards:

1. **File and Line Citations:** Every audited module must be cited with an exact relative path and line numbers (e.g. `backend/app/services/approval_service.py#L45-L78`).
2. **Raw Terminal Output:** Test executions, linter outputs, and command failures must include raw stdout/stderr logs and process exit codes.
3. **Reproducibility:** Any reported defect or security bypass must include a minimal, reproducible test case or curl command.
4. **No Assumptions:** If a module is absent or incomplete, it must be reported as a missing specification violation, not assumed to be in-progress.

---

## 6. Sign-off and Handover

- **Audit Board Lead:** Independent Principal Technical Documentation Auditor
- **Phase A Conclusion:** Documentation Blueprint Completed & Frozen
- **Directive:** Await explicit owner approval of documentation change proposals (`DOC-001` to `DOC-020`) before initiating Phase B.
