"use client";

import * as React from "react";
import {
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitCommit,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface AgentRunItem {
  id: string;
  task_id: string;
  agent_engine: string;
  status: "queued" | "running" | "completed" | "failed";
  git_commit_hash?: string | null;
  exit_code?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  test_results?: {
    passed?: number;
    failed?: number;
    skipped?: number;
    durationMs?: number;
  } | null;
  error_summary?: string | null;
}

export interface AgentRunsCardProps {
  initialRuns?: AgentRunItem[];
  refreshUrl?: string;
}

export function AgentRunsCard({
  initialRuns,
  refreshUrl = "/api/agents/runs",
}: AgentRunsCardProps) {
  const [runs, setRuns] = React.useState<AgentRunItem[]>(initialRuns ?? []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRuns = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(refreshUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch agent runs (HTTP ${res.status})`);
      }
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUrl]);

  React.useEffect(() => {
    if (!initialRuns) {
      void fetchRuns();
    }
  }, [initialRuns, fetchRuns]);

  const getStatusBadge = (status: AgentRunItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "queued":
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Queued
          </Badge>
        );
    }
  };

  const calculateDuration = (run: AgentRunItem) => {
    if (!run.started_at) return null;
    const start = new Date(run.started_at).getTime();
    const end = run.completed_at ? new Date(run.completed_at).getTime() : Date.now();
    const sec = Math.max(0, Math.round((end - start) / 1000));
    return `${sec}s`;
  };

  return (
    <Card className="border-surface-3 bg-surface-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent-primary" />
          <CardTitle className="text-base font-semibold text-text-primary">
            Execution Runs & Telemetry
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchRuns()}
          disabled={isLoading}
          aria-label="Refresh agent runs"
          className="h-8 px-2.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
            {error}
          </div>
        )}

        {runs.length === 0 ? (
          <div className="py-8 text-center">
            <Terminal className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
            <p className="text-xs font-medium text-text-secondary">
              No agent runs recorded
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Executions initiated via approved tasks will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map((run) => {
              const duration = calculateDuration(run);
              const tests = run.test_results;

              return (
                <div
                  key={run.id}
                  className="p-3 rounded-lg border border-surface-3 bg-surface-2/50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(run.status)}
                      <span className="text-xs font-mono text-text-muted">
                        {run.id.slice(0, 8)}
                      </span>
                    </div>
                    {duration && (
                      <span className="text-xs text-text-muted">
                        ⏱️ {duration}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-muted">
                        Task: {run.task_id.slice(0, 8)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-3 text-text-muted">
                        {run.agent_engine}
                      </span>
                    </div>

                    {run.git_commit_hash && (
                      <div className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                        <GitCommit className="w-3 h-3" />
                        <span>{run.git_commit_hash.slice(0, 7)}</span>
                        <Lock className="w-2.5 h-2.5 text-emerald-500 ml-0.5" />
                      </div>
                    )}
                  </div>

                  {tests && (
                    <div className="text-[11px] text-text-muted border-t border-surface-3 pt-1.5 flex items-center justify-between">
                      <span>
                        Tests:{" "}
                        <strong className="text-emerald-400">
                          {tests.passed ?? 0} passed
                        </strong>
                        {tests.failed ? (
                          <strong className="text-rose-400 ml-1.5">
                            , {tests.failed} failed
                          </strong>
                        ) : null}
                      </span>
                      {tests.durationMs ? (
                        <span>{tests.durationMs}ms</span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
