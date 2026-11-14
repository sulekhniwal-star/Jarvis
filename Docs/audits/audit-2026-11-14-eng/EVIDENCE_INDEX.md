# JARVIS — EVIDENCE INDEX & ARTIFACT COMPENDIUM
**Audit ID:** `AUDIT-2026-11-14-ENG`  
**Date:** November 14, 2026  
**Auditor:** Independent Verification & Evidence Custodian  
**Subject:** Empirical Command Outputs, Codebase Citations, Test Logs, and Tracebacks

---

## 1. Test Suite Verification Evidence

### 1.1 Complete Automated Test Suite Execution Log
**Command:** `backend/.venv/Scripts/python.exe -m pytest backend/tests`  
**Result:** 54 passed in 23.35s  
**Timestamp:** 2026-11-14T12:25:21+05:30  
```
============================= test session starts =============================
platform win32 -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0
rootdir: F:\Javis\backend
configfile: pyproject.toml
plugins: anyio-4.6.2.post1, asyncio-0.24.0, cov-6.0.0
asyncio: mode=Mode.AUTO, default_loop_scope=function
collected 54 items

backend/tests/integration/test_m1_core.py .........                      [ 16%]
backend/tests/integration/test_m2_orchestration.py ......                [ 27%]
backend/tests/integration/test_m3_github.py .....                        [ 37%]
backend/tests/integration/test_m4_execution.py .......                   [ 50%]
backend/tests/integration/test_m5_interfaces.py ..........               [ 68%]
backend/tests/integration/test_m7_self_improvement.py ......             [ 79%]
backend/tests/security/test_m6_security.py ..                            [ 83%]
backend/tests/security/test_security_boundaries.py ...                   [ 88%]
backend/tests/unit/test_baseline.py .                                    [ 90%]
backend/tests/unit/test_openrouter_provider.py .....                     [100%]

============================= 54 passed in 23.35s =============================
```

### 1.2 Full Code Coverage Report (pytest-cov)
**Command:** `backend/.venv/Scripts/python.exe -m pytest backend/tests --cov=app --cov-report=term-missing`  
```
Name                                Stmts   Miss  Cover   Missing
-----------------------------------------------------------------
app/__init__.py                         0      0   100%
app/api/__init__.py                     0      0   100%
app/api/v1/__init__.py                  0      0   100%
app/api/v1/approvals.py                25      4    84%   28, 30, 32, 46
app/api/v1/auth.py                     29      8    72%   30-31, 44-48, 59
app/api/v1/health.py                    6      0   100%
app/api/v1/memories.py                 32      8    75%   35-36, 45, 54, 63
app/api/v1/projects.py                 45     24    47%   34-37, 46-53, 62-67
app/api/v1/router.py                   11      0   100%
app/api/v1/system.py                   98     54    45%   30-37, 44-51, 68-94
app/api/v1/tasks.py                    55     18    67%   45-47, 58-60, 82, 92
app/api/v1/webhooks.py                 34     14    59%   31-33, 42-45, 58-62
app/cloud_entrypoint.py                58     58     0%   8-100
app/core/__init__.py                    0      0   100%
app/core/config.py                     44      0   100%
app/core/database.py                   28      4    86%   41-43, 56
app/core/security.py                   33      3    91%   39-41
app/middleware/__init__.py              0      0   100%
app/middleware/trace_middleware.py     15      0   100%
app/models/__init__.py                  7      0   100%
app/models/approval.py                 18      0   100%
app/models/audit.py                    15      0   100%
app/models/base.py                     19      0   100%
app/models/memory.py                   20      0   100%
app/models/project.py                  22      0   100%
app/models/task.py                     37      0   100%
app/models/user.py                     13      0   100%
app/orchestrator/__init__.py            3      0   100%
app/orchestrator/nodes.py             133     24    82%   42-47, 75-78, 120-128
app/orchestrator/state.py              16      0   100%
app/orchestrator/workflow.py           46      2    96%   40, 58
app/providers/__init__.py               3      0   100%
app/providers/base.py                  14      2    86%   22, 27
app/providers/factory.py               16      3    81%   20, 24, 28
app/providers/mock.py                  35      1    97%   54
app/providers/openrouter.py            98     15    85%   55-58, 86-90, 142-148
app/schemas/__init__.py                 5      0   100%
app/schemas/approval.py                18      0   100%
app/schemas/audit.py                   12     12     0%   8-22
app/schemas/memory.py                  22      0   100%
app/schemas/task.py                    38      0   100%
app/schemas/user.py                    18      0   100%
app/services/__init__.py                0      0   100%
app/services/approval_service.py       51     12    76%   48, 76, 82, 87-91
app/services/audit_service.py          18      0   100%
app/services/auth_service.py           71     44    38%   31-57, 75-83, 114-136
app/services/github_app_auth.py        45     26    42%   35-49, 60-72
app/services/github_service.py         89     32    64%   48-52, 70-76, 110-125
app/services/memory_service.py         74     15    80%   68-79, 134-142
app/services/project_auditor.py       110     28    75%   85-94, 150-165
app/services/self_improvement.py       63     16    75%   60-68, 87-90
app/services/task_service.py          183    104    43%   54-62, 120-126, 210-305
app/services/telegram_service.py      185    102    45%   68-71, 163-200, 250-360
app/workers/__init__.py                 6      0   100%
app/workers/coding_agent.py            66      6    91%   49-51, 102-104, 130
app/workers/command_policy.py          37      5    86%   45, 56, 60, 65
app/workers/filesystem.py              48      5    90%   30, 40-42, 53-55, 80
app/workers/runner.py                  62     19    69%   69-80, 83-89, 92-98
app/workers/test_parser.py             33      0   100%
-----------------------------------------------------------------
TOTAL                                2295    745    68%
```

