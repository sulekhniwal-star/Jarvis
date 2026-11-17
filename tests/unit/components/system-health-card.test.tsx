import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SystemHealthCard } from "@/components/ops/system-health-card";
import { SystemHealthReport } from "@/lib/ops/health-checker";

describe("SystemHealthCard Component (REQ-OPS-02)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockHealthyReport: SystemHealthReport = {
    status: "healthy",
    timestamp: "2026-11-17T12:00:00.000Z",
    uptimeSeconds: 7200,
    durationMs: 14,
    services: {
      database: {
        status: "healthy",
        latencyMs: 12,
      },
      aiGateway: {
        status: "healthy",
        provider: "OpenRouter",
        defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
        circuitBreakerState: "CLOSED",
      },
      taskQueue: {
        status: "healthy",
        activeRuns: 1,
        queuedRuns: 0,
        totalPendingTasks: 2,
      },
      system: {
        status: "healthy",
        memory: {
          heapUsedMb: 42.5,
          heapTotalMb: 95.0,
          rssMb: 110.2,
          heapUtilizationPercent: 45,
        },
        activeChildProcesses: 1,
        uptimeSeconds: 7200,
        nodeVersion: "v20.0.0",
        platform: "win32",
      },
    },
  };

  it("renders healthy operational status and 4 telemetry tiles", () => {
    render(<SystemHealthCard initialReport={mockHealthyReport} />);

    expect(screen.getByText("System Operational")).toBeDefined();
    expect(screen.getByText("12ms")).toBeDefined();
    expect(screen.getByText("OpenRouter")).toBeDefined();
    expect(screen.getByText("1 active")).toBeDefined();
    expect(screen.getByText("42.5 MB")).toBeDefined();
    expect(screen.getByText("2h 0m")).toBeDefined();
  });

  it("renders degraded and service disrupted badges when status drops", () => {
    const degradedReport: SystemHealthReport = {
      ...mockHealthyReport,
      status: "degraded",
      services: {
        ...mockHealthyReport.services,
        database: {
          status: "degraded",
          latencyMs: 180,
          error: "High latency",
        },
      },
    };

    const { rerender } = render(<SystemHealthCard initialReport={degradedReport} />);
    expect(screen.getByText("Performance Degraded")).toBeDefined();
    expect(screen.getByText("180ms")).toBeDefined();

    const unhealthyReport: SystemHealthReport = {
      ...mockHealthyReport,
      status: "unhealthy",
      services: {
        ...mockHealthyReport.services,
        database: {
          status: "unhealthy",
          latencyMs: 0,
          error: "Connection refused",
        },
      },
    };

    rerender(<SystemHealthCard initialReport={unhealthyReport} />);
    expect(screen.getByText("Service Disrupted")).toBeDefined();
  });

  it("triggers diagnostic re-fetch when refresh button is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealthyReport,
    });

    render(<SystemHealthCard initialReport={mockHealthyReport} />);

    const refreshBtn = screen.getByLabelText("Refresh health diagnostics");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/health");
    });
  });
});
