# Phase 21 Research: Pre-Commit Entropy & Secret Scanner

## 1. Domain Overview & Problem Statement

Phase 21 satisfies **`REQ-VR-03`** and enforces **`NFR-SEC-02` (Zero Secret Leakage)** by introducing automated, deterministic pre-commit scanning for credentials, API tokens, private keys, database passwords, and high-entropy strings across code diffs and execution artifacts.

The key challenges and requirements:
1. **Multi-Pattern Secret Detection:** Coding agents frequently generate or paste code snippets containing credentials (OpenAI/Anthropic/OpenRouter keys, Supabase service-role JWTs, AWS credentials, Telegram bot tokens, GitHub PATs, private keys). These must be intercepted immediately with zero chance of entering git history.
2. **Shannon Entropy Detection:** Many keys and tokens do not adhere to known prefixes. A mathematical entropy detector must calculate Shannon information entropy to identify suspicious pseudorandom strings while filtering false positives (UUIDs, git commit SHAs, base64 images, hexadecimal hashes).
3. **Deterministic Token Fingerprinting:** The system must never persist or log raw secret values. Instead, it must compute a one-way cryptographic SHA-256 fingerprint for each detected secret token. This enables safe whitelisting and human approval tracking without leaking sensitive material into the database or logs.
4. **Approval Override Workflow:** Some test fixtures or mock secrets are intentional. When blocked, the system must allow the human owner to review the redacted finding via Telegram or Web Dashboard and issue a signed, scoped approval override stored in `ApprovalRepository`.
5. **Harness & Push Gate Integration:** The secret scanner must integrate seamlessly into `VerificationHarness` (generating `secret-scan.md` artifacts) and enhance `PushValidator` (blocking `git push origin main` on unapproved secrets).

---

## 2. Technical Architecture & Component Design

### 2.1 Shannon Entropy Algorithm
The Shannon entropy formula measures the information density per character:
$$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$

Where:
- $n$ is the alphabet size of the string $X$
- $P(x_i)$ is the empirical probability of character $x_i$ occurring in the string

Empirical thresholds:
- Standard English / Source code identifiers: Entropy $\approx 2.5 - 3.8$ bits/char.
- Base64 / alphanumeric random secrets (e.g. API keys): Entropy $> 4.3$ bits/char (for length $\ge 20$).
- Hexadecimal secrets / random digests (e.g. 64-char API keys): Entropy $> 3.2$ bits/char (for length $\ge 32$).
- Exclusion filters:
  - UUIDs (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
  - Git commit SHAs (`/^[0-9a-f]{40}$/i` in commit metadata)
  - Common mock prefixes (`placeholder-`, `sk-xxx`, `test-token-`, `mock-key`)
  - Data URLs (`data:image/...`)

### 2.2 Comprehensive Known Secret Patterns
The pattern matcher checks additions in diffs against a compiled registry of known credential types:
- **Anthropic API Key:** `sk-ant-api[0-9]{2}-[a-zA-Z0-9_\-]{80,}`
- **OpenAI API Key:** `\bsk-(?:live-|proj-)?[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}\b`
- **OpenRouter API Key:** `\bsk-or-v1-[a-f0-9]{64}\b`
- **Google / Gemini API Key:** `\bAIzaSy[a-zA-Z0-9_-]{33}\b`
- **GitHub Personal Access Token:** `\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b` and `\bgithub_pat_[a-zA-Z0-9_]{82}\b`
- **Slack Token:** `\bxox[baprs]-[0-9a-zA-Z]{10,48}\b`
- **JWT (JSON Web Token):** `\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b`
- **AWS Access Key ID & Secret:** `\bAKIA[0-9A-Z]{16}\b`
- **Telegram Bot Token:** `\b[0-9]{8,10}:[a-zA-Z0-9_-]{35}\b`
- **Private Keys:** `-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----`
- **Database Connection URIs:** `(?:postgres|postgresql|mysql|mongodb\+srv|redis):\/\/[^\s:]+:[^\s@]+@[^\s\/]+`
- **Hardcoded Secret Declarations:** `(?:SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY|TELEGRAM_BOT_TOKEN|SECRET_KEY|API_SECRET)\s*=\s*['"]?[a-zA-Z0-9_\-\.]{16,}['"]?`

### 2.3 Redaction and Deterministic Fingerprinting
- **Redaction:** Tokens are masked as `[REDACTED_SECRET:sk...1a]` keeping at most the first 2 and last 2 characters to aid developer identification without leaking entropy.
- **Fingerprinting:**
  $$\text{fingerprint} = \text{SHA256}(\text{matchedToken}).\text{substring}(0, 16)$$
  Fingerprints are safe to store in the database, log in Telegram notifications, and pass to approval workflows.

### 2.4 Human-in-the-Loop Override Approval
When `SecretScanner` flags a secret:
1. The scanner sets `passed: false` with severity `blocker`.
2. The developer or agent can request an override by submitting the finding's fingerprint to `ApprovalRepository`.
3. If the owner approves the fingerprint via Telegram inline card (`[ ✅ Allow Secret ]`) or Web Dashboard, the fingerprint is added to `allowedFingerprints`.
4. Subsequent scans with that fingerprint pass as whitelisted (`severity: "warning"` with notice `OVERRIDDEN_BY_OWNER`).

---

## 3. Wave Breakdown & Plan Architecture

- **Plan 21.1: Core Entropy Engine & Multi-Pattern Secret Scanner**
  - Define domain interfaces and Zod schemas (`src/lib/agents/engine/verification/secret-scanner/types.ts`).
  - Implement Shannon entropy calculator with candidate string extraction and false-positive heuristics (`entropy.ts`).
  - Implement known pattern registry and regex matcher with token redaction and SHA-256 fingerprinting (`patterns.ts`).
  - Implement `SecretScanner` orchestrator class with diff parsing and markdown report formatting (`secret-scanner.ts`, `index.ts`).
  - Author unit tests for entropy calculation, patterns, redaction, and whitelisting (`tests/unit/agents/engine/secret-scanner.test.ts`).

- **Plan 21.2: Verification Harness Integration, Push Validator Enhancements, Route & Overrides**
  - Implement App Router route `src/app/api/verification/secrets/route.ts` (`GET` rules metadata, `POST` scan endpoint).
  - Integrate `SecretScanner` into `VerificationHarness` (creating `secret-scan.md` artifacts and blocking failed runs).
  - Upgrade `push-validator.ts` and `push-gate.ts` to use `SecretScanner` and respect approved fingerprints.
  - Author route tests and end-to-end integration tests (`tests/unit/api/verification-secrets-route.test.ts`, `tests/unit/agents/engine/secret-scanner-integration.test.ts`).
  - Verify full Vitest suite and Next.js production build with zero warnings.

---

## 4. Quality & Compliance Gates

- **Strict `main`-only Git policy:** Direct commits to local `main`.
- **Zero Warnings standard:** 0 compiler errors, 0 ESLint warnings, 0 Vitest failures.
- **Zero Secret Leakage (`NFR-SEC-02`):** Raw secret tokens never logged, returned in unredacted error messages, or embedded in tests.
