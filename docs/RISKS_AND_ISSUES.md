# JARVIS — Risk Register & Issues Log

**Document:** `docs/RISKS_AND_ISSUES.md`  
**Version:** 1.0  
**Status:** Active  
**Date:** 2026-11-15  

---

## 1. Active Risk Register

| Risk ID | Risk Description | Category | Probability | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|---|---|
| **R-001** | **Remote Branch Protection Conflict:** If GitHub enforces pull requests on `origin/main`, direct pushes will fail. | Governance | Medium | High | Inspect remote branch protection settings. If PRs are enforced, alert the owner immediately per Section 1 rules and request permission guidance. | **Active** |
| **R-002** | **Supabase Free Tier Inactivity Pause:** Supabase pauses free databases after 7 days of inactivity. | Infrastructure | High | High | Implement automated 3-day health check query (`SELECT 1;`) via cron to maintain database activity. Document unpause procedure in `BACKUP_AND_RECOVERY.md`. | **Mitigated** |
| **R-003** | **OpenRouter Free Model Rate Limits:** High-volume agent loops may hit rate limits on free models. | Cost / Reliability | High | Medium | Implement multi-model free fallback hierarchy (Llama -> Gemini -> Qwen). Halt and request owner approval before invoking paid models. | **Mitigated** |
| **R-004** | **Sandbox Path Access to Host CLI Binaries:** Terminal sandbox does not include host Node/Python/Docker in PATH by default. | Environment | High | High | For local development commands requiring host binaries, request path whitelist or bypass permissions per Antigravity sandbox rules. | **Open** |
| **R-005** | **Working Tree Unstaged Deletions in `.planning/`:** Unstaged deletions of 7 files detected in `.planning/`. | Repository State | Medium | Low | Frozen working tree per Rule 9. Confirmed resolved by owner in commit `da2a0a9`. | **Resolved** |
| **R-006** | **GitHub Actions Cold-Start Latency:** Ephemeral runner startup introduces 30–60s overhead per coding run. | Performance | Medium | Low | Batch tasks where appropriate; optimize Docker layer caching in runner workflow files. | **Accepted** |

---

## 2. Issues Log

### Issue ISS-001: Unstaged `.planning/` Deletions
- **Date Raised:** 2026-11-15
- **Details:** 7 files in `.planning/` were deleted in the working tree prior to session initialization.
- **Affected Files:**
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/STATE.md`
  - `.planning/config.json`
  - `.planning/research/ARCHITECTURE.md`
  - `.planning/research/STACK.md`
- **Current State:** **Resolved**. Committed by owner in `da2a0a9` (`chore: remove empty deleted file`) and pushed to `origin/main`. Working tree clean.
- **Resolution Plan:** Completed. Documented in `CHANGELOG.md` and `PROGRESS.md`.

### Issue ISS-002: ESLint Failures (14 Errors, 65 Warnings)
- **Date Raised:** 2026-11-27
- **Details:** `pnpm lint` (`eslint .`) exited with code 1 (79 problems: 14 errors, 65 warnings), including `react-hooks/refs` errors in `use-realtime-subscription.ts` and `use-realtime-tasks.ts`, `react/no-unescaped-entities` in UI components, and `prefer-const` in `storage-pruner.ts`.
- **Current State:** **Resolved (Errors)**. Fixed all 14 ESLint errors; `npx eslint . --quiet` exits 0. (65 non-blocking warnings remain).

### Issue ISS-003: Version Drift (`VERSION` vs `package.json`)
- **Date Raised:** 2026-11-27
- **Details:** Root `VERSION` read `1.6.0` while `package.json` read `10.0.0`.
- **Current State:** **Resolved**. Updated `VERSION` to `10.0.0`.

### Issue ISS-004: OpenRouter Free Tier 50 RPD Limit
- **Date Raised:** 2026-11-27
- **Details:** Standard Free Tier on OpenRouter caps `:free` models at 50 requests/day (20 RPM). Multi-step autonomous agent loops may exhaust 50 RPD quickly unless $10 lifetime credits are purchased (unlocks 1,000 RPD) or requests are batched.
- **Current State:** **Open**. Needs owner decision / awareness.

### Issue ISS-005: Missing Python Worker & `docs/audits/` Directory
- **Date Raised:** 2026-11-27
- **Details:** `docs/TECH_STACK.md` defines a Python 3.11+ specialized AI service contract, but no `.py` files exist in the repo. `docs/audits/` does not yet exist.
- **Current State:** **Open**.

### Issue ISS-006: Historical Non-`main` Remote Branches on `origin`
- **Date Raised:** 2026-11-27
- **Details:** `origin` retains 6 historical branches (`feat-milestone-0..3`, `dependabot/*`, `jarvis/*`). Local repo has only `main`.
- **Current State:** **Open**. Requires owner authorization to prune remote branches on GitHub.
