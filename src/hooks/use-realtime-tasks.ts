"use client";

import * as React from "react";
import { KanbanTask } from "@/components/projects/kanban-task-card";
import { TaskStatus } from "@/types/database";
import { useRealtimeSubscription } from "./use-realtime-subscription";
import { RealtimePayload } from "@/lib/realtime/types";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

export interface UseRealtimeTasksOptions {
  projectId?: string;
  initialTasks?: KanbanTask[];
  refreshUrl?: string;
  customManager?: RealtimeManager;
}

export function useRealtimeTasks({
  projectId,
  initialTasks = [],
  refreshUrl,
  customManager,
}: UseRealtimeTasksOptions = {}) {
  const [tasks, setTasks] = React.useState<KanbanTask[]>(initialTasks);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  const defaultRefreshUrl = projectId
    ? `/api/projects/${projectId}/tasks`
    : "/api/tasks";
  const effectiveRefreshUrl = refreshUrl || defaultRefreshUrl;

  const fetchTasks = React.useCallback(async () => {
    try {
      const res = await fetch(effectiveRefreshUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch tasks (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("[useRealtimeTasks] Polling fetch error:", e.message);
    }
  }, [effectiveRefreshUrl]);

  const handleRealtimeEvent = React.useCallback(
    (payload: RealtimePayload<KanbanTask>) => {
      const record = payload.new;
      const oldRecord = payload.old;

      setTasks((prev) => {
        if (payload.eventType === "INSERT") {
          // If project scope applies, verify project_id matches
          if (projectId && record.project_id && record.project_id !== projectId) {
            return prev;
          }
          if (prev.some((t) => t.id === record.id)) {
            return prev.map((t) => (t.id === record.id ? { ...t, ...record } : t));
          }
          return [record, ...prev];
        }

        if (payload.eventType === "UPDATE") {
          return prev.map((t) => {
            if (t.id === record.id) {
              return { ...t, ...record };
            }
            return t;
          });
        }

        if (payload.eventType === "DELETE") {
          const targetId = oldRecord?.id || (record as any)?.id;
          return prev.filter((t) => t.id !== targetId);
        }

        return prev;
      });
    },
    [projectId]
  );

  const filter = projectId ? `project_id=eq.${projectId}` : undefined;

  const { status, isPolling } = useRealtimeSubscription<KanbanTask>({
    config: {
      table: "tasks",
      filter,
      fallbackPollingInterval: 12000,
    },
    onEvent: handleRealtimeEvent,
    onPoll: fetchTasks,
    customManager,
  });

  const tasksRef = React.useRef(tasks);
  tasksRef.current = tasks;

  const transitionTaskStatus = React.useCallback(
    async (taskId: string, targetStatus: TaskStatus): Promise<boolean> => {
      setError(null);
      setUpdatingTaskId(taskId);

      // Snapshot previous state synchronously for rollback
      const previousTask = tasksRef.current.find((t) => t.id === taskId);

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return { ...t, status: targetStatus };
          }
          return t;
        })
      );

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to transition task (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.task) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
          );
        }
        return true;
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to update task status");
        // Rollback optimistic update
        if (previousTask) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? previousTask : t))
          );
        }
        return false;
      } finally {
        setUpdatingTaskId(null);
      }
    },
    []
  );

  return {
    tasks,
    setTasks,
    transitionTaskStatus,
    updatingTaskId,
    status,
    isPolling,
    error,
    refresh: fetchTasks,
  };
}
