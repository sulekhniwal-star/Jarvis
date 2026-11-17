"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bot,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  ArrowUpRight,
  GitCommit,
  Cpu,
  Folder,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentRunStatus, Json } from "@/types/database";
import { EnrichedAgentRun, AgentMetrics } from "@/types/agent-runs";
import { useRealtimeRuns } from "@/hooks/use-realtime-runs";

export type { EnrichedAgentRun, AgentMetrics };

export interface AgentsConsoleViewProps {
  initialRuns?: EnrichedAgentRun[];
  initialMetrics?: AgentMetrics;
  refreshUrl?: string;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return "-";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function AgentsConsoleView({
  initialRuns = [],
  initialMetrics,
  refreshUrl = "/api/agents/runs",
}: AgentsConsoleViewProps) {
  const {
    runs,
    setRuns,
    metrics,
    refresh: fetchRuns,
    error: realtimeError,
  } = useRealtimeRuns({
    initialRuns,
    initialMetrics,
    refreshUrl,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchRuns();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered runs
  const filteredRuns = React.useMemo(() => {
    return runs.filter((run) => {
      const matchesSearch =
        run.id.toLowerCase().includes(search.toLowerCase()) ||
        (run.taskTitle && run.taskTitle.toLowerCase().includes(search.toLowerCase())) ||
        (run.projectName && run.projectName.toLowerCase().includes(search.toLowerCase())) ||
        (run.git_commit_hash &&
          run.git_commit_hash.toLowerCase().includes(search.toLowerCase())) ||
        run.agent_engine.toLowerCase().includes(search.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus =
          run.status === "queued" ||
          run.status === "running" ||
          run.status === "verifying";
      } else if (statusFilter === "failed") {
        matchesStatus = run.status === "failed" || run.status === "timed_out";
      } else if (statusFilter !== "all") {
        matchesStatus = run.status.toLowerCase() === statusFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus;
    });
  }, [runs, search, statusFilter]);

  const renderStatusBadge = (status: EnrichedAgentRun["status"]) => {
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
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "verifying":
        return (
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Verifying
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "timed_out":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Timed Out
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-accent-cyan" aria-hidden="true" />
            Agent Operations Console
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Monitor autonomous agent execution runs, step timelines, diffs, and verification artifacts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchRuns()}
            disabled={isLoading}
            aria-label="Refresh agent runs"
            className="border-surface-3 bg-surface-2 hover:bg-surface-3 text-text-primary"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Runs */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Total Runs
              </p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {metrics.totalRuns}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-surface-3 flex items-center justify-center text-text-secondary">
              <Terminal className="w-5 h-5 text-accent-cyan" />
            </div>
          </CardContent>
        </Card>

        {/* Active Executions */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Active Executions
              </p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">
                {metrics.activeRuns}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Success Rate
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics.successRate}%
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Avg Duration
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {formatDuration(metrics.avgDurationMs)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-surface-1 p-3 rounded-lg border border-surface-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by Run ID, task title, project, commit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded-md text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            aria-label="Search agent runs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {["all", "active", "completed", "failed"].map((st) => (
            <button
              key={st}
              role="tab"
              aria-selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? "bg-accent-cyan text-surface-base font-semibold"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3 border border-surface-3"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Runs Table / List */}
      {filteredRuns.length === 0 ? (
        <Card className="border-surface-3 bg-surface-1 text-center py-12">
          <CardContent className="flex flex-col items-center">
            <Bot className="w-12 h-12 text-text-secondary mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-text-primary">
              No Agent Runs Found
            </h3>
            <p className="text-sm text-text-secondary max-w-sm mt-1">
              {search || statusFilter !== "all"
                ? "No execution runs match your current search and filter criteria."
                : "Autonomous agent execution runs, telemetry, and git diffs will appear here once tasks are dispatched."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-surface-3 rounded-lg overflow-hidden bg-surface-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-secondary uppercase text-[10px] tracking-wider border-b border-surface-3">
                <tr>
                  <th className="py-3 px-4 font-semibold">Run ID</th>
                  <th className="py-3 px-4 font-semibold">Task & Project</th>
                  <th className="py-3 px-4 font-semibold">Engine</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Duration</th>
                  <th className="py-3 px-4 font-semibold">Commit</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {filteredRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="hover:bg-surface-2/60 transition-colors group"
                  >
                    {/* Run ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-accent-cyan bg-surface-2 px-1.5 py-0.5 rounded border border-surface-3">
                        {run.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* Task & Project */}
                    <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                      <div className="truncate font-medium text-text-primary text-xs sm:text-sm">
                        {run.taskTitle || "Task Execution"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5 truncate">
                        <Folder className="w-3 h-3 text-text-secondary/70 shrink-0" />
                        <span className="truncate">{run.projectName || "Default Project"}</span>
                      </div>
                    </td>

                    {/* Engine */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="bg-surface-2 border-surface-3 text-text-secondary text-[11px] font-mono flex items-center gap-1 w-fit"
                      >
                        <Cpu className="w-3 h-3 text-accent-cyan" />
                        {run.agent_engine}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(run.status)}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-text-secondary font-mono">
                      {formatDuration(run.durationMs)}
                    </td>

                    {/* Commit */}
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      {run.git_commit_hash ? (
                        <span className="font-mono text-xs text-text-secondary flex items-center gap-1 bg-surface-2 px-1.5 py-0.5 rounded border border-surface-3 w-fit">
                          <GitCommit className="w-3 h-3 text-accent-cyan" />
                          {run.git_commit_hash.slice(0, 7)}
                        </span>
                      ) : (
                        <span className="text-text-secondary/50 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <Link
                        href={`/agents/runs/${run.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent-cyan hover:underline bg-surface-2 hover:bg-surface-3 px-2.5 py-1 rounded-md border border-surface-3 transition-colors"
                      >
                        Telemetry
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
