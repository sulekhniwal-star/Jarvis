# Phase 36 Research: System-Wide Security Audit, Penetration Testing & Failsafe Gating

## Executive Summary
Phase 36 focuses on hardening the platform against all attack vectors and establishing automated penetration testing suites covering Row-Level Security (RLS) enforcement, timing-safe cryptographic verification, sandbox path traversal defenses, secret scanning barriers, and financial circuit breakers (`REQ-SEC-03`, `NFR-SEC-05`).

---

## 1. Threat Modeling & Attack Surface Analysis

### 1.1 Row-Level Security (RLS) & Tenant Isolation
- **Threat Vector:** Malicious or compromised client attempting to read, update, or delete rows belonging to other users or organizations across Supabase tables (`projects`, `tasks`, `agent_runs`, `approvals`, `cost_records`, `memories`, `audit_events`).
- **Mitigation Architecture:**
  - 14 database tables configured with `ENABLE ROW LEVEL SECURITY`.
  - Strict `auth.uid() = user_id` or explicit foreign key existence checks (`EXISTS (SELECT 1 FROM projects WHERE projects.id = ... AND projects.user_id = auth.uid())`).
  - Read-only audit ledger where normal clients can only `SELECT` and `INSERT` with hash chaining, with zero `UPDATE` or `DELETE` permissions granted.

### 1.2 Cryptographic Verification & Side-Channel Timing Attacks
- **Threat Vector:** Side-channel timing attacks on webhook secrets and HMAC approval tokens allowing an adversary to iteratively deduce valid HMAC signatures byte-by-byte.
- **Current Findings:**
  - `src/lib/approvals/approval-token.ts`: Correctly uses `crypto.timingSafeEqual` with length check.
  - `src/lib/github/webhook.ts`: Correctly uses `crypto.timingSafeEqual`.
  - `src/lib/telegram/guard.ts`: `verifyWebhookSecret` uses loose string equality (`===`).
- **Required Action:**
  - Refactor `src/lib/telegram/guard.ts` to use constant-time `crypto.timingSafeEqual` with fixed-size or SHA-256 buffer normalization.

### 1.3 Directory Traversal & Sandbox Escape
- **Threat Vector:** Malicious prompt or compromised agent generating diffs or file mutations referencing paths outside the authorized workspace (e.g. `../../etc/shadow`, `..\..\Windows\System32`, `C:/secrets.env`).
- **Current Findings:**
  - `boundary-validator.ts` checks file extensions (`.env`, `.pem`, `.key`, `.cert`), but does not explicitly reject directory traversal tokens (`..`, absolute paths, leading slashes).
- **Required Action:**
  - Add explicit traversal detection in `boundary-validator.ts`:
    - Detect `..` path segments.
    - Detect absolute paths (`/` root or `[A-Za-z]:` drive roots).
    - Flag with `PATH_TRAVERSAL_DETECTED` blocker violation.

### 1.4 Secret Leakage & Credential Exposure
- **Threat Vector:** Credentials, private keys, or API tokens committed to the repository or included in agent diffs.
- **Mitigation Architecture:**
  - `SecretScanner` with Shannon entropy analysis and regex pattern matching across 14 credential families (OpenAI, Stripe, GitHub, AWS, DB URIs, etc.).
  - Automatic pre-commit hook execution blocking non-compliant commits.
  - Push gate validator running secret inspection before allowing `origin/main` push approvals.

### 1.5 Financial Circuit Breaker & Spend Tampering
- **Threat Vector:** Unauthorized API consumption exhausting daily (₹25) or monthly (₹750) spending limits, or client-side tampering of cost records.
- **Mitigation Architecture:**
  - `InferenceCircuitBreaker` enforces strict pre-inference quota checks.
  - Failsafe circuit breaking: if database is unreachable, paid models default to locked (`FailsafeCircuitBreakerError`).
  - Emergency reserve can only be unlocked through explicit authenticated API/Telegram action.

---

## 2. Plan Architecture for Phase 36

### Plan 36.1: Cryptographic Timing-Safety, Boundary Hardening & Security Audit Suite
- Refactor `src/lib/telegram/guard.ts` for timing-safe secret verification.
- Harden `src/lib/agents/engine/verification/diff-inspector/boundary-validator.ts` against directory traversal and root escape attacks.
- Create `src/lib/security/audit-suite.ts` (`SecurityAuditSuite`) to execute programmatic verification of security controls.
- Unit test suite: `tests/unit/security/crypto-and-boundaries.test.ts`.

### Plan 36.2: Comprehensive Penetration Testing Suite, Secret Scanner Fuzzing & Security Report
- Create `tests/integration/security-penetration.test.ts`:
  - RLS cross-tenant isolation and unauthorized mutation tests.
  - Timing attack simulation on HMAC tokens and webhook headers.
  - Sandbox path traversal injection attacks.
  - Secret scanner fuzzing across 14 secret types + high entropy tokens.
  - Circuit breaker budget lock bypass attempts.
  - Kill-switch concurrency stress tests.
- Generate `SECURITY-AUDIT.md` verifying 0 high/critical vulnerabilities.
