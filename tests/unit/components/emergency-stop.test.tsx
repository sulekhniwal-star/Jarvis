import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmergencyStopButton } from "@/components/system/emergency-stop-button";
import { EmergencyAlertBanner } from "@/components/system/emergency-alert-banner";
import { Topbar } from "@/components/layout/topbar";
import { KillSwitchResult } from "@/lib/system/kill-switch";

describe("EmergencyStopButton & EmergencyAlertBanner Components", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("EmergencyStopButton", () => {
    it("renders emergency stop trigger button", () => {
      render(<EmergencyStopButton />);
      const btn = screen.getByTestId("emergency-stop-trigger");
      expect(btn).toBeDefined();
    });

    it("opens confirmation modal on click", () => {
      render(<EmergencyStopButton />);
      const triggerBtn = screen.getByTestId("emergency-stop-trigger");
      fireEvent.click(triggerBtn);

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText("Confirm Emergency Stop")).toBeDefined();
      expect(screen.getByText(/Immediate Actions on Execution:/i)).toBeDefined();
    });

    it("closes modal on cancel button click", () => {
      render(<EmergencyStopButton />);
      const triggerBtn = screen.getByTestId("emergency-stop-trigger");
      fireEvent.click(triggerBtn);

      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes modal on Escape key press", () => {
      render(<EmergencyStopButton />);
      const triggerBtn = screen.getByTestId("emergency-stop-trigger");
      fireEvent.click(triggerBtn);

      expect(screen.getByRole("dialog")).toBeDefined();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("posts to /api/system/kill and invokes onStopExecuted on confirmation", async () => {
      const mockResult: KillSwitchResult = {
        terminatedProcessesCount: 2,
        cancelledRunsCount: 1,
        cancelledTasksCount: 3,
        revokedApprovalsCount: 1,
        auditLogId: "audit-abc",
        durationMs: 52,
        subSecondPerformanceAchieved: true,
        source: "web",
        timestamp: "2026-11-17T13:40:00.000Z",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const onStopExecuted = vi.fn();
      render(<EmergencyStopButton onStopExecuted={onStopExecuted} />);

      const triggerBtn = screen.getByTestId("emergency-stop-trigger");
      fireEvent.click(triggerBtn);

      const confirmBtn = screen.getByTestId("confirm-kill-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/system/kill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "web" }),
        });
      });

      await waitFor(() => {
        expect(onStopExecuted).toHaveBeenCalledWith(mockResult);
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });

    it("displays error message if kill request fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Database connection lost" }),
      } as Response);

      render(<EmergencyStopButton />);
      const triggerBtn = screen.getByTestId("emergency-stop-trigger");
      fireEvent.click(triggerBtn);

      const confirmBtn = screen.getByTestId("confirm-kill-button");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText("Database connection lost")).toBeDefined();
      });
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  describe("EmergencyAlertBanner", () => {
    it("returns null when details is null", () => {
      const { container } = render(<EmergencyAlertBanner details={null} onDismiss={() => {}} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders banner content when details are provided", () => {
      const details: KillSwitchResult = {
        terminatedProcessesCount: 4,
        cancelledRunsCount: 2,
        cancelledTasksCount: 5,
        revokedApprovalsCount: 3,
        auditLogId: "audit-999",
        durationMs: 78,
        subSecondPerformanceAchieved: true,
        source: "web",
        timestamp: "2026-11-17T13:40:00.000Z",
      };

      const onDismiss = vi.fn();
      render(<EmergencyAlertBanner details={details} onDismiss={onDismiss} />);

      expect(screen.getByTestId("emergency-alert-banner")).toBeDefined();
      expect(screen.getByText(/Emergency Stop Executed:/i)).toBeDefined();
      expect(screen.getByText(/All agent processes terminated \(4\)/i)).toBeDefined();
      expect(screen.getByText(/⚡ 78ms \(web\)/i)).toBeDefined();

      const dismissBtn = screen.getByRole("button", { name: /Dismiss emergency alert/i });
      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Topbar Integration", () => {
    it("mounts EmergencyStopButton in Topbar", () => {
      render(<Topbar onOpenMobileNav={() => {}} title="Dashboard" />);
      const btn = screen.getByTestId("emergency-stop-trigger");
      expect(btn).toBeDefined();
    });
  });
});
