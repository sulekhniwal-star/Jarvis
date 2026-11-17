import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram Bot /health Command (REQ-OPS-02)", () => {
  let mockHealthService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockHealthService = {
      getHealthReport: vi.fn().mockResolvedValue({
        status: "healthy",
        timestamp: "2026-11-17T12:00:00.000Z",
        uptimeSeconds: 3665,
        durationMs: 16,
        services: {
          database: {
            status: "healthy",
            latencyMs: 14,
          },
          aiGateway: {
            status: "healthy",
            provider: "OpenRouter",
            circuitBreakerState: "CLOSED",
          },
          taskQueue: {
            status: "healthy",
            activeRuns: 1,
            queuedRuns: 0,
          },
          system: {
            status: "healthy",
            memory: {
              heapUsedMb: 45.2,
            },
            activeChildProcesses: 2,
          },
        },
      }),
    };
  });

  it("lists /health in /start command output", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("/health");
  });

  it("formats real-time diagnostics into MarkdownV2 on /health", async () => {
    const response = await handleTelegramCommand("/health", {
      healthService: mockHealthService,
    });

    expect(response).toContain("SYSTEM OPERATIONAL");
    expect(response).toContain("16ms");
    expect(response).toContain("1h 1m");
    expect(response).toContain("OpenRouter");
    expect(response).toContain("45\\.2 MB");
    expect(response).toContain("2 procs");
    expect(response).toContain("14ms");
  });

  it("handles degraded state with notice message", async () => {
    mockHealthService.getHealthReport.mockResolvedValue({
      status: "degraded",
      timestamp: "2026-11-17T12:00:00.000Z",
      uptimeSeconds: 120,
      durationMs: 175,
      services: {
        database: {
          status: "degraded",
          latencyMs: 170,
          error: "High database latency: 170ms",
        },
        aiGateway: {
          status: "healthy",
          provider: "OpenRouter",
          circuitBreakerState: "CLOSED",
        },
        taskQueue: {
          status: "healthy",
          activeRuns: 0,
          queuedRuns: 0,
        },
        system: {
          status: "healthy",
          memory: { heapUsedMb: 30 },
          activeChildProcesses: 0,
        },
      },
    });

    const response = await handleTelegramCommand("/health", {
      healthService: mockHealthService,
    });

    expect(response).toContain("PERFORMANCE DEGRADED");
    expect(response).toContain("DB Notice");
    expect(response).toContain("High database latency");
  });

  it("returns error message when diagnostic service fails", async () => {
    mockHealthService.getHealthReport.mockRejectedValue(
      new Error("Probe network timeout")
    );

    const response = await handleTelegramCommand("/health", {
      healthService: mockHealthService,
    });

    expect(response).toContain("Health Diagnostic Failed");
    expect(response).toContain("Probe network timeout");
  });
});
