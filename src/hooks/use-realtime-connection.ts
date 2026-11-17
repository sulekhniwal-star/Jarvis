"use client";

import * as React from "react";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";
import { RealtimeStatus } from "@/lib/realtime/types";

export interface UseRealtimeConnectionReturn {
  status: RealtimeStatus;
  isConnected: boolean;
  isPolling: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  reconnect: () => void;
}

export function useRealtimeConnection(customManager?: RealtimeManager): UseRealtimeConnectionReturn {
  const manager = React.useMemo(() => {
    return customManager ?? RealtimeManager.getInstance();
  }, [customManager]);

  const [status, setStatus] = React.useState<RealtimeStatus>(() => manager.getStatus());

  React.useEffect(() => {
    const unsubscribe = manager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [manager]);

  const reconnect = React.useCallback(() => {
    manager.reconnect();
  }, [manager]);

  return {
    status,
    isConnected: status === "connected",
    isPolling: status === "polling",
    isConnecting: status === "connecting",
    isDisconnected: status === "disconnected",
    reconnect,
  };
}
