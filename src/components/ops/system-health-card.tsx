"use client";

import * as React from "react";
import {
  Activity,
  Database,
  Cpu,
  Layers,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { SystemHealthReport, HealthCheckStatus } from "@/lib/ops/health-checker";
import { Badge } from "@/components/ui/badge";

export interface SystemHealthCardProps {
  initialReport?: SystemHealthReport | null;
  pollingIntervalMs?: number;
}

export function SystemHealthCard({
  initialReport = null,
  pollingIntervalMs = 0,
}: SystemHealthCardProps) {
  const [report, setReport] = React.useState<SystemHealthReport | null>(initialReport);
  const [isLoading, setIsLoading] = React.useState(!initialReport);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHealth = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/health");
      const data: SystemHealthReport = await res.json();
      setReport(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to inspect system health.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      setIsLoading(false);
    } else {
      fetchHealth();
    }
  }, [initialReport, fetchHealth]);

  React.useEffect(() => {
    if (pollingIntervalMs <= 0) return;
    const interval = setInterval(fetchHealth, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [pollingIntervalMs, fetchHealth]);

  const getOverallBadge = (status?: HealthCheckStatus) => {
    switch (status) {
      case "healthy":
        return (
          <Badge variant="success" pulse>
            System Operational
          </Badge>
        );
      case "degraded":
        return (
          <Badge variant="warning" pulse>
            Performance Degraded
          </Badge>
        );
      case "unhealthy":
        return (
          <Badge variant="danger" pulse>
            Service Disrupted
          </Badge>
        );
      default:
        return <Badge variant="outline">Inspecting...</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div
      className="rounded-xl border border-surface-3 bg-surface-1 p-5 shadow-sm space-y-4"
      data-testid="system-health-card"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              System Health & Diagnostics
            </h3>
            <p className="text-xs text-text-secondary font-mono">
              REQ-OPS-02 • Non-blocking probe {report ? `(${report.durationMs}ms)` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getOverallBadge(report?.status)}
          <button
            type="button"
            onClick={fetchHealth}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
            title="Re-run health diagnostics"
            aria-label="Refresh health diagnostics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Database Latency */}
          <div
            className="p-3.5 rounded-lg bg-surface-2/40 border border-surface-3 space-y-2"
            data-testid="health-tile-database"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-text-secondary flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent-cyan" />
                Postgres Latency
              </span>
              <Badge
                variant={
                  report?.services.database.status === "healthy"
                    ? "success"
                    : report?.services.database.status === "degraded"
                    ? "warning"
                    : "danger"
                }
              >
                {report?.services.database.status || "—"}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {report ? `${report.services.database.latencyMs}ms` : "—"}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                Target: &lt; 150ms
              </span>
            </div>
          </div>

          {/* AI Gateway Status */}
          <div
            className="p-3.5 rounded-lg bg-surface-2/40 border border-surface-3 space-y-2"
            data-testid="health-tile-ai"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-text-secondary flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent-ice" />
                AI Gateway
              </span>
              <Badge
                variant={
                  report?.services.aiGateway.status === "healthy"
                    ? "success"
                    : report?.services.aiGateway.status === "degraded"
                    ? "warning"
                    : "danger"
                }
              >
                {report?.services.aiGateway.circuitBreakerState || "—"}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold text-text-primary truncate">
                {report?.services.aiGateway.provider || "OpenRouter"}
              </span>
              <span className="text-[10px] font-mono text-text-secondary truncate max-w-[100px]">
                {report?.services.aiGateway.defaultModel || "free tier"}
              </span>
            </div>
          </div>

          {/* Task Queue Depth */}
          <div
            className="p-3.5 rounded-lg bg-surface-2/40 border border-surface-3 space-y-2"
            data-testid="health-tile-queue"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-text-secondary flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                Task Queue
              </span>
              <Badge
                variant={
                  report?.services.taskQueue.status === "healthy"
                    ? "cyan"
                    : "warning"
                }
              >
                {report?.services.taskQueue.status === "healthy"
                  ? "Nominal"
                  : "Backlogged"}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-lg font-bold font-mono text-text-primary">
                {report ? `${report.services.taskQueue.activeRuns} active` : "—"}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                {report ? `${report.services.taskQueue.queuedRuns} queued` : ""}
              </span>
            </div>
          </div>

          {/* System Runtime & Memory */}
          <div
            className="p-3.5 rounded-lg bg-surface-2/40 border border-surface-3 space-y-2"
            data-testid="health-tile-system"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-text-secondary flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-accent-ice" />
                Heap & Processes
              </span>
              <Badge variant="outline">
                {report ? formatUptime(report.uptimeSeconds) : "—"}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold font-mono text-text-primary">
                {report ? `${report.services.system.memory.heapUsedMb} MB` : "—"}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                {report
                  ? `${report.services.system.activeChildProcesses} procs`
                  : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
