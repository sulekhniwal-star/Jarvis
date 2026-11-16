import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunHeader } from "@/components/agents/run-header";
import { ExecutionStepTimeline } from "@/components/agents/execution-step-timeline";
import { DiffViewer } from "@/components/agents/diff-viewer";
import { LogViewer } from "@/components/agents/log-viewer";
import { RunArtifactsList } from "@/components/agents/run-artifacts-list";
import { RunTelemetryView } from "@/components/agents/run-telemetry-view";

const sampleRun = {
  id: "12345678-abcd-ef01-2345-6789abcdef01",
  task_id: "task-001",
  agent_engine: "aider",
  status: "completed" as const,
  git_commit_hash: "abcdef1234567890",
  started_at: "2026-11-16T12:00:00Z",
  completed_at: "2026-11-16T12:01:30Z",
  created_at: "2026-11-16T12:00:00Z",
  durationMs: 90000,
  diff_patch: `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
-const oldVar = 1;
+const newVar = 2;
+console.log("added line");
`,
  test_results: {
    passed: 12,
    failed: 0,
    skipped: 1,
    durationMs: 250,
  },
};

const sampleTask = {
  id: "task-001",
  title: "Implement Agent Telemetry Viewer",
  priority: "high",
};

const sampleProject = {
  id: "proj-001",
  name: "Jarvis Autonomous Platform",
  slug: "jarvis-platform",
};

