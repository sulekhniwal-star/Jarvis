"use client";

import * as React from "react";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";
import {
  SubscriptionConfig,
  RealtimeListener,
  RealtimePayload,
  RealtimeStatus,
} from "@/lib/realtime/types";

export interface UseRealtimeSubscriptionOptions<T = Record<string, unknown>> {
  config: SubscriptionConfig;
  onEvent: RealtimeListener<T>;
  onPoll?: () => Promise<void> | void;
  customManager?: RealtimeManager;
}

export function useRealtimeSubscription<T = Record<string, unknown>>({
  config,
  onEvent,
  onPoll,
  customManager,
}: UseRealtimeSubscriptionOptions<T>): {
  status: RealtimeStatus;
  isPolling: boolean;
} {
  const manager = React.useMemo(() => {
    return customManager ?? RealtimeManager.getInstance();
  }, [customManager]);

  const [status, setStatus] = React.useState<RealtimeStatus>(() => manager.getStatus());
  const [isPolling, setIsPolling] = React.useState<boolean>(false);

  // Keep onEvent and onPoll fresh in refs to avoid recreating subscriptions
  const onEventRef = React.useRef(onEvent);
  onEventRef.current = onEvent;

  const onPollRef = React.useRef(onPoll);
  onPollRef.current = onPoll;

  // Track recently processed event keys for deduplication
  const processedEventsRef = React.useRef<Map<string, number>>(new Map());

  const handleEvent = React.useCallback((payload: RealtimePayload<T>) => {
    const recordId = (payload.new as any)?.id || (payload.old as any)?.id || "unknown";
    const dedupeKey = `${payload.table}:${payload.eventType}:${recordId}:${
      payload.commitTimestamp || ""
    }`;

    const now = Date.now();
    const lastSeen = processedEventsRef.current.get(dedupeKey);

    // If duplicate event arrived within 1500ms, ignore
    if (lastSeen && now - lastSeen < 1500) {
      return;
    }

    processedEventsRef.current.set(dedupeKey, now);

    // Prune old entries in deduplication map
    if (processedEventsRef.current.size > 100) {
      for (const [k, timestamp] of processedEventsRef.current.entries()) {
        if (now - timestamp > 5000) {
          processedEventsRef.current.delete(k);
        }
      }
    }

    onEventRef.current(payload);
  }, []);

  // Monitor connection status
  React.useEffect(() => {
    const unsubscribeStatus = manager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribeStatus();
    };
  }, [manager]);

  // Subscribe to table events
  React.useEffect(() => {
    if (config.enabled === false) {
      return;
    }

    const unsubscribe = manager.subscribeTable<T>(config, handleEvent);

    return () => {
      unsubscribe();
    };
  }, [
    manager,
    config.table,
    config.schema,
    config.filter,
    config.event,
    config.enabled,
    handleEvent,
  ]);

  // Resilient fallback polling timer (NFR-REL-01)
  React.useEffect(() => {
    const pollingIntervalMs = config.fallbackPollingInterval ?? 12000;
    let timer: NodeJS.Timeout | null = null;

    if (
      (status === "disconnected" || status === "polling") &&
      onPollRef.current &&
      config.enabled !== false
    ) {
      setIsPolling(true);
      if (status === "disconnected") {
        manager.setStatus("polling");
        // Immediate poll on disconnect transition
        try {
          void onPollRef.current();
        } catch (err) {
          console.warn("[useRealtimeSubscription] Initial fallback poll error:", err);
        }
      }

      timer = setInterval(() => {
        if (onPollRef.current) {
          try {
            void onPollRef.current();
          } catch (err) {
            console.warn("[useRealtimeSubscription] Fallback poll error:", err);
          }
        }
      }, pollingIntervalMs);
    } else if (status === "connected") {
      setIsPolling(false);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [status, config.fallbackPollingInterval, config.enabled, manager]);

  return {
    status,
    isPolling,
  };
}
