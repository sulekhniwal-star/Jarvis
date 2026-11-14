# Project Jarvis — Security Documentation Review

**Audit Identifier:** `AUDIT-2026-11-14-DOC`  
**Audit Date:** 2026-11-14  
**Operating Role:** Independent Application Security & DevSecOps Audit Board  
**Target Documents:** `SECURITY_POLICY.md`, `THREAT_MODEL.md`, `PERMISSIONS.md`, `APPROVAL_WORKFLOW.md`, `TECH_STACK.md`, `SYSTEM_ARCHITECTURE.md`

---

## 1. Executive Security Evaluation

The documented security architecture of Project Jarvis is conceptually advanced and exhibits a sophisticated understanding of AI agent security risks. 

Jarvis's foundational security premise — **that the AI model is an untrusted probabilistic proposal engine that must never possess direct execution authority** — aligns directly with the highest standards of the NIST AI Risk Management Framework (AI RMF 1.0) and OWASP Top 10 for LLM Applications.

### Security Highlights:
1. **Deterministic Capability Gating (ADR-003):** Prevents prompt injections from triggering unauthorized actions by enforcing deterministic Python policy checks on all tool requests.
2. **Cryptographic Payload Binding (`APPROVAL_WORKFLOW.md`):** Approval tokens are bound to a canonical JSON SHA-256 hash of the exact parameters, preventing parameter alteration or replay attacks.
3. **Hardened Worker Sandboxing (`SECURITY_POLICY.md` §3):** Local Docker execution specifies `--cap-drop=ALL`, `--user 1000:1000`, `--read-only` rootfs, and `--security-opt=no-new-privileges:true`.
4. **Least-Privilege GitHub App Integration (ADR-006):** Eliminates account-wide Personal Access Tokens (PATs) in favor of ephemeral, repository-scoped 60-minute installation tokens (`ghs_...`).
5. **Circuit-Breaker Cost Control (`COST_CONTROL.md`):** Network-level interception prevents unauthorized financial spending on paid model APIs.

---

## 2. Threat Model Analysis (STRIDE & OWASP LLM Evaluation)

The audit board evaluated `THREAT_MODEL.md` against modern threat vectors in autonomous software development:

### 2.1 STRIDE Threat Coverage

| STRIDE Category | Documented Threat Scenario | Documented Countermeasure | Security Audit Evaluation |
|:---|:---|:---|:---|
| **Spoofing** | Unauthorized user sends Telegram commands posing as owner. | Static `TELEGRAM_AUTHORIZED_USER_ID` allowlist middleware; unlisted IDs silently dropped. | **Sound:** Simple, deterministic, and effective for a single-owner system. |
| **Spoofing** | Attacker delivers forged GitHub webhook payloads to API. | Constant-time HMAC-SHA256 signature verification (`X-Hub-Signature-256`). | **Sound:** Industry standard. Must enforce replay protection via timestamp validation. |
| **Tampering** | AI model attempts to alter security policies or its own permissions. | Read-only filesystem mounts, restricted directory paths, and immutable policy enforcement outside agent context. | **Sound:** Agent cannot access files outside its workspace or edit control-plane code. |
| **Tampering** | Attacker alters parameters of an existing approval request. | Server binds approval to canonical JSON SHA-256 hash (`payload_hash`). Parameter changes void the token. | **Robust:** Cryptographically prevents parameter tampering and privilege escalation. |
| **Repudiation** | Action executed without accountability or audit trail. | Append-only `audit_events` table capturing actor, action, target, IP, and outcome. | **Adequate:** Should implement sequential hash-chaining to detect database-level record tampering. |
| **Information Disclosure**| API keys or tokens leaked in test logs, agent thoughts, or git diffs. | Regex-based log redactor scrubs GitHub tokens, JWTs, and API keys before logging or display. | **Adequate:** Must supplement regex with pre-commit AST / entropy-based secret scanning (`gitleaks`). |
| **Information Disclosure**| Free-tier model provider uses private repository code for model training. | System blocks transmission of private repo contents to free-tier endpoints without explicit consent. | **Crucial:** Protects proprietary code from public model training datasets. |
| **Denial of Service** | Model enters infinite planning or test loop, exhausting compute/tokens. | Hard iteration limits (max 3 retries), 10-minute worker timeouts, and token quotas. | **Sound:** Deterministic bounds prevent resource exhaustion. |
| **Elevation of Privilege**| Indirect prompt injection in repository instructs agent to delete database. | Model has zero direct tool authority. Deterministic policy layer rejects destructive actions. | **Robust:** Core architectural defense against excessive agent agency. |
| **Elevation of Privilege**| Worker container breaks out into host Windows 11 filesystem. | Ephemeral GitHub Actions cloud VMs; local containers run non-root with `--cap-drop=ALL` and no host mounts. | **Sound:** Strong defense-in-depth against container escapes. |

### 2.2 OWASP Top 10 for Large Language Model Applications (2025/2026 Audit)

1. **LLM01: Prompt Injection (Direct & Indirect):**  
   - *Status:* **Effectively Mitigated.** External repository files (source code, markdown, issues, git logs) are treated as *inert data blocks* wrapped in structural delimiters, never concatenated into system instruction prompts. Tool calls are strictly validated by deterministic Python logic.
