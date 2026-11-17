import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecommendationsCard } from "@/components/advisory/recommendations-card";
import { AdvisoryReport } from "@/lib/advisory/types";

describe("RecommendationsCard Component (REQ-OPS-04, REQ-OPS-05)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockReport: AdvisoryReport = {
    timestamp: "2026-11-17T12:00:00.000Z",
    totalRecommendations: 2,
    criticalCount: 1,
    warningCount: 1,
    infoCount: 0,
    recommendations: [
      {
        id: "rec-branch-1",
        category: "branch_safety",
        severity: "critical",
        title: "Branch Hygiene Violation",
        description: "Extraneous branch feature-test detected.",
        rationale: "Main-only branch discipline must be upheld.",
        detectedAt: "2026-11-17T12:00:00.000Z",
        remediation: {
          type: "clean_extraneous_branches",
          label: "Prune Extraneous Branches",
          description: "Deletes non-main local branches.",
        },
      },
      {
        id: "rec-cost-1",
        category: "cost_budget",
        severity: "warning",
        title: "Budget Burn Warning (85%)",
        description: "Today's spend is ₹85 / ₹100.",
        rationale: "Prevents automated daily cap trip.",
        detectedAt: "2026-11-17T12:00:00.000Z",
      },
    ],
  };

  it("renders empty nominal state when zero recommendations exist", () => {
    render(
      <RecommendationsCard
        initialReport={{
          timestamp: "2026-11-17T12:00:00.000Z",
          totalRecommendations: 0,
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
          recommendations: [],
        }}
      />
    );

    expect(
      screen.getByText("All Systems Nominal — Zero Maintenance Warnings")
    ).toBeDefined();
  });

  it("renders recommendations with severity badges and rationale", () => {
    render(<RecommendationsCard initialReport={mockReport} />);

    expect(screen.getByText("Proactive Maintenance & Advisory Engine")).toBeDefined();
    expect(screen.getByText("Branch Hygiene Violation")).toBeDefined();
    expect(screen.getByText("Budget Burn Warning (85%)")).toBeDefined();
    expect(screen.getByText("1 Critical")).toBeDefined();
    expect(screen.getByText("1 Warning")).toBeDefined();
    expect(screen.getByText("Prune Extraneous Branches")).toBeDefined();
  });

  it("executes 1-click remediation action on button click", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/advisory/remediate") {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            actionType: "clean_extraneous_branches",
            message: "Branch hygiene restored: Deleted 1 extraneous branch.",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({
          timestamp: "2026-11-17T12:00:00.000Z",
          totalRecommendations: 1,
          criticalCount: 0,
          warningCount: 1,
          infoCount: 0,
          recommendations: [mockReport.recommendations[1]],
        }),
      });
    });

    render(<RecommendationsCard initialReport={mockReport} />);

    const remediateButton = screen.getByRole("button", {
      name: /prune extraneous branches/i,
    });
    fireEvent.click(remediateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/advisory/remediate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            actionType: "clean_extraneous_branches",
            params: {},
          }),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Branch hygiene restored: Deleted 1 extraneous branch/i)
      ).toBeDefined();
    });
  });

  it("dismisses recommendation locally when dismiss button is clicked", () => {
    render(<RecommendationsCard initialReport={mockReport} />);

    expect(screen.getByText("Budget Burn Warning (85%)")).toBeDefined();

    const dismissButtons = screen.getAllByTitle("Dismiss recommendation");
    expect(dismissButtons.length).toBeGreaterThan(0);
    fireEvent.click(dismissButtons[1]!);

    expect(screen.queryByText("Budget Burn Warning (85%)")).toBeNull();
  });

  it("displays error banner when remediation action fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: "Failed to acquire lock for branch deletion",
      }),
    });

    render(<RecommendationsCard initialReport={mockReport} />);

    const remediateButton = screen.getByRole("button", {
      name: /prune extraneous branches/i,
    });
    fireEvent.click(remediateButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to acquire lock for branch deletion")
      ).toBeDefined();
    });
  });
});