---

## 2. Frontend Build Verification Evidence

### 2.1 TypeScript Compile Check (`tsc --noEmit`)
**Command:** `cd frontend; pnpm run lint`  
**Result:** Exit Code 0 (Zero type errors detected).

### 2.2 Next.js Production Build
**Command:** `cd frontend; pnpm run build`  
**Result:** Exit Code 0 (Production build created in 4.2 seconds).  
```
   ▲ Next.js 15.5.29
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 4.2s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/5) ...
   Generating static pages (1/5) 
   Generating static pages (2/5) 
   Generating static pages (3/5) 
 ✓ Generating static pages (5/5)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    13.7 kB         116 kB
├ ○ /_not-found                            997 B         104 kB
└ ○ /manifest.webmanifest                  121 B         103 kB
+ First Load JS shared by all             103 kB
  ├ chunks/524-48f8168b624b0270.js       46.3 kB
  ├ chunks/79871edf-cffb87be9f407cec.js  54.2 kB
  └ other shared chunks (total)          1.97 kB

○  (Static)  prerendered as static content
```

---

## 3. Discovered Vulnerability & Architecture Evidence

### 3.1 VULN-01: Hardcoded Initial Passwords
**File:** `backend/app/services/auth_service.py`  
**Lines:** 73–83  
```python
    # In local development, also accept configured initial passwords if hash was out of sync
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

### 3.2 VULN-02: Emergency Kill-Switch Bypass on Task Intake
**File:** `backend/app/api/v1/system.py` vs `backend/app/services/task_service.py`  
**System Stop:** Lines 164–165 of `system.py`:
```python
    _set_system_status("LOCKED")
    # Cancel all active tasks
    tasks, _ = await list_tasks(session)
```
**Task Intake:** Lines 51–64 of `task_service.py`:
```python
async def create_task(session: AsyncSession, task_in: TaskCreate, user_id: str) -> Task:
    """Creates a new task. Checks idempotency key to prevent duplicate intake."""
    # NOTE: _get_system_status() is NEVER called. Tasks accepted regardless of LOCKED status!
    if task_in.idempotency_key:
        ...
```

### 3.3 VULN-03: Dormant Self-Improvement Security Guard
**File:** `backend/app/services/self_improvement.py`  
**Lines:** 81–90  
```python
    @staticmethod
    def validate_modification_target(target_path: str) -> None:
        """
        Validates that a proposed file modification target does NOT touch protected core systems.
        Raises ProtectedComponentViolation if target is restricted.
        """
        if SelfImprovementService.is_protected_file(target_path):
            raise ProtectedComponentViolation(
                f"Security Policy Violation: Autonomous self-improvement cannot modify "
                f"protected security component '{target_path}'. Changes require human-authored commits."
            )
```
*Codebase Audit Fact:* `validate_modification_target` is referenced in `tests/integration/test_m7_self_improvement.py` lines 86 & 94, but appears 0 times in `backend/app/workers/` or `backend/app/services/task_service.py`.

### 3.4 VULN-04: Parameter Transposition in Telegram Inline Buttons
**File:** `backend/app/services/telegram_service.py`  
**Lines:** 175–181 & 189–195  
```python
    if data.startswith("approve_"):
        appr_id = data.replace("approve_", "")
        await evaluate_approval(
            session,
            appr_id,
            "APPROVED",
            "Approved via Telegram one-tap inline button",  # Positional argument 4 is decided_by_user_id!
            owner_user_id,                                  # Positional argument 5 is reason!
        )
```
**Function Definition in `backend/app/services/approval_service.py` (lines 62–68):**
```python
async def evaluate_approval(
    session: AsyncSession,
    approval_id: str,
    decision: str,  # "APPROVED" or "REJECTED"
    decided_by_user_id: str,
    reason: str | None = None,
) -> Approval:
```

### 3.5 ARCH-03: GitHub PR Markdown Report vs Source Code
**File:** `backend/app/services/task_service.py`  
**Lines:** 269–297  
```python
    report_path = f".jarvis/reports/mission_{task.id[:8]}.md"
    # ... constructs markdown text ...
    await gh.create_or_update_file(
        repository=target_repo,
        path=report_path,
        content=report_content,
        commit_message=f"feat(jarvis): autonomous mission {task.id[:8]} execution report",
        branch=branch_name,
    )
    # NOTE: None of the files modified in `workspaces/task_{id[:8]}` are committed!
```

---

## 4. Test Harness Collision Failure Traceback

**Captured During Initial Test Run Before `test_suite.db` Was Cleaned:**
```
sqlalchemy.exc.IntegrityError: (sqlite3.IntegrityError) UNIQUE constraint failed: users.username
[SQL: INSERT INTO users (username, hashed_password, display_name, role, is_active, id, created_at, updated_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?)]
[parameters: ('test_owner', '$argon2id$v=19$m=65536,t=3,p=4$...', 'Test Owner', 'owner', 1, 'usr_a1b2c3d4', '2026-11-14 06:12:45', '2026-11-14 06:12:45')]
(Background on this error at: https://sqlalche.me/e/20/gk2a)
```
*Resolution:* Manually removed residual `backend/tests/test_suite.db` to restore 54/54 passes. Permanent fix cataloged under `REM-P0-05`.
