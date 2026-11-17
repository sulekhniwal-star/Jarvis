import { describe, it, expect, vi, beforeEach } from "vitest";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";
import { RealtimePayload } from "@/lib/realtime/types";

function createMockSupabaseClient() {
  const channels = new Map<string, any>();
  return {
    channel: vi.fn((key: string) => {
      let changeHandler: any = null;
      let statusCallback: any = null;
      const mockChannel = {
        key,
        on: vi.fn((_type: string, _config: any, cb: any) => {
          changeHandler = cb;
          return mockChannel;
        }),
        subscribe: vi.fn((cb: any) => {
          statusCallback = cb;
          if (cb) cb("SUBSCRIBED");
          return mockChannel;
        }),
        _triggerEvent: (payload: any) => {
          if (changeHandler) changeHandler(payload);
        },
        _triggerStatus: (status: string, err?: any) => {
          if (statusCallback) statusCallback(status, err);
        },
      };
      channels.set(key, mockChannel);
      return mockChannel;
    }),
    removeChannel: vi.fn((ch: any) => {
      channels.delete(ch.key);
    }),
    _channels: channels,
  };
}

describe("RealtimeManager", () => {
  beforeEach(() => {
    RealtimeManager.resetInstance();
    vi.clearAllMocks();
  });

  it("creates a channel and sets status to connected when subscribed", () => {
    const mockClient = createMockSupabaseClient();
    const manager = new RealtimeManager(mockClient);

    expect(manager.getStatus()).toBe("connecting");

    const listener = vi.fn();
    const unsubscribe = manager.subscribeTable(
      { table: "tasks" },
      listener
    );

    expect(mockClient.channel).toHaveBeenCalledWith("realtime:public:tasks:all");
    expect(manager.getStatus()).toBe("connected");

    unsubscribe();
  });

  it("multiplexes multiple subscriptions onto the same channel without duplicating", () => {
    const mockClient = createMockSupabaseClient();
    const manager = new RealtimeManager(mockClient);

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = manager.subscribeTable({ table: "tasks" }, listener1);
    const unsub2 = manager.subscribeTable({ table: "tasks" }, listener2);

    // Channel should be created only once
    expect(mockClient.channel).toHaveBeenCalledTimes(1);

    const channel = mockClient._channels.get("realtime:public:tasks:all");
    expect(channel).toBeDefined();

    // Trigger mock event
    channel._triggerEvent({
      eventType: "INSERT",
      new: { id: "task-1", title: "New Task" },
      old: {},
      commit_timestamp: "2026-11-17T00:00:00Z",
    });

    expect(listener1).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "INSERT",
        new: { id: "task-1", title: "New Task" },
        table: "tasks",
      })
    );
    expect(listener2).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "INSERT",
        new: { id: "task-1", title: "New Task" },
        table: "tasks",
      })
    );

    // First unsubscribe does not remove channel
    unsub1();
    expect(mockClient.removeChannel).not.toHaveBeenCalled();

    // Second unsubscribe removes channel
    unsub2();
    expect(mockClient.removeChannel).toHaveBeenCalledTimes(1);
    expect(manager.getStatus()).toBe("disconnected");
  });

  it("handles status transitions and broadcasts to onStatusChange listeners", () => {
    const mockClient = createMockSupabaseClient();
    const manager = new RealtimeManager(mockClient);

    const statusUpdates: string[] = [];
    manager.onStatusChange((status) => {
      statusUpdates.push(status);
    });

    manager.subscribeTable({ table: "agent_runs" }, vi.fn());
    expect(statusUpdates).toContain("connected");

    const channel = mockClient._channels.get("realtime:public:agent_runs:all");
    channel._triggerStatus("TIMED_OUT");

    expect(manager.getStatus()).toBe("disconnected");
    expect(statusUpdates).toContain("disconnected");
  });
});
