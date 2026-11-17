import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MaintenanceControlCard } from "@/components/ops/maintenance-control-card";

describe("MaintenanceControlCard Component (REQ-OPS-03, NFR-SEC-04)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders storage pruning metrics and branch safety compliance badge", () => {
    render(
      <MaintenanceControlCard
        initialReport={{
          lastRun: "2026-11-17T10:00:00.000Z",
          bytesReclaimed: 15 * 1024 * 1024,
          artifactsPruned: 8,
          approvalsExpired: 3,
          tempFilesCleaned: 2,
        }}
      />
    );

    expect(
      screen.getByText("Automated Storage Pruning & Branch Hygiene")
    ).toBeDefined();
    expect(
      screen.getByText("Branch Hygiene: Main-Only Locked")
    ).toBeDefined();
    expect(screen.getByText("30 Days")).toBeDefined();
    expect(screen.getByText("15.00 MB")).toBeDefined();
    expect(screen.getByText("3 Expired")).toBeDefined();
    expect(screen.getByText("Compliant")).toBeDefined();
  });

  it("triggers live pruning maintenance when button is clicked", async () => {
    const mockResponse = {
      success: true,
      timestamp: "2026-11-17T11:00:00.000Z",
      durationMs: 45,
      isDryRun: false,
      artifactsPruned: 5,
      bytesReclaimed: 10 * 1024 * 1024,
      approvalsExpired: 2,
      tempFilesCleaned: 1,
      errors: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    render(<MaintenanceControlCard />);

    const runButton = screen.getByRole("button", {
      name: /run pruning maintenance/i,
    });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/maintenance/prune",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ retentionDays: 30, dryRun: false }),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Live maintenance complete: 5 artifacts pruned/i)
      ).toBeDefined();
    });
  });

  it("triggers dry-run simulation when Simulate Dry-Run button is clicked", async () => {
    const mockResponse = {
      success: true,
      timestamp: "2026-11-17T11:00:00.000Z",
      durationMs: 25,
      isDryRun: true,
      artifactsPruned: 12,
      bytesReclaimed: 24 * 1024 * 1024,
      approvalsExpired: 4,
      tempFilesCleaned: 0,
      errors: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    render(<MaintenanceControlCard />);

    const dryRunButton = screen.getByRole("button", {
      name: /simulate dry-run/i,
    });
    fireEvent.click(dryRunButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/maintenance/prune",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ retentionDays: 30, dryRun: true }),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Dry-run simulation complete: 12 artifacts pruned/i)
      ).toBeDefined();
    });
  });

  it("renders error alert when pruning request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: "Database connection failed" }),
    });

    render(<MaintenanceControlCard />);

    const runButton = screen.getByRole("button", {
      name: /run pruning maintenance/i,
    });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText("Database connection failed")).toBeDefined();
    });
  });
});
