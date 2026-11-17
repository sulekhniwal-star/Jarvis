"use client";

import * as React from "react";
import { EnrichedAgentRun, AgentMetrics } from "@/types/agent-runs";
import { useRealtimeSubscription } from "./use-realtime-subscription";
import { RealtimePayload } from "@/lib/realtime/types";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

export interface UseRealtimeRunsOptions {
  initialRuns?: EnrichedAgentRun[];
  initialMetrics?: AgentMetrics;
  refreshUrl?: string;
  customManager?: RealtimeManager;
}

export function useRealtimeRuns({
  initialRuns = [],
  initialMetrics,
  refreshUrl = "/api/agents/runs",
  customManager,
}: UseRealtimeRunsOptions = {}) {
  const [runs, setRuns] = React.useState<EnrichedAgentRun[]>(initialRuns);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRuns = React.useCallback(async () => {
    try {
      const res = await fetch(refreshUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch agent runs (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data.runs)) {
        setRuns(data.runs);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("[useRealtimeRuns] Polling fetch error:", e.message);
      setError(e.message);
    }
  }, [refreshUrl]);

  const handleRealtimeEvent = React.useCallback(
    (payload: RealtimePayload<EnrichedAgentRun>) => {
      const record = payload.new;
      const oldRecord = payload.old;

      setRuns((prev) => {
        if (payload.eventType === "INSERT") {
          if (prev.some((r) => r.id === record.id)) {
            return prev.map((r) => (r.id === record.id ? { ...r, ...record } : r));
          }
          return [record, ...prev];
        }

        if (payload.eventType === "UPDATE") {
          return prev.map((r) => {
            if (r.id === record.id) {
              return { ...r, ...record };
            }
            return r;
          });
        }

        if (payload.eventType === "DELETE") {
          const targetId = oldRecord?.id || (record as any)?.id;
          return prev.filter((r) => r.id !== targetId);
        }

        return prev;
      });
    },
    []
  );

  const { status, isPolling } = useRealtimeSubscription<EnrichedAgentRun>({
    config: {
      table: "agent_runs",
      fallbackPollingInterval: 12000,
    },
    onEvent: handleRealtimeEvent,
    onPoll: fetchRuns,
    customManager,
  });

  // Calculate live aggregate metrics
  const metrics: AgentMetrics = React.useMemo(() => {
    const totalRuns = runs.length;
    const activeRuns = runs.filter(
      (r) => r.status === "running" || (r.status as string) === "queued"
    ).length;
    const completedRuns = runs.filter((r) => r.status === "completed").length;
    const failedRuns = runs.filter((r) => r.status === "failed").length;

    const finishedRuns = completedRuns + failedRuns;
    const successRate =
      finishedRuns > 0 ? Math.round((completedRuns / finishedRuns) * 100) : 100;

    let totalDurationMs = 0;
    let timedRunsCount = 0;
    for (const r of runs) {
      if (r.durationMs && r.durationMs > 0) {
        totalDurationMs += r.durationMs;
        timedRunsCount++;
      }
    }
    const avgDurationMs =
      timedRunsCount > 0 ? Math.round(totalDurationMs / timedRunsCount) : 0;

    return {
      totalRuns,
      activeRuns,
      completedRuns,
      failedRuns,
      successRate,
      avgDurationMs,
    };
  }, [runs]);

  return {
    runs,
    setRuns,
    metrics,
    status,
    isPolling,
    error,
    refresh: fetchRuns,
  };
}
