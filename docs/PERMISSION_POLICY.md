# JARVIS — Central Permission Policy & Governance Matrix

**Document:** `docs/PERMISSION_POLICY.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Governance Principles

The Jarvis Permission Engine acts as an inviolable gatekeeper between intent and execution.
1. **Default-Deny:** Any operation not explicitly listed as autonomous requires explicit human approval.
2. **Immutable Non-Escalation:** No agent, background worker, or external input can grant new permissions or alter the permission engine rules.
3. **Cryptographic & Scoped Binding:** Approvals are single-use, bounded by an exact resource payload hash, and expire after 24 hours if unused.
4. **Transparent Auditability:** Every decision (approved, rejected, expired) is recorded with full context in `audit_events`.

---

## 2. Action Permission Matrix

| Operation Category | Action Name | Permission Level | Approver | Conditions & Constraints |
|---|---|---|---|---|
| **Research & Intake** | `task.analyze_prompt` | **Autonomous** | None | Read-only analysis. |
| **Research & Intake** | `code.search_ast` | **Autonomous** | None | Read-only repository inspection. |
| **Specification** | `spec.generate` | **Autonomous** | None | Drafts requirements & acceptance criteria. |
| **Planning** | `plan.decompose` | **Autonomous** | None | Generates step dependencies & risk score. |
| **Development** | `sandbox.write_code` | **Autonomous** | None | Isolated to ephemeral Docker container. |
| **Verification** | `sandbox.run_tests` | **Autonomous** | None | Executes vitest/playwright in sandbox. |
| **Verification** | `sandbox.run_lint` | **Autonomous** | None | Read-only static analysis. |
| **Repair** | `sandbox.auto_fix` | **Autonomous** | None | Bounded by max 3 strikes per task. |
| **Git Operations** | `git.local_commit` | **Autonomous** | None | Strictly on local `main`; tests must pass. |
| **Git Operations** | `git.remote_push` | **Human Approval** | Owner | Push to `origin/main` requires explicit sign-off. |
| **AI Inference** | `ai.call_free_model` | **Autonomous** | None | Uses verified free models (Llama, Gemini, Qwen). |
| **AI Inference** | `ai.call_paid_model` | **Human Approval** | Owner | Explicit consent required before incurring charges. |
| **Database** | `db.read_user_data` | **Autonomous** | None | Scoped strictly via RLS `auth.uid()`. |
| **Database** | `db.destructive_ddl` | **Human Approval** | Owner | Dropping tables, altering columns, data migrations. |
| **Deployment** | `deploy.preview` | **Autonomous** | None | Ephemeral staging environment preview. |
| **Deployment** | `deploy.production` | **Human Approval** | Owner | Live production promotion requires sign-off. |
| **Communications**| `comm.send_message` | **Human Approval** | Owner | Sending emails, external webhooks, or messages. |
| **Financial** | `finance.spend_money`| **Human Approval** | Owner | Purchases, subscriptions, or credit usage. |

---

## 3. Approval Lifecycle & Schema

When an approval-gated action is triggered:
1. **Creation:** An approval record is created in `public.approvals` with:
   - `action_type`: e.g., `git_remote_push`.
   - `target_resource`: e.g., `commit:a1b2c3d4`.
   - `scope`: JSON payload containing diff summary, test logs, and risk score.
   - `expires_at`: `NOW() + INTERVAL '24 hours'`.
2. **Notification:** The owner is notified in the Next.js Approval Centre and via Telegram with quick action buttons.
3. **Execution Guard:** The target action executor validates:
   ```sql
   SELECT id FROM approvals 
   WHERE id = :approvalId 
     AND status = 'approved' 
     AND target_resource = :expectedTarget
     AND expires_at > NOW();
   ```
4. **Consumption:** Upon successful execution, the approval status is updated to `consumed` (or recorded in the audit event) preventing replay attacks.
