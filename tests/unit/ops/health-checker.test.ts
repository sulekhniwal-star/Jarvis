import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemHealthDiagnosticService } from "@/lib/ops/health-checker";

describe("SystemHealthDiagnosticService (REQ-OPS-02, NFR-REL-03)", () => {
  let mockSupabase: any;
  let mockCircuitBreaker: any;
  let mockProcessRegistry: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "user_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: "usr-1" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "agent_runs") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: "run-1", status: "running" },
                  { id: "run-2", status: "queued" },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "tasks") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "task-1", status: "in_progress" }],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    };

    mockCircuitBreaker = {
      evaluateInference: vi.fn().mockResolvedValue({
        allowed: true,
        isFree: true,
        status: "nominal",
      }),
    };

    mockProcessRegistry = {
      getActiveCount: vi.fn().mockReturnValue(2),
    };
  });

  it("produces a healthy report when all subsystems respond quickly (< 200ms)", async () => {
    const service = new SystemHealthDiagnosticService({
      supabaseClient: mockSupabase,
      circuitBreaker: mockCircuitBreaker,
      processRegistry: mockProcessRegistry,
      timeoutMs: 180,
    });

    const report = await service.getHealthReport();

    expect(report.status).toBe("healthy");
    expect(report.durationMs).toBeLessThan(200); // NFR-REL-03
    expect(report.services.database.status).toBe("healthy");
    expect(report.services.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(report.services.aiGateway.status).toBe("healthy");
    expect(report.services.aiGateway.circuitBreakerState).toBe("NOMINAL");
    expect(report.services.taskQueue.status).toBe("healthy");
    expect(report.services.taskQueue.activeRuns).toBe(1);
    expect(report.services.taskQueue.queuedRuns).toBe(1);
    expect(report.services.system.activeChildProcesses).toBe(2);
    expect(report.services.system.memory.heapUsedMb).toBeGreaterThan(0);
  });

  it("flags degraded status when database latency is high or probe times out", async () => {
    // Simulate slow database response
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve({ data: [{ id: "usr-1" }], error: null }),
                160
              )
            )
        ),
      }),
    });

    const service = new SystemHealthDiagnosticService({
      supabaseClient: mockSupabase,
      circuitBreaker: mockCircuitBreaker,
      processRegistry: mockProcessRegistry,
      timeoutMs: 80, // timeout triggers at 80ms
    });

    const report = await service.getHealthReport({ timeoutMs: 80 });

    expect(report.status).toBe("degraded");
    expect(report.services.database.status).toBe("degraded");
    expect(report.durationMs).toBeLessThan(200);
  });

  it("flags unhealthy status when database query fails with error", async () => {
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection refused" },
        }),
      }),
    });

    const service = new SystemHealthDiagnosticService({
      supabaseClient: mockSupabase,
      circuitBreaker: mockCircuitBreaker,
      processRegistry: mockProcessRegistry,
    });

    const report = await service.getHealthReport();

    expect(report.status).toBe("unhealthy");
    expect(report.services.database.status).toBe("unhealthy");
    expect(report.services.database.error).toContain("Database connection refused");
  });

  it("flags degraded status when AI Gateway circuit breaker reports emergency reserve", async () => {
    mockCircuitBreaker.evaluateInference.mockResolvedValue({
      allowed: true,
      isFree: false,
      status: "emergency_unlocked",
      warning: "Emergency reserve active",
    });

    const service = new SystemHealthDiagnosticService({
      supabaseClient: mockSupabase,
      circuitBreaker: mockCircuitBreaker,
      processRegistry: mockProcessRegistry,
    });

    const report = await service.getHealthReport();

    expect(report.status).toBe("degraded");
    expect(report.services.aiGateway.status).toBe("degraded");
    expect(report.services.aiGateway.circuitBreakerState).toBe("EMERGENCY_UNLOCKED");
  });

  it("flags task queue as backlogged when queued runs exceed threshold (> 10)", async () => {
    const backloggedRuns = Array.from({ length: 12 }, (_, i) => ({
      id: `run-${i}`,
      status: "queued",
    }));

    mockSupabase.from = vi.fn((table: string) => {
      if (table === "agent_runs") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: backloggedRuns,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const service = new SystemHealthDiagnosticService({
      supabaseClient: mockSupabase,
      circuitBreaker: mockCircuitBreaker,
      processRegistry: mockProcessRegistry,
    });

    const report = await service.getHealthReport();

    expect(report.status).toBe("degraded");
    expect(report.services.taskQueue.status).toBe("backlogged");
    expect(report.services.taskQueue.queuedRuns).toBe(12);
  });
});
