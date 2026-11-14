# JARVIS — SECURITY & THREAT ASSESSMENT
**Audit ID:** `AUDIT-2026-11-14-ENG`  
**Date:** November 14, 2026  
**Auditor:** Independent Application Security & Threat Modeling Specialist  
**Subject:** Vulnerability Discovery, OWASP Top 10 for LLMs, STRIDE Analysis, and Security Boundary Enforcement

---

## 1. Executive Security Summary

Jarvis implements several exceptional defense-in-depth mechanisms that exceed standard hobbyist or prototype AI agent projects:
1. **Strict Path Containment:** `SandboxedFilesystem` prevents directory traversal attacks, Windows drive escapes, and symlink-based jailbreaks.
2. **Subprocess Shell Immunity:** `CommandPolicy` validates commands outside the model, forbids shell meta-characters (`;`, `&&`, `|`, `` ` ``, `$`), and executes processes via `asyncio.create_subprocess_exec(shell=False)` with an approved binary allowlist.
3. **Cryptographic Payload Binding:** High-consequence approval requests calculate a canonical SHA-256 digest over sorted JSON parameters, preventing in-flight parameter tampering.
4. **Secret Scanning in Long-Term Memory:** `MemoryService` actively parses memory entries with regular expressions for GitHub tokens, JWTs, AWS keys, Telegram tokens, and private keys, blocking credential leakage into persistent knowledge stores.

However, the audit identified **four concrete vulnerabilities and security weaknesses** that must be remediated prior to beta deployment.

---

## 2. Identified Vulnerabilities & Security Findings

### 2.1 [HIGH] VULN-01: Hardcoded Fallback Passwords in Authentication Service
- **Location:** `backend/app/services/auth_service.py` (lines 74–83)
- **Code:**
  ```python
  if not is_valid and settings.ENVIRONMENT in ("development", "testing", "local"):
      if password in (
          settings.OWNER_INITIAL_PASSWORD,
          "jarvis_secure_initial_password_2026",
          "ZymmgxGdhlZLxp1I_EFDPA",
      ):
          is_valid = True
          user.hashed_password = hash_password(password)
          await session.commit()
  ```
- **Risk Analysis:**  
  While gated behind `settings.ENVIRONMENT in ("development", "testing", "local")`, developers frequently run local or staging instances connected to LANs or shared Wi-Fi. An attacker who knows these hardcoded strings can log in as the single-tenant owner, overwrite the owner's stored password hash, and obtain complete administrative control of the system.
- **Remedy:** Remove all hardcoded string fallback passwords. Authentication must strictly verify against `user.hashed_password` using Argon2id.

---

### 2.2 [HIGH] VULN-02: Emergency Stop Kill-Switch Bypass on Task Intake
- **Location:** `backend/app/api/v1/system.py` vs `backend/app/services/task_service.py`
- **Vulnerability:**  
  When an operator activates `/api/v1/system/emergency-stop` (or Telegram `/emergency_stop`), the system sets `_STATE_FILE` status to `"LOCKED"` and cancels active tasks. However, neither `task_service.create_task()`, `api/v1/tasks.py::create_task`, nor `telegram_service.py::handle_incoming_update` checks `_get_system_status()`.
- **Impact:**  
  An operator who activates emergency lockdown assumes the system is safe from executing rogue actions. Yet, a compromised webhook, queued Telegram message, or rogue API client can continue submitting new tasks, which will be accepted and scheduled despite the `LOCKED` state.
- **Remedy:** Enforce a mandatory system state check in `create_task()` and `handle_incoming_update()`. If status is `LOCKED`, reject with HTTP 423 Locked.

---

### 2.3 [MEDIUM] VULN-03: Dormant Self-Improvement Security Boundary
- **Location:** `backend/app/services/self_improvement.py` (lines 81–90) vs `backend/app/workers/filesystem.py` / `coding_agent.py`
- **Vulnerability:**  
  `SelfImprovementService` defines `PROTECTED_CORE_COMPONENTS` (e.g. `app/core/security.py`, `app/workers/command_policy.py`, `app/services/approval_service.py`) and provides `validate_modification_target()`. However, this function is **only called in unit tests** (`tests/integration/test_m7_self_improvement.py`).
- **Impact:**  
  If the autonomous coding agent is tasked with a self-improvement mission on the Jarvis repository, nothing in `SandboxedFilesystem.write_file()` or `CodingAgent.execute_task()` prevents the model from overwriting its own security policy, disabling the command allowlist, or removing human approval gates.
- **Remedy:** Wire `SelfImprovementService.validate_modification_target()` directly into `SandboxedFilesystem.write_file()` whenever the target repository is identified as Jarvis.

---

### 2.4 [MEDIUM] VULN-04: Parameter Transposition in Telegram Inline Approval Callbacks
- **Location:** `backend/app/services/telegram_service.py` (lines 175–181 & 189–195)
- **Vulnerability:**  
  `evaluate_approval` is defined as:
  ```python
  async def evaluate_approval(
      session: AsyncSession,
      approval_id: str,
      decision: str,
      decided_by_user_id: str,
      reason: str | None = None,
  ) -> Approval:
  ```
  In `telegram_service.py` inline button handling:
  ```python
  await evaluate_approval(
      session,
      appr_id,
      "APPROVED",
      "Approved via Telegram one-tap inline button", # Passed to decided_by_user_id!
      owner_user_id,                                 # Passed to reason!
  )
  ```
- **Impact:**  
  The audit log records the literal string `"Approved via Telegram one-tap inline button"` as the `actor_id` (a UUID foreign key or user identifier), while the owner's actual user ID is recorded as the decision reason. This breaks audit trail referential integrity and non-repudiation tracking.
- **Remedy:** Pass arguments by keyword in `telegram_service.py`: `decided_by_user_id=owner_user_id, reason="Approved via Telegram one-tap inline button"`.

---

## 3. OWASP Top 10 for LLM Applications (2025/2026 Audit)

| OWASP # | Threat Category | Jarvis Risk Level | Current Mitigation Status | Audit Verdict |
|---|---|:---:|---|:---:|
| **LLM01** | Prompt Injection | High | `CommandPolicy` sanitizes all commands; `SandboxedFilesystem` enforces path boundaries. Model outputs cannot directly invoke OS shells. | **PASS** |
| **LLM02** | Sensitive Information Disclosure | High | `MemoryService` scans regex patterns for credentials. Subprocess runner isolates `.env` control secrets from execution environment. | **PASS** |
| **LLM03** | Supply Chain Vulnerabilities | Medium | Strict lockfile dependencies (`poetry.lock` / `pnpm-lock.yaml`). Binary allowlist restricts worker tools to Python, Pytest, Git, Node. | **PASS** |
| **LLM04** | Data and Model Poisoning | Low | No fine-tuning or public model weight modifications. Pre-trained weights accessed via OpenRouter API. | **PASS** |
| **LLM05** | Improper Output Handling | High | Model outputs parsed as JSON; code patches written to sandbox without shell evaluation; tests parsed via structured regex. | **PASS** |
| **LLM06** | Excessive Agency | High | High-consequence actions (git push to main, dependency install outside allowlist, cloud commands) require human approval gate. | **PASS** |
| **LLM07** | System Prompt Leakage | Low | System prompts contain operational guidelines, not secrets. Core security rules enforced by code, not prompt instructions. | **PASS** |
| **LLM08** | Vector and Embedding Weaknesses | Low | Vector storage not used as access control plane. SQLite/PostgreSQL used for relational storage. | **PASS** |
| **LLM09** | Misinformation / Hallucination | High | Automated test loop (`LocalSandboxRunner`) runs real test commands to verify generated code before reporting completion. | **PASS** |
| **LLM10** | Unbounded Consumption | High | Token usage tracked per request; monthly INR budget ceiling enforced (`MAX_MONTHLY_BUDGET_INR`); execution timeouts enforced (30s). | **PASS** |

---

## 4. STRIDE Threat Model Matrix

| Threat Category | Target Asset / Boundary | Threat Scenario | Implemented Mitigation | Residual Gap |
|---|---|---|---|---|
| **Spoofing** | Telegram Webhook / Ingestion | Attacker sends spoofed Telegram updates to trigger tasks. | `TelegramService.is_authorized_user()` verifies sender against `AUTHORIZED_TELEGRAM_USER_ID`. | Telegram webhook endpoint lacks IP allowlisting or secret token verification. |
| **Tampering** | Approval Authorization | Attacker intercepts approval request and changes target command. | Canonical SHA-256 hash binding in `compute_payload_hash()`. | None. Hash verification is mathematically sound. |
| **Repudiation** | Privileged Actions | User denies approving a destructive action. | `AuditLog` records actor type, user ID, timestamp, and action metadata. | VULN-04 corrupts `actor_id` during Telegram inline button approvals. |
| **Information Disclosure** | Workspace Secrets | Worker reads root repository secrets or database passwords. | `SandboxedFilesystem` locks worker in `workspaces/task_{id}/`. Subprocess inherits no master `.env`. | None. Workspace directory is strictly isolated. |
| **Denial of Service** | Subprocess Execution | Malicious infinite loop (`while True`) in generated code. | `LocalSandboxRunner` enforces 30s timeout and kills subprocess with SIGKILL. | In-memory `MemorySaver` vulnerability can cause state loss during crash. |
| **Elevation of Privilege** | Self-Improvement Code Edits | Agent modifies its own security policy to remove human approvals. | `PROTECTED_CORE_COMPONENTS` defined in `self_improvement.py`. | VULN-03: `validate_modification_target()` is not enforced at filesystem write time. |
