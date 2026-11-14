# Project Jarvis — System Data Flow & State Lifecycle

**Document Version:** 1.0.0  
**Status:** Verified Specification  

---

## 1. End-to-End Task Lifecycle Data Flow

The following sequence illustrates how an assignment transitions from intake to automated GitHub Pull Request:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Human Owner (Telegram / HUD)
    participant UI as Presentation Plane
    participant API as FastAPI Gateway
    participant DB as Persistent Database
    participant Orch as LangGraph Orchestrator
    participant AI as AI Provider (OpenRouter/Mock)
    participant Worker as Sandboxed Execution Runner
    participant GH as GitHub Platform

    Owner->>UI: Submit Task ("Fix memory leak in buffer pool")
    UI->>API: POST /api/v1/tasks (Bearer JWT)
    API->>DB: Check idempotency key & Insert Task (PENDING)
    API->>AI: generate_plan(title, description)
    AI-->>API: JSON Breakdown Steps (5 steps)
    API->>DB: Store TaskSteps (PENDING)
    API-->>UI: 201 Created (Task Details + Steps)

    API->>Orch: ainvoke(TaskGraphState)
    Orch->>Orch: Check sensitive keywords (delete, drop, prod)
    
    alt Sensitive Action Detected
        Orch->>DB: Create Approval Record (AWAITING_APPROVAL)
        Orch-->>UI: Real-time Alert: Authorization Required
        Owner->>UI: Click "Authorize Mission"
        UI->>API: POST /api/v1/approvals/{id}/decision (APPROVED)
        API->>DB: Update Approval (APPROVED)
        API->>Orch: Resume graph execution
    end

    Orch->>Worker: Dispatch execution in isolated workspace
    Worker->>Worker: SandboxedFilesystem check: read source files
    Worker->>AI: generate_code_solution(task, context)
    AI-->>Worker: Code Patch Diff
    Worker->>Worker: Apply patch & validate path containment
    Worker->>Worker: Execute test suite (pytest -v)

    alt Test Suite Fails
        Worker->>AI: Diagnostic repair prompt with test stderr
        AI-->>Worker: Corrected patch
        Worker->>Worker: Re-apply & re-test (up to 3 retries)
    end

    Worker-->>Orch: Test Evidence (Exit code 0, passed=True)
    Orch->>GH: Create branch (jarvis/mission-xxxx)
    Orch->>GH: Commit report (.jarvis/reports/mission_xxxx.md)
    Orch->>GH: Open Pull Request with structured test evidence
    GH-->>Orch: PR Created (#42 URL)
    Orch->>DB: Update Task (COMPLETED, pr_url)
    Orch-->>UI: Dispatch notification to Telegram & HUD
    Owner->>GH: Review PR & Merge to Main
```

---

## 2. Ingress & Egress Data Flow Matrix

| Stage | Data Transferred | Origin | Destination | Encryption / Security |
|---|---|---|---|---|
| **Intake** | Natural language prompt, priority, idempotency key | User (Browser/Telegram) | FastAPI Control Plane | TLS 1.3, JWT Bearer / Telegram HMAC |
| **Planning** | Task title, description, system prompt | Control Plane | OpenRouter API / Gemini | HTTPS TLS 1.3, Bearer Token |
| **Workspace Setup** | Git clone / branch archive | GitHub API | Sandbox Directory | HTTPS / Ephemeral GitHub App Token |
| **Execution** | Code files, test commands | Sandbox Filesystem | Subprocess Worker | Local OS memory, strict path chroot-like check |
| **Test Verification** | Stdout, Stderr, exit code | Subprocess Worker | Control Plane | Process pipes, strictly sanitized logs |
| **PR Delivery** | Code diff, test evidence markdown | Control Plane | GitHub REST API | HTTPS TLS 1.3, RS256 JWT -> App Token |
| **Audit Log** | Actor, action, target, metadata, timestamp | Control Plane | Database `audit_events` | Immutable DB append, secret redaction filter |

