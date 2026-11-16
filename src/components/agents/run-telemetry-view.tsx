"use client";

import * as React from "react";
import {
  FileCode,
  Terminal,
  ShieldCheck,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { RunHeader } from "./run-header";
import { ExecutionStepTimeline, RunStatus } from "./execution-step-timeline";
import { DiffViewer } from "./diff-viewer";
import { LogViewer } from "./log-viewer";
import { RunArtifactsList, RunArtifactItem } from "./run-artifacts-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TestResultsSummary {
  passed?: number;
  failed?: number;
  skipped?: number;
  durationMs?: number;
  rawOutput?: string;
}

export interface RunTelemetryViewProps {
  run: {
    id: string;
    task_id: string;
    agent_engine: string;
    status: RunStatus;
    git_commit_hash?: string | null;
    exit_code?: number | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    diff_patch?: string | null;
    error_summary?: string | null;
    durationMs?: number | null;
    test_results?: TestResultsSummary | null;
  };
  task?: {
    id: string;
    title: string;
    priority?: string;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  artifacts?: RunArtifactItem[];
  diffSummary?: {
    additions?: number;
    deletions?: number;
    filesCount?: number;
    modifiedFiles?: string[];
    riskTier?: string;
    violations?: Array<{
      code: string;
      message: string;
      file?: string;
      severity: "blocker" | "warning";
    }>;
    rawPatch?: string | null;
  } | null;
}

export function RunTelemetryView({
  run,
  task,
  project,
  artifacts = [],
  diffSummary,
}: RunTelemetryViewProps) {
  const [activeTab, setActiveTab] = React.useState<
    "diff" | "logs" | "tests" | "artifacts"
  >("diff");

  const diffPatch = diffSummary?.rawPatch || run.diff_patch || null;

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb and Meta */}
      <RunHeader run={run} task={task} project={project} />

      {/* Execution Stepper Timeline */}
      <ExecutionStepTimeline
        status={run.status}
        startedAt={run.started_at}
        completedAt={run.completed_at}
        errorSummary={run.error_summary}
        gitCommitHash={run.git_commit_hash}
      />

      {/* Main Tabbed Telemetry Section */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-2 border-b border-surface-3 pb-2 overflow-x-auto"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={activeTab === "diff"}
            onClick={() => setActiveTab("diff")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "diff"
                ? "bg-accent-cyan text-surface-base font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <FileCode className="w-4 h-4" />
            Diff Inspector
            {diffSummary &&
              ((diffSummary.additions ?? 0) > 0 || (diffSummary.deletions ?? 0) > 0) && (
                <span className="font-mono text-[10px] ml-0.5">
                  (+{diffSummary.additions ?? 0}/-{diffSummary.deletions ?? 0})
                </span>
              )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "logs"}
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "logs"
                ? "bg-accent-cyan text-surface-base font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Execution Logs
            {run.error_summary && (
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block animate-ping" />
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "tests"}
            onClick={() => setActiveTab("tests")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "tests"
                ? "bg-accent-cyan text-surface-base font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Test Results
            {run.test_results && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 bg-surface-2 border-surface-3 font-mono"
              >
                {run.test_results.passed ?? 0} pass
              </Badge>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "artifacts"}
            onClick={() => setActiveTab("artifacts")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "artifacts"
                ? "bg-accent-cyan text-surface-base font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <FileArchive className="w-4 h-4" />
            Artifacts
            {artifacts.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 bg-surface-2 border-surface-3 font-mono"
              >
                {artifacts.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === "diff" && (
          <DiffViewer
            diffPatch={diffPatch}
            additions={diffSummary?.additions}
            deletions={diffSummary?.deletions}
            filesCount={diffSummary?.filesCount}
            modifiedFiles={diffSummary?.modifiedFiles}
            riskTier={diffSummary?.riskTier}
            violations={diffSummary?.violations}
          />
        )}

        {activeTab === "logs" && (
          <LogViewer
            logs={diffPatch ? null : undefined}
            errorSummary={run.error_summary}
            testResults={run.test_results}
          />
        )}

        {activeTab === "tests" && (
          <div className="space-y-4">
            {run.test_results ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border-surface-3 bg-surface-1">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono text-text-secondary uppercase">
                        Passed
                      </p>
                      <h4 className="text-xl font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {run.test_results.passed ?? 0}
                      </h4>
                    </CardContent>
                  </Card>

                  <Card className="border-surface-3 bg-surface-1">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono text-text-secondary uppercase">
                        Failed
                      </p>
                      <h4 className="text-xl font-bold text-rose-400 mt-1 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {run.test_results.failed ?? 0}
                      </h4>
                    </CardContent>
                  </Card>

                  <Card className="border-surface-3 bg-surface-1">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono text-text-secondary uppercase">
                        Skipped
                      </p>
                      <h4 className="text-xl font-bold text-text-secondary mt-1">
                        {run.test_results.skipped ?? 0}
                      </h4>
                    </CardContent>
                  </Card>

                  <Card className="border-surface-3 bg-surface-1">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-mono text-text-secondary uppercase">
                        Duration
                      </p>
                      <h4 className="text-xl font-bold text-amber-400 mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" />
                        {run.test_results.durationMs ?? 0}ms
                      </h4>
                    </CardContent>
                  </Card>
                </div>

                {run.test_results.rawOutput && (
                  <div className="border border-surface-3 rounded-lg overflow-hidden bg-surface-base font-mono text-xs p-3">
                    <pre className="text-text-secondary whitespace-pre-wrap">
                      {run.test_results.rawOutput}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface-1 border border-surface-3 rounded-lg">
                <ShieldCheck className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-semibold text-text-primary">
                  No Test Results Recorded
                </h4>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  No automated unit or integration test suite was executed for this run step.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "artifacts" && (
          <RunArtifactsList artifacts={artifacts} />
        )}
      </div>
    </div>
  );
}
