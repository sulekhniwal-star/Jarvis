"use client";

import * as React from "react";
import { PendingApprovalItem } from "@/components/dashboard/pending-approvals-card";
import { useRealtimeSubscription } from "./use-realtime-subscription";
import { RealtimePayload } from "@/lib/realtime/types";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

export interface UseRealtimeApprovalsOptions {
  initialApprovals?: PendingApprovalItem[];
  refreshUrl?: string;
  customManager?: RealtimeManager;
}

export function useRealtimeApprovals({
  initialApprovals = [],
  refreshUrl = "/api/approvals",
  customManager,
}: UseRealtimeApprovalsOptions = {}) {
  const [approvals, setApprovals] = React.useState<PendingApprovalItem[]>(initialApprovals);
  const [error, setError] = React.useState<string | null>(null);

  const fetchApprovals = React.useCallback(async () => {
    try {
      const res = await fetch(refreshUrl);
      if (!res.ok) {
        // Approvals API might return 404 if not yet implemented or pending
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.approvals)) {
        setApprovals(data.approvals);
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.warn("[useRealtimeApprovals] Polling fetch error:", e.message);
    }
  }, [refreshUrl]);

  const handleRealtimeEvent = React.useCallback(
    (payload: RealtimePayload<any>) => {
      const record = payload.new;
      const oldRecord = payload.old;

      setApprovals((prev) => {
        if (payload.eventType === "INSERT") {
          if (record.status === "pending") {
            const newItem: PendingApprovalItem = {
              id: record.id,
              actionType: record.action_type || record.actionType || "operation",
              targetResource: record.target_resource || record.targetResource || "system",
              expiresAt: record.expires_at || record.expiresAt || new Date().toISOString(),
              requestedAt: record.created_at || record.requestedAt,
            };
            if (!prev.some((a) => a.id === newItem.id)) {
              return [newItem, ...prev];
            }
          }
          return prev;
        }

        if (payload.eventType === "UPDATE") {
          // If status is no longer pending, remove from pending list
          if (record.status && record.status !== "pending") {
            return prev.filter((a) => a.id !== record.id);
          }
          return prev.map((a) => (a.id === record.id ? { ...a, ...record } : a));
        }

        if (payload.eventType === "DELETE") {
          const targetId = oldRecord?.id || record?.id;
          return prev.filter((a) => a.id !== targetId);
        }

        return prev;
      });
    },
    []
  );

  const { status, isPolling } = useRealtimeSubscription<any>({
    config: {
      table: "approvals",
      fallbackPollingInterval: 12000,
    },
    onEvent: handleRealtimeEvent,
    onPoll: fetchApprovals,
    customManager,
  });

  return {
    approvals,
    setApprovals,
    count: approvals.length,
    status,
    isPolling,
    error,
    refresh: fetchApprovals,
  };
}
