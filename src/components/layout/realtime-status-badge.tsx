"use client";

import * as React from "react";
import { Wifi, RefreshCw, AlertCircle, Radio } from "lucide-react";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

export interface RealtimeStatusBadgeProps {
  customManager?: RealtimeManager;
  className?: string;
}

export function RealtimeStatusBadge({
  customManager,
  className = "",
}: RealtimeStatusBadgeProps) {
  const { status, isConnected, isPolling, isConnecting, isDisconnected, reconnect } =
    useRealtimeConnection(customManager);

  if (isConnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Real-time WebSocket connected. Automatic live updates enabled."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Radio className="w-3 h-3 text-emerald-400" aria-hidden="true" />
        <span>Live</span>
      </div>
    );
  }

  if (isPolling) {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Reconnecting to real-time engine. Background fallback polling active (12s)."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono border bg-amber-500/10 border-amber-500/30 text-amber-400 ${className}`}
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" aria-hidden="true" />
        <span>Polling</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Connecting to Supabase Realtime..."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 ${className}`}
      >
        <Wifi className="w-3 h-3 animate-pulse text-cyan-400" aria-hidden="true" />
        <span>Connecting</span>
      </div>
    );
  }

  // Disconnected / Offline
  return (
    <button
      type="button"
      onClick={reconnect}
      role="status"
      aria-live="polite"
      title="Connection disconnected. Click to attempt reconnection."
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono border bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors ${className}`}
    >
      <AlertCircle className="w-3 h-3 text-rose-400" aria-hidden="true" />
      <span>Offline</span>
    </button>
  );
}
