# Project Jarvis — Security Policy

**Document Version:** 1.0  
**Verification Date:** 2026-11-13  
**Status:** Mandatory Operational Baseline

---

## 1. Core Security Mandates

1. **Principle of Least Privilege:** Every component, service, API token, and worker is granted only the absolute minimum set of capabilities required to complete its immediate task.
2. **Deterministic Gating:** The AI model is treated as an untrusted proposal engine. All privileged operations (filesystem mutation, git pushes, network connections) must be verified and authorized by deterministic Python code outside the model's control.
3. **No Direct Production Access:** Jarvis has zero access to production deployment pipelines, live cloud servers, production databases, or billing cards.
4. **Mandatory Human-in-the-Loop:** High-consequence actions (spending, external communication, PR merging, deletion, credential alteration) require explicit, authenticated human approval.
5. **No Self-Modification of Security Controls:** The autonomous agent can never modify its own security policies, permission matrices, approval workflows, or authentication middleware.

---

## 2. Secrets Management & Protection

### Secret Storage

- Master secrets are passed exclusively via system environment variables (`SECRET_KEY`, `MASTER_ENCRYPTION_KEY`).
- Integration secrets stored in the database (GitHub App private key, Telegram bot token) are encrypted at rest using Fernet (AES-128-CBC with HMAC-SHA256 authenticated encryption) via `cryptography.fernet`.
- No plaintext credentials, private keys, or passwords may exist in repository code, commit history, or documentation.

### Ephemeral Token Lifetimes

- **GitHub App Installation Tokens:** Maximum 60 minutes, repository-scoped.
- **Dashboard JWT Session Tokens:** Maximum 24 hours, stored in secure `HttpOnly`, `SameSite=Strict` cookies.
- **Approval Tokens:** Maximum 30 minutes, single-use, invalidated on parameter mismatch.

### Secret Redaction Policy

All output streams (Uvicorn logs, task execution logs, model prompts, and Telegram messages) pass through an active redaction filter matching:

- GitHub App / PAT tokens: `gh[pousr]_[A-Za-z0-9_]{36,255}`
- JWT tokens: `ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`
- Google Gemini API Keys: `AIza[0-9A-Za-z-_]{35}`
- Generic API Keys / Secrets: Standard high-entropy strings and hex keys.

---

## 3. Worker Sandbox Security Standard

When running tasks in local or containerized environments:

- **Execution User:** Non-root (`UID: 1000`, `GID: 1000`).
- **Linux Capabilities:** All dropped (`--cap-drop=ALL`).
- **Privilege Escalation:** Disabled (`--security-opt=no-new-privileges:true`).
- **Filesystem:** Read-only root filesystem (`--read-only`), ephemeral writable workspace on tmpfs.
- **Resource Limits:** Max 2 GB RAM, max 1.5 CPU cores, max 100 PIDs.
- **Two-Phase Network Egress Isolation:**
  - *Phase 1 (Hydration):* Egress restricted strictly to vetted package registries (`pypi.org`, `registry.npmjs.org`) via local caching proxy for dependency installation.
  - *Phase 2 (Execution & Test):* Network egress completely disabled (`--network=none`).
- **Host Mounts:** STRICTLY FORBIDDEN. Never mount host paths or the Docker socket (`/var/run/docker.sock`).

---

## 4. Emergency Kill-Switch & Revocation Protocol

In the event of anomalous behavior, runaway loops, or a suspected security incident:

1. **Dashboard Emergency Stop:** A prominent "EMERGENCY SHUTDOWN" button on the dashboard immediately transitions the system to `LOCKED` state.
2. **Telegram Stop Command:** Sending `/emergency_stop` or `/kill` from the authorized Telegram ID triggers immediate shutdown.
3. **Execution Effects:**
   - Active background execution jobs are terminated (`SIGKILL`).
   - GitHub installation tokens are invalidated via GitHub API.
   - Pending approvals are cancelled.
   - New task intake is blocked.
   - All AI gateway calls are rejected.

---

## 5. Security Incident Reporting & Auditing

- All security-relevant events are persisted to the append-only `audit_events` database table.
- Any unauthorized access attempt (unlisted Telegram ID, failed login attempt, tampered approval) triggers an immediate high-priority alert to the owner via Telegram.

---

## 6. Policy Sign-off

- **DevSecOps Engineer:** Approved
- **Status:** Active
- **Date:** 2026-11-13