const sampleArtifacts = [
  {
    id: "art-01",
    run_id: sampleRun.id,
    artifact_type: "diff",
    storage_path: "artifacts/runs/run-01/patch.diff",
    file_size_bytes: 2048,
    mime_type: "text/x-diff",
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
];

describe("RunHeader Component", () => {
  it("renders breadcrumbs, run id, status, engine, and linked metadata", () => {
    render(<RunHeader run={sampleRun} task={sampleTask} project={sampleProject} />);

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Agents")).toBeDefined();
    expect(screen.getByText("Run #12345678")).toBeDefined();
    expect(screen.getByText("run-12345678")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("aider")).toBeDefined();
    expect(screen.getByText("Implement Agent Telemetry Viewer")).toBeDefined();
    expect(screen.getByText("Jarvis Autonomous Platform")).toBeDefined();
    expect(screen.getByText("abcdef1")).toBeDefined();
  });
});

describe("ExecutionStepTimeline Component", () => {
  it("renders all 4 stages of execution lifecycle", () => {
    render(
      <ExecutionStepTimeline
        status="completed"
        startedAt={sampleRun.started_at}
        completedAt={sampleRun.completed_at}
      />
    );

    expect(screen.getByText("Stage 1")).toBeDefined();
    expect(screen.getByText("Queued & Scoped")).toBeDefined();
    expect(screen.getByText("Stage 2")).toBeDefined();
    expect(screen.getByText("Agent Execution")).toBeDefined();
    expect(screen.getByText("Stage 3")).toBeDefined();
    expect(screen.getByText("Verification Gate")).toBeDefined();
    expect(screen.getByText("Stage 4")).toBeDefined();
    expect(screen.getByText("Final Disposition")).toBeDefined();
  });

  it("reflects active state for running status", () => {
    render(<ExecutionStepTimeline status="running" />);

    expect(screen.getByText("Active coding agent modifying workspace files")).toBeDefined();
  });

  it("reflects failure message for failed status", () => {
    render(
      <ExecutionStepTimeline
        status="failed"
        errorSummary="Compilation error in module"
      />
    );

    expect(screen.getByText("Failed: Compilation error in module")).toBeDefined();
  });
});

describe("DiffViewer Component", () => {
  it("renders syntax-colored diff with additions and deletions", () => {
    render(
      <DiffViewer
        diffPatch={sampleRun.diff_patch}
        additions={2}
        deletions={1}
        filesCount={1}
        modifiedFiles={["src/index.ts"]}
        riskTier="low"
      />
    );

    expect(screen.getByText("1 file modified")).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
    expect(screen.getByText("-1")).toBeDefined();
    expect(screen.getByText("Low Risk")).toBeDefined();
    expect(screen.getByText("src/index.ts")).toBeDefined();
    expect(screen.getByText("-const oldVar = 1;")).toBeDefined();
    expect(screen.getByText("+const newVar = 2;")).toBeDefined();
  });

  it("shows empty state when no diff patch is available", () => {
    render(<DiffViewer diffPatch={null} />);

    expect(screen.getByText("No Git Diff Available")).toBeDefined();
  });

  it("shows violations banner when quality violations are reported", () => {
    render(
      <DiffViewer
        diffPatch={sampleRun.diff_patch}
        violations={[
          {
            code: "DEBUG_RESIDUE_DETECTED",
            message: "console.log found in src/index.ts",
            severity: "warning",
          },
        ]}
      />
    );

    expect(screen.getByText("Diff Quality Concerns (1)")).toBeDefined();
    expect(screen.getByText(/\[DEBUG_RESIDUE_DETECTED\]/)).toBeDefined();
  });
});

describe("LogViewer Component", () => {
  it("renders terminal logs and filters with search input", () => {
    render(
      <LogViewer
        logs={`[INFO] Task execution initiated
[DEBUG] Resolving workspace paths
[SUCCESS] Build finished`}
      />
    );

    expect(screen.getByText("[INFO] Task execution initiated")).toBeDefined();
    expect(screen.getByText("[DEBUG] Resolving workspace paths")).toBeDefined();

    const searchInput = screen.getByPlaceholderText("Search terminal logs...");
    fireEvent.change(searchInput, { target: { value: "Build" } });

    expect(screen.queryByText("[INFO] Task execution initiated")).toBeNull();
    expect(screen.getByText("[SUCCESS] Build finished")).toBeDefined();
  });

  it("shows empty state when no logs provided", () => {
    render(<LogViewer logs={null} />);

    expect(screen.getByText("No Execution Logs Recorded")).toBeDefined();
  });
});

describe("RunArtifactsList Component", () => {
  it("renders artifact items with size and checksums", () => {
    render(<RunArtifactsList artifacts={sampleArtifacts} />);

    expect(screen.getByText("patch.diff")).toBeDefined();
    expect(screen.getByText("diff")).toBeDefined();
    expect(screen.getByText("2 KB")).toBeDefined();
    expect(
      screen.getByText(/SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/)
    ).toBeDefined();
  });

  it("shows empty state when artifacts array is empty", () => {
    render(<RunArtifactsList artifacts={[]} />);

    expect(screen.getByText("No Artifacts Attached")).toBeDefined();
  });
});

describe("RunTelemetryView Component", () => {
  it("allows tab switching between Diff, Logs, Tests, and Artifacts", () => {
    render(
      <RunTelemetryView
        run={sampleRun}
        task={sampleTask}
        project={sampleProject}
        artifacts={sampleArtifacts}
        diffSummary={{
          additions: 2,
          deletions: 1,
          filesCount: 1,
          modifiedFiles: ["src/index.ts"],
          riskTier: "low",
          violations: [],
          rawPatch: sampleRun.diff_patch,
        }}
      />
    );

    // Initial tab is diff
    expect(screen.getByText("1 file modified")).toBeDefined();

    // Click "Tests" tab
    const testsTab = screen.getByRole("tab", { name: /Test Results/i });
    fireEvent.click(testsTab);

    expect(screen.getByText("Passed")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();

    // Click "Artifacts" tab
    const artifactsTab = screen.getByRole("tab", { name: /Artifacts/i });
    fireEvent.click(artifactsTab);

    expect(screen.getByText("patch.diff")).toBeDefined();

    // Click "Logs" tab
    const logsTab = screen.getByRole("tab", { name: /Execution Logs/i });
    fireEvent.click(logsTab);

    expect(screen.getByPlaceholderText("Search terminal logs...")).toBeDefined();
  });
});
