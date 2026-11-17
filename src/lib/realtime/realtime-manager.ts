import { createClient } from "@/lib/supabase/client";
import {
  RealtimeStatus,
  RealtimeTable,
  RealtimePayload,
  RealtimeListener,
  RealtimeStatusListener,
  SubscriptionConfig,
} from "./types";

interface ChannelRecord {
  channelKey: string;
  refCount: number;
  channel: any; // Supabase RealtimeChannel
  listeners: Set<RealtimeListener<any>>;
}

export class RealtimeManager {
  private static instance: RealtimeManager | null = null;
  private client: any;
  private channels = new Map<string, ChannelRecord>();
  private statusListeners = new Set<RealtimeStatusListener>();
  private status: RealtimeStatus = "connecting";
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private isWindowListening = false;

  constructor(customClient?: any) {
    this.client = customClient;
    this.setupWindowListeners();
  }

  public static getInstance(customClient?: any): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager(customClient);
    } else if (customClient) {
      RealtimeManager.instance.client = customClient;
    }
    return RealtimeManager.instance;
  }

  public static resetInstance(): void {
    if (RealtimeManager.instance) {
      RealtimeManager.instance.destroy();
      RealtimeManager.instance = null;
    }
  }

  private getClient(): any {
    if (!this.client) {
      try {
        this.client = createClient();
      } catch (err) {
        console.warn("[RealtimeManager] Could not initialize Supabase browser client:", err);
      }
    }
    return this.client;
  }

  private setupWindowListeners(): void {
    if (typeof window !== "undefined" && !this.isWindowListening) {
      this.isWindowListening = true;
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    this.retryCount = 0;
    this.reconnect();
  };

  private handleOffline = (): void => {
    this.setStatus("disconnected");
  };

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  public setStatus(status: RealtimeStatus): void {
    if (this.status !== status) {
      this.status = status;
      for (const listener of this.statusListeners) {
        try {
          listener(status);
        } catch (err) {
          console.error("[RealtimeManager] Error in status listener:", err);
        }
      }
    }
  }

  public onStatusChange(listener: RealtimeStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public subscribeTable<T = Record<string, unknown>>(
    config: SubscriptionConfig,
    listener: RealtimeListener<T>
  ): () => void {
    const { table, schema = "public", filter, event = "*" } = config;
    const channelKey = `realtime:${schema}:${table}:${filter || "all"}`;
    const client = this.getClient();

    if (!client) {
      this.setStatus("disconnected");
      return () => {};
    }

    let record = this.channels.get(channelKey);

    if (!record) {
      this.setStatus("connecting");
      const channel = client.channel(channelKey);

      record = {
        channelKey,
        refCount: 0,
        channel,
        listeners: new Set(),
      };
      this.channels.set(channelKey, record);

      const changeConfig: {
        event: string;
        schema: string;
        table: string;
        filter?: string;
      } = {
        event,
        schema,
        table,
      };

      if (filter) {
        changeConfig.filter = filter;
      }

      channel
        .on(
          "postgres_changes",
          changeConfig,
          (rawPayload: any) => {
            const payload: RealtimePayload<T> = {
              eventType: rawPayload.eventType,
              new: rawPayload.new,
              old: rawPayload.old,
              table: table as RealtimeTable,
              schema,
              commitTimestamp: rawPayload.commit_timestamp,
            };

            const currentRecord = this.channels.get(channelKey);
            if (currentRecord) {
              for (const l of currentRecord.listeners) {
                try {
                  l(payload);
                } catch (err) {
                  console.error(`[RealtimeManager] Error dispatching event on ${table}:`, err);
                }
              }
            }
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (status === "SUBSCRIBED") {
            this.retryCount = 0;
            this.setStatus("connected");
          } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
            this.setStatus("disconnected");
            this.scheduleReconnect();
          }
        });
    }

    record.refCount++;
    record.listeners.add(listener);

    // Return unsubscription cleanup function
    return () => {
      const existing = this.channels.get(channelKey);
      if (!existing) return;

      existing.listeners.delete(listener);
      existing.refCount--;

      if (existing.refCount <= 0) {
        this.channels.delete(channelKey);
        try {
          if (client && client.removeChannel) {
            client.removeChannel(existing.channel);
          }
        } catch (err) {
          console.warn("[RealtimeManager] Error removing channel:", err);
        }

        // If no more channels are active, status is idle/disconnected
        if (this.channels.size === 0) {
          this.setStatus("disconnected");
        }
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    // Exponential backoff with jitter: min(1000 * 2^retry + jitter, 30000)
    const baseDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;
    this.retryCount++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, delay);
  }

  public reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const client = this.getClient();
    if (!client) return;

    this.setStatus("connecting");

    // Resubscribe all active channels
    for (const record of this.channels.values()) {
      try {
        record.channel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            this.retryCount = 0;
            this.setStatus("connected");
          } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
            this.setStatus("disconnected");
            this.scheduleReconnect();
          }
        });
      } catch (err) {
        console.warn(`[RealtimeManager] Reconnect error on ${record.channelKey}:`, err);
      }
    }
  }

  public destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const client = this.getClient();
    for (const record of this.channels.values()) {
      try {
        if (client && client.removeChannel) {
          client.removeChannel(record.channel);
        }
      } catch (err) {
        // Ignore cleanup errors during destruction
      }
    }

    this.channels.clear();
    this.statusListeners.clear();

    if (typeof window !== "undefined" && this.isWindowListening) {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      this.isWindowListening = false;
    }
  }
}
