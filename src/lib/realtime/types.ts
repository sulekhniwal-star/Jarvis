export type RealtimeStatus = "connected" | "connecting" | "disconnected" | "polling";

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimeTable = "tasks" | "agent_runs" | "projects" | "approvals" | "memories";

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  table: RealtimeTable;
  schema: string;
  commitTimestamp?: string;
}

export type RealtimeListener<T = Record<string, unknown>> = (
  payload: RealtimePayload<T>
) => void;

export type RealtimeStatusListener = (status: RealtimeStatus) => void;

export interface SubscriptionConfig {
  table: RealtimeTable;
  schema?: string;
  filter?: string;
  event?: RealtimeEventType;
  enabled?: boolean;
  fallbackPollingInterval?: number;
}
