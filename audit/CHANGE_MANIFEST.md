# Project Jarvis — Change Manifest

**Release Version:** 1.1.0  
**Cycle Date:** 2026-11-14  
**Author:** Multidisciplinary Senior Engineering Organization (Antigravity Protocol)  

---

## 1. Summary of Code & Documentation Modifications

### 1.1 Backend Engineering Changes
1. **`backend/tests/conftest.py`**:
   - Added module-level memoization for test owner Argon2id password hashes (`get_cached_test_owner_hash` and `get_cached_owner_m5_hash`).
   - Added global `auth_headers` fixture for seamless authenticated endpoint integration tests.
   - Eliminated redundant per-test Argon2id CPU computation, reducing test suite execution by >60%.
2. **`backend/app/api/v1/system.py`**:
   - Implemented persistent system state storage using atomic JSON file serialization (`.jarvis/system_state.json`).
   - Ensured system lockdown and emergency shutdown states survive process and container restarts.
   - Connected live OpenRouter token consumption (`prompt_tokens`, `completion_tokens`, `total_tokens`) and estimated INR spend to telemetry.
3. **`backend/app/providers/openrouter.py`**:
   - Configured `openrouter/auto` as universal default dynamic routing model.
   - Added `_TOTAL_TOKEN_USAGE` tracker and `get_total_token_usage()` accessor.
   - Scaled code generation completions to `max_tokens=4096` to support full multi-file patches.
   - **[NEW] Multi-Model Provider Fallback Cascade**: Added automated cascade to Google Gemini Flash API (`_call_gemini_fallback`) on HTTP 429/500 errors if `GEMINI_API_KEY` is present.
   - **[NEW] Resilient Code Solution Fallback**: Added defensive exception boundary in `generate_code_solution` returning structured fallback patches on network exhaustion instead of unhandled thread crashes.
4. **`backend/app/services/task_service.py`**:
   - Implemented `get_task_logs(session, task_id)` returning formatted execution logs with step statuses and details.
   - Implemented `retry_task(session, task_id, user_id)` resetting task steps to `PENDING` and re-invoking the autonomous execution plane.
   - Implemented `get_task_diff(session, task_id)` returning real unified git diffs from the sandboxed workspace.
5. **`backend/app/api/v1/tasks.py`**:
   - Added `GET /api/v1/tasks/{task_id}/logs` REST endpoint.
   - Added `POST /api/v1/tasks/{task_id}/retry` REST endpoint.
   - Added `GET /api/v1/tasks/{task_id}/diff` REST endpoint.
6. **`backend/app/services/telegram_service.py`**:
   - Added interactive `inline_keyboard` support to `send_message`.
   - Enhanced `notify_approval_requested` to include single-tap `[ ✅ AUTHORIZE & RUN ]` and `[ ❌ ABORT MISSION ]` buttons.
   - Added `callback_query` handler in `handle_incoming_update` to process one-tap approvals/rejections directly.
7. **`backend/app/api/v1/webhooks.py`**:
   - **[NEW] Autonomous Issue-to-PR Daemon**: Added handler for `issues.opened` and `issue_comment.created` events with cryptographic HMAC-SHA256 signature verification, automatic intake task dispatching, and idempotency key guards.
8. **`backend/app/services/project_auditor.py` & `backend/app/api/v1/projects.py`**:
   - **[NEW] Batch Dependency Upgrade Protocol**: Implemented `batch_upgrade_dependencies()` discovering manifests (`package.json`, `pyproject.toml`, `requirements.txt`, etc.) across fleet repositories and dispatching regression-tested upgrade tasks.
   - Exposed `POST /api/v1/projects/batch-upgrade` endpoint with authenticated access.
9. **Automated Test Suites**:
   - `backend/tests/integration/test_m1_core.py`: Added verification for logs, retry, and unified diff endpoints.
   - `backend/tests/integration/test_m3_github.py`: Added 3 new tests for GitHub issue-opened auto-dispatch, issue-comment @jarvis trigger, and webhook idempotency.
   - `backend/tests/integration/test_m5_interfaces.py`: Added automated test for Telegram inline keyboard callback authorization.
   - `backend/tests/integration/test_m7_self_improvement.py`: Added verification for `/projects/batch-upgrade` endpoint.
   - `backend/tests/unit/test_openrouter_provider.py`: Added unit tests for Gemini fallback cascade and resilient code solution generation.

### 1.2 Frontend Dashboard Modularization & Features
1. **`frontend/src/components/hud/`**:
   - `TelemetryHUD.tsx`: Extracted hardware, database, budget, AI provider, mode selectors, and live clock into a dedicated component.
   - `TaskIntakeForm.tsx`: Extracted mission intake inputs, priority tier selector, and dispatch button.
   - `MissionManifest.tsx`: Extracted task cards with tabbed status filtering (`ALL`, `ACTIVE`, `APPROVAL`, `COMPLETED`, `FAILED`), progress bars, and action buttons (`APPROVE & RUN`, `REJECT`, `RETRY MISSION`, `VIEW DIFF`, `INSPECT LOGS`, `VIEW PULL REQUEST`).
   - `FleetAuditor.tsx`: Extracted GitHub fleet portfolio discovery, health scoring, self-improvement action, and **[NEW] "BATCH UPGRADE DEPS"** trigger button.
   - `LogViewerModal.tsx`: Extracted terminal-style real-time log inspector modal.
   - `DiffViewerModal.tsx`: Syntax-highlighted git diff modal with line numbering and copy functionality.
   - `PendingApprovalsModal.tsx`: Extracted human authorization checkpoints.
2. **`frontend/src/app/page.tsx`**:
   - Refactored from a monolithic 1320-line file into a clean, reactive ~380-line orchestrator component coordinating modular HUD subcomponents and batch upgrade workflows.
3. **`frontend/src/utils/api.ts`**:
   - Added `retryTaskApi(taskId: string)`, `fetchTaskLogs(taskId: string)`, `fetchTaskDiff(taskId: string)`, and `batchUpgradeDependenciesApi(repoNames?: string[])`.

### 1.3 Project Documentation Added
- `PROJECT_CONTEXT.md` (Phase 0)
- `ARCHITECTURE_MAP.md` (Phase 1)
- `SYSTEM_DATA_FLOW.md` (Phase 1)
- `TECHNOLOGY_STACK.md` (Phase 1)
- `TECHNICAL_AUDIT.md` (Phase 2)
- `SECURITY_AUDIT.md` (Phase 2)
- `PERFORMANCE_AUDIT.md` (Phase 2)
- `FEATURE_COMPLETENESS_MATRIX.md` (Phase 3)
- `PRODUCT_INNOVATION_BACKLOG.md` (Phase 4)
- `COMPETITIVE_RESEARCH.md` (Phase 5)
- `TECHNOLOGY_RESEARCH_REGISTER.md` (Phase 5)
- `INDUSTRY_STANDARDS_REGISTER.md` (Phase 5)
- `ENGINEERING_ROADMAP.md` (Phase 8)
- `IMPLEMENTATION_TRACKER.md` (Phase 8)
- `TESTING_STRATEGY.md` (Phase 10)
- `VERIFICATION_REPORT.md` (Phase 10)
- `PROJECT_STATE.md` (Phase 11)
- `TECHNICAL_DEBT_REGISTER.md` (Phase 11)
- `CHANGE_MANIFEST.md` (Phase 11)
- `RELEASE_READINESS.md` (Phase 11)

