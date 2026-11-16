import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  AgentRunsCard,
  AgentRunItem,
} from "@/components/dashboard/agent-runs-card";

describe("AgentRunsCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRuns: AgentRunItem[] = [
    {
      id: "11112222-3333-4444-5555-666677778888",
      task_id: "aaaabbbb-cccc-dddd-eeee-ffff00001111",
      agent_engine: "aider",
      status: "completed",
      git_commit_hash: "abcdef1234567890abcdef",
      exit_code: 0,
      started_at: "2026-11-16T09:00:00Z",
      completed_at: "2026-11-16T09:00:45Z",
      created_at: "2026-11-16T09:00:00Z",
      test_results: {
        passed: 12,
        failed: 0,
        skipped: 0,
        durationMs: 850,
      },
    },
    {
      id: "22223333-4444-5555-6666-777788889999",
      task_id: "bbbbcccc-dddd-eeee-ffff-000011112222",
      agent_engine: "aider",
      status: "running",
      started_at: new Date(Date.now() - 30000).toISOString(),
      created_at: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: "33334444-5555-6666-7777-888899990000",
      task_id: "ccccdddd-eeee-ffff-0000-111122223333",
      agent_engine: "aider",
      status: "failed",
      exit_code: 1,
      started_at: "2026-11-16T08:30:00Z",
      completed_at: "2026-11-16T08:31:00Z",
      created_at: "2026-11-16T08:30:00Z",
      error_summary: "Tests failed on attempt 3",
      test_results: {
        passed: 2,
        failed: 3,
        skipped: 0,
        durationMs: 500,
      },
    },
  ];

  it("renders card title and run items with correct badges and metrics", () => {
    render(<AgentRunsCard initialRuns={mockRuns} />);

    expect(screen.getByText("Execution Runs & Telemetry")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    // Commit hash badge
    expect(screen.getByText("abcdef1")).toBeInTheDocument();

    // Test metrics
    expect(screen.getByText(/12 passed/)).toBeInTheDocument();
    expect(screen.getByText(/, 3 failed/)).toBeInTheDocument();
  });

  it("renders empty state when no runs are present", () => {
    render(<AgentRunsCard initialRuns={[]} />);

    expect(screen.getByText("No agent runs recorded")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Executions initiated via approved tasks will appear here."
      )
    ).toBeInTheDocument();
  });

  it("refreshes runs when clicking the refresh button", async () => {
    const updatedRuns: AgentRunItem[] = [
      {
        ...mockRuns[0],
        id: "99998888-7777-6666-5555-444433332222",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runs: updatedRuns }),
    });
    global.fetch = mockFetch;

    render(
      <AgentRunsCard initialRuns={mockRuns} refreshUrl="/api/agents/runs" />
    );

    const refreshButton = screen.getByRole("button", {
      name: /refresh agent runs/i,
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/runs");
    });

    await waitFor(() => {
      expect(screen.getByText("99998888")).toBeInTheDocument();
    });
  });

  it("handles fetch errors gracefully and shows error message", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection error"));
    global.fetch = mockFetch;

    render(<AgentRunsCard refreshUrl="/api/agents/runs" />);

    await waitFor(() => {
      expect(screen.getByText("Network connection error")).toBeInTheDocument();
    });
  });
});
