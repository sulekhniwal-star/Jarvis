import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AgentsConsoleView,
  EnrichedAgentRun,
  formatDuration,
} from "@/components/agents/agents-console-view";

const mockRuns: EnrichedAgentRun[] = [
  {
    id: "run-alpha-12345678",
    task_id: "task-01",
    agent_engine: "aider",
    status: "completed",
    git_commit_hash: "abcdef123456",
    started_at: "2026-11-16T12:00:00Z",
    completed_at: "2026-11-16T12:01:15Z",
    created_at: "2026-11-16T12:00:00Z",
    taskTitle: "Implement Telemetry Viewer",
    projectName: "Jarvis Platform",
    projectSlug: "jarvis-platform",
    durationMs: 75000,
  },
  {
    id: "run-beta-87654321",
    task_id: "task-02",
    agent_engine: "mock",
    status: "running",
    git_commit_hash: null,
    started_at: "2026-11-16T12:10:00Z",
    completed_at: null,
    created_at: "2026-11-16T12:10:00Z",
    taskTitle: "Run Sandbox Diagnostics",
    projectName: "Jarvis Platform",
    projectSlug: "jarvis-platform",
    durationMs: null,
  },
  {
    id: "run-gamma-99887766",
    task_id: "task-03",
    agent_engine: "aider",
    status: "failed",
    git_commit_hash: null,
    started_at: "2026-11-16T12:15:00Z",
    completed_at: "2026-11-16T12:15:20Z",
    created_at: "2026-11-16T12:15:00Z",
    taskTitle: "Database Index Tuning",
    projectName: "Core Services",
    projectSlug: "core-services",
    durationMs: 20000,
  },
];

describe("AgentsConsoleView Component", () => {
  it("formats durations accurately", () => {
    expect(formatDuration(null)).toBe("-");
    expect(formatDuration(undefined)).toBe("-");
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(75000)).toBe("1m 15s");
  });

  it("renders metrics cards with calculated stats", () => {
    render(<AgentsConsoleView initialRuns={mockRuns} />);

    // Total Runs = 3
    expect(screen.getByText("Total Runs")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();

    // Active Executions = 1 (run-beta is running)
    expect(screen.getByText("Active Executions")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();

    // Success Rate = 50% (1 completed, 1 failed out of finished runs)
    expect(screen.getByText("Success Rate")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();

    // Avg Duration = (75000 + 20000) / 2 = 47500ms = 47s
    expect(screen.getByText("Avg Duration")).toBeDefined();
    expect(screen.getByText("47s")).toBeDefined();
  });

  it("renders runs in the table with task title, engine, status, and commit", () => {
    render(<AgentsConsoleView initialRuns={mockRuns} />);

    expect(screen.getByText("Implement Telemetry Viewer")).toBeDefined();
    expect(screen.getByText("Run Sandbox Diagnostics")).toBeDefined();
    expect(screen.getByText("Database Index Tuning")).toBeDefined();

    // Engines
    expect(screen.getAllByText("aider").length).toBe(2);
    expect(screen.getByText("mock")).toBeDefined();

    // Statuses
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("Running")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();

    // Git Commit
    expect(screen.getByText("abcdef1")).toBeDefined();
  });

  it("filters runs dynamically when search input changes", () => {
    render(<AgentsConsoleView initialRuns={mockRuns} />);

    const searchInput = screen.getByPlaceholderText(
      "Search by Run ID, task title, project, commit..."
    );

    fireEvent.change(searchInput, { target: { value: "Telemetry" } });

    expect(screen.getByText("Implement Telemetry Viewer")).toBeDefined();
    expect(screen.queryByText("Run Sandbox Diagnostics")).toBeNull();
    expect(screen.queryByText("Database Index Tuning")).toBeNull();
  });

  it("filters runs by status tabs", () => {
    render(<AgentsConsoleView initialRuns={mockRuns} />);

    // Click "active" tab
    const activeTab = screen.getByRole("tab", { name: /active/i });
    fireEvent.click(activeTab);

    expect(screen.queryByText("Implement Telemetry Viewer")).toBeNull();
    expect(screen.getByText("Run Sandbox Diagnostics")).toBeDefined();
    expect(screen.queryByText("Database Index Tuning")).toBeNull();

    // Click "failed" tab
    const failedTab = screen.getByRole("tab", { name: /failed/i });
    fireEvent.click(failedTab);

    expect(screen.queryByText("Implement Telemetry Viewer")).toBeNull();
    expect(screen.queryByText("Run Sandbox Diagnostics")).toBeNull();
    expect(screen.getByText("Database Index Tuning")).toBeDefined();
  });

  it("shows empty state when no runs match filter", () => {
    render(<AgentsConsoleView initialRuns={mockRuns} />);

    const searchInput = screen.getByPlaceholderText(
      "Search by Run ID, task title, project, commit..."
    );
    fireEvent.change(searchInput, { target: { value: "non-existent-search-term" } });

    expect(screen.getByText("No Agent Runs Found")).toBeDefined();
    expect(
      screen.getByText(
        "No execution runs match your current search and filter criteria."
      )
    ).toBeDefined();
  });
});
