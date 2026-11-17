# Phase 32: System Health Diagnostics & Liveness Telemetry — Research & Architecture

## Objective
Establish a high-performance, non-blocking diagnostic health inspection subsystem and real-time operational telemetry reporting for Jarvis (`REQ-OPS-02`, `NFR-REL-03`).

---

## 1. Requirements & Invariants

| ID | Specification | Architectural Requirement |
|---|---|---|
| **REQ-OPS-02** | Diagnostic System Health Probe | Automated inspection endpoint `/api/health` verifying database latency, AI gateway availability, background task queue depth, and memory/process metrics. |
| **NFR-REL-03** | Sub-200ms Diagnostic Telemetry Overhead | Health probes must execute within < 200ms total wall-clock time without creating transaction locks on active database tables. |
| **Telegram /health** | Remote Health Status Command | Dispatches formatted MarkdownV2 diagnostic card with latency, uptime, heap memory, and worker status. |

---

## 2. Technical Findings & Subsystem Integration

### A. Sub-200ms Non-Blocking Inspection Pattern (`NFR-REL-03`)
- **Parallel Promise Execution:** Run all diagnostic probes in parallel using `Promise.allSettled` wrapped with an overarching timeout (e.g., 180ms).
- **Lightweight DB Ping:**
  - Standard Supabase Postgres ping: `supabase.from("user_profiles").select("id").limit(1)`.
  - Measures wall-clock round-trip time (`Date.now() - startTime`).
  - If latency > 150ms or times out, report `degraded` rather than hanging the server request.
- **AI Gateway & Circuit Breaker Telemetry:**
  - Query `InferenceCircuitBreaker` state (CLOSED = healthy, OPEN = tripped/unhealthy, HALF_OPEN = degraded).
  - Verify adapter availability without consuming paid inference tokens.
- **Task Queue & Process Registry:**
  - Active child processes from `ProcessCancellationRegistry.getActiveCount()`.
  - Active / queued runs from `agent_runs` table (`status IN ('queued', 'running')`).
- **Node.js System Telemetry:**
  - `process.memoryUsage()`: `heapUsed`, `heapTotal`, `rss` in MB.
  - `process.uptime()`: Uptime in seconds.
  - Platform / architecture runtime metadata.

### B. Health Status Classification
- **`healthy`**: Database responds in < 150ms, AI circuit breaker CLOSED, queue depth within thresholds, heap usage < 85% of total.
- **`degraded`**: Database responds between 150ms and 500ms, or AI circuit breaker HALF_OPEN, or queue has > 10 queued tasks.
- **`unhealthy`**: Database unreachable or timed out, or AI circuit breaker OPEN with no fallback, or memory critical.
- **HTTP Status Codes:**
  - `200 OK`: `status === "healthy" | "degraded"`
  - `503 Service Unavailable`: `status === "unhealthy"`

### C. Telegram `/health` Command
- Formats metrics into clean MarkdownV2 cards:
  - 🟢 / 🟡 / 🔴 status banner
  - Database latency in ms
  - AI Gateway provider & circuit breaker status
  - Task Queue depth (running / queued)
  - Process heap & RSS memory
  - System uptime in days/hours/minutes

---

## 3. Execution Wave Plan
1. **Wave 1 (`32-01-PLAN.md`):** Diagnostic Engine & REST Endpoints
   - `SystemHealthDiagnosticService` (`src/lib/ops/health-checker.ts`)
   - Non-blocking probes with < 200ms execution timeout
   - REST endpoints `/api/health` and `/api/health/diagnostics`
   - Comprehensive unit and API route tests
2. **Wave 2 (`32-02-PLAN.md`):** Web UI System Health Widget & Telegram Command
   - `SystemHealthCard` UI component with live polling and status indicators
   - Integration into Dashboard / Overview view
   - Telegram `/health` command with MarkdownV2 formatting
   - Component and command unit tests