2. **LLM02: Sensitive Information Disclosure:**  
   - *Status:* **Partially Mitigated.** While regex redaction is specified for logs, the documentation lacks a pre-push diff secret scanner (such as Gitleaks or Trufflehog) to verify that generated git commits do not contain newly introduced secrets.
3. **LLM06: Excessive Agency:**  
   - *Status:* **Effectively Mitigated.** The agent cannot push directly to `main`/`master` branches, cannot merge pull requests, cannot activate paid services, and cannot approve its own action requests. Human-in-the-loop authorization is physically enforced.
4. **LLM08: Vector and Embedding Weaknesses / Memory Poisoning:**  
   - *Status:* **Mitigated.** Memory records are strictly partitioned by `project_id`. Shared memory elevation requires human confirmation, and credentials are regex-filtered before memory persistence.

---

## 3. Cryptographic Precision & Secrets Management

### 3.1 The Fernet Cryptographic Algorithm Correction
Across `TECH_STACK.md`, `SECURITY_POLICY.md`, `CHANGELOG.md`, and `TASK_BOARD.md`, the documentation repeatedly asserts:
> *"Fernet (AES-256-GCM) authenticated encryption"* or *"AES-256 Fernet encryption"*.

**Cryptographic Analysis:**
- In official specifications, `cryptography.fernet` uses:
  - **AES-128 in CBC mode** with PKCS7 padding.
  - **HMAC using SHA-256** for message authentication.
  - Initialization vectors (IVs) generated via `os.urandom()`.
- Fernet **does not use AES-256**, nor does it use **Galois/Counter Mode (GCM)**.
- *Security Verdict:* Fernet's 128-bit CBC + HMAC-SHA256 provides excellent security for database field encryption and backup snapshots. However, claiming it is "AES-256-GCM" is a technical error that undermines documentation credibility.
- *Remediation:* Update all documents to state "Fernet (AES-128-CBC with HMAC-SHA256 authenticated encryption)".

### 3.2 Secret Broker & Token Lifetimes
The documented secret lifecycle follows strict least-privilege standards:
- **Master Encryption Key:** Sourced exclusively from system environment variables (`MASTER_ENCRYPTION_KEY`). Never persisted in databases.
- **GitHub App Private Key:** 2048-bit RSA key encrypted at rest in the database using the master key.
- **GitHub Installation Tokens:** Ephemeral (`ghs_...`), 60-minute hard expiry, scoped strictly to the target repository.
- **Session Tokens:** Signed JWTs, 24-hour expiration, stored exclusively in `HttpOnly`, `SameSite=Strict` cookies (blocking XSS exfiltration).

---

## 4. Worker Isolation & Command Execution Policy

### 4.1 Command Allowlist Engine
`SECURITY_POLICY.md` and `CODING_AGENT_SPEC.md` mandate strict command allowlisting:
- **Vetted Utilities:** `pytest`, `python`, `git`, `npm`, `ruff`.
- **Strictly Blocked Utilities:** `curl`, `wget`, `nc`, `rm`, `chmod`, `chown`, `sudo`, `dd`.
- **Shell Meta-character Blocking:** Rejects command chaining characters (`;`, `&&`, `|`, `>`, `$()`, `` ` ``).

### 4.2 Network Isolation Dilemma
`SECURITY_POLICY.md` §3 specifies `--network=none` for test execution. 
- *Vulnerability / Flaw:* If a test suite requires external package dependencies (`pip install`, `npm install`) that were not pre-cached in the runner image, `--network=none` causes immediate build failures.
- *Recommendation:* Document a formal two-phase execution lifecycle:
  1. **Phase A (Environment Hydration):** Network egress allowed strictly to vetted package registries (`pypi.org`, `registry.npmjs.org`) via an outbound HTTP proxy.
  2. **Phase B (Code Modification & Test Execution):** Network completely disabled (`--network=none`).

---

## 5. Emergency Kill-Switch & Incident Response

`SECURITY_POLICY.md` §4 defines a multi-surface emergency shutdown protocol:
1. **Trigger Mechanisms:**
   - Web Dashboard: Prominent "EMERGENCY SHUTDOWN" button.
   - Telegram Bot: Command `/emergency_stop` or `/kill` from authorized ID.
   - REST API: `POST /api/v1/system/emergency-stop`.
2. **Deterministic Shutdown Effects:**
   - Active worker subprocesses and container instances terminated (`SIGKILL`).
   - GitHub installation access tokens immediately revoked via GitHub API.
   - All pending approval requests marked `CANCELLED`.
   - New task intake transitioned to `LOCKED` status.
   - AI gateway calls hard-rejected at networking layer.
3. **Resumption:**
   - Re-enabling the system requires authenticated human action (`POST /api/v1/system/resume`) with explicit confirmation.

---

## 6. Security Recommendations & Action Items

1. **Correct Fernet Algorithm References (`DOC-005`):** Remove references to "AES-256-GCM" for Fernet across all documentation.
2. **Add Pre-Commit Secret Scanning:** Specify an automated pre-commit secret detection stage (using regex/entropy scanners) in `CODING_AGENT_SPEC.md` prior to opening Pull Requests.
3. **Specify Two-Phase Network Isolation:** Update worker deployment and security policy documents to define the transition between Phase A (package installation) and Phase B (isolated `--network=none` testing).
4. **Implement Cryptographic Audit Chaining:** Update `DATABASE_SCHEMA.md` to include a SHA-256 hash-chaining column (`prev_event_hash`) in `audit_events`.
