# Test Strategy Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** QA Automation Lead & Staff Backend Engineer  
**Date:** November 14, 2026  

---

## 1. Testing Philosophy & Non-Negotiable Rule

*Never claim a test passed unless it was actually executed and its full output, duration, and exit status recorded.*

Jarvis enforces automated, deterministic verification at every stage of the development lifecycle. Autonomous agents cannot merge pull requests or resolve tasks without passing verified automated test suites.

---

## 2. Testing Pyramid & Tooling

```
               /\
              /  \     E2E Tests (Playwright)
             /    \    - Dashboard user flows & approval modals
            /------\
           /        \   Integration Tests (Vitest + Testcontainers)
          /          \  - Supabase RLS policies, pgmq atomic queues, webhooks
         /------------\
        /              \ Unit Tests (Vitest / pytest)
       /                \ - Zod schema validations, BudgetManager math, Permission matrix
      /------------------\
```

### 2.1 Unit Testing (Vitest & pytest)
- **Scope:** Pure functions, state transitions, Zod schemas, budget calculations, and policy matrices.
- **Coverage Target:** Minimum 90% branch coverage on core governance packages (`permission-engine`, `budget-manager`).

### 2.2 Integration Testing (Supabase & Webhooks)
- **Scope:** Real database interactions with Dockerized PostgreSQL.
- **Critical Suites:**
  - **RLS Boundary Tests:** Validate that User A cannot read or write User B's projects or tasks under any circumstance.
  - **Queue Concurrency Tests:** Verify atomic `pgmq.read` locks and visibility timeouts under concurrent workers.
  - **Signature Tests:** Validate HMAC verification on GitHub and Telegram webhook ingress.

### 2.3 Static Analysis & Security Scanning
- **`Semgrep`:** Scans generated code for injection vulnerabilities and dangerous standard library calls.
- **`Trivy`:** Scans runner Docker images and npm/python dependency locks for known CVEs.
- **`Gitleaks`:** Validates that no commits contain hardcoded credentials or API keys.

---

## 3. Mandatory Task Execution Telemetry Record

For every autonomous coding task executed, Jarvis saves an immutable record in `agent_runs` and `task_test_manifests`:
1. **Task ID & Name**
2. **Target Repository & Branch**
3. **Commit SHA**
4. **AI Model & Provider Used**
5. **Prompt Tokens & Completion Tokens**
6. **Estimated vs. Confirmed Cost (USD & INR)**
7. **Test Framework Invoked (`vitest`, `pytest`)**
8. **Tests Executed, Passed, Failed, and Skipped**
9. **Full Execution Logs & Error Traces**
10. **Files Modified, Created, or Deleted**
11. **Security & Vulnerability Scan Results**
12. **Final Outcome (Pass, Fail, Escalated)**
