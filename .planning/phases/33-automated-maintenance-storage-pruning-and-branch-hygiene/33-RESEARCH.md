# Phase 33: Automated Maintenance, Storage Pruning & Branch Hygiene — Research & Architecture

## Objective
Establish automated continuous maintenance procedures to rotate ephemeral build logs older than 30 days, expire stale pending approvals, reclaim disk space, and continuously enforce absolute branch safety (`main`-only invariant) across local and CI/CD operations (`REQ-OPS-03`, `NFR-SEC-04`).

---

## 1. Requirements & Invariants

| ID | Specification | Architectural Requirement |
|---|---|---|
| **REQ-OPS-03** | Automated Storage Pruning & Retention | Scheduled maintenance runner rotating build logs > 30 days, expiring stale pending approvals, and reclaiming disk space. |
| **NFR-SEC-04** | Continuous Branch Safety Enforcement | Continuous git guard verification ensuring zero non-main branch mutations across remote and local operations. |
| **CLI & API Trigger** | Script & REST Endpoint | Accessible via `npm run maintenance:prune`, `POST /api/maintenance/prune`, and Telegram `/prune`. |

---

## 2. Technical Findings & Design Decisions

### A. Storage Pruning & Approval Expiry (`REQ-OPS-03`)
- **Artifacts Retention Rotation:**
  - Ephemeral artifacts in `run_artifacts` older than 30 days (`created_at < now() - 30 days`) are queried.
  - Disk files associated with `storage_path` are pruned safely using `fs.promises.unlink` or `fs.rm`.
  - Database records are deleted, and total bytes reclaimed are aggregated.
- **Stale Approval Expiration:**
  - Pending approvals where `status === "pending"` and `new Date(expires_at) < new Date()` must be transitioned to `"expired"`.
  - Each expired approval emits a tamper-evident audit record via `AuditLedgerService` (`eventType: "approval.expired"`).
- **Dry-Run Support:**
  - The maintenance runner supports `--dry-run` or `{ dryRun: true }` to inspect what would be cleaned without performing destructive operations.

### B. Continuous Branch Safety & Hygiene (`NFR-SEC-04`)
- **Main-Only Discipline:**
  - Branch hygiene check executes `git branch --format="%(refname:short)"`.
  - Any local branch name other than `main` is classified as a policy violation.
  - Option to clean local stale branches: `git branch -D <branch>` when explicitly requested.
  - Integration with `scripts/git-guard.ts` via subcommand `check-branch-hygiene` to block commits and CI builds if non-main branches exist.

### C. Telegram `/prune` Command & Web UI Control Card
- **Telegram `/prune`:**
  - Triggers the maintenance pruning routine.
  - Reports:
    - 🧹 Reclaimed bytes (MB)
    - 📄 Ephemeral artifacts pruned count
    - ⏳ Stale approvals expired count
    - ⏱️ Execution duration (ms)
- **Web UI Control Card (`src/components/ops/maintenance-control-card.tsx`):**
  - Shows last maintenance execution time, total bytes cleaned, expired approvals count, and branch hygiene status.
  - Provides a 1-click "Run Pruning Maintenance" button.
  - Embedded in `/settings` page.

---

## 3. Execution Wave Plan
1. **Wave 1 (`33-01-PLAN.md`):** Automated Storage Pruner Service & REST API
   - `StoragePruningService` in `src/lib/ops/storage-pruner.ts`
   - `POST /api/maintenance/prune` & `GET /api/maintenance/prune`
   - `scripts/maintenance-runner.ts` CLI tool
   - Unit and API route tests
2. **Wave 2 (`33-02-PLAN.md`):** Continuous Branch Safety Runner, UI Maintenance Card & Telegram Command
   - `src/lib/git/branch-hygiene.ts` & `scripts/git-guard.ts` enhancement (`NFR-SEC-04`)
   - `src/components/ops/maintenance-control-card.tsx` & `/settings` integration
   - Telegram bot `/prune` command
   - Unit, component, and command tests
