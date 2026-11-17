import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

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

describe("useRealtimeSubscription Hook", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: RealtimeManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockClient = createMockSupabaseClient();
    manager = new RealtimeManager(mockClient);
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.destroy();
  });

  it("subscribes to realtime channel and dispatches onEvent", () => {
    const onEvent = vi.fn();

    const { result } = renderHook(() =>
      useRealtimeSubscription({
        config: { table: "tasks" },
        onEvent,
        customManager: manager,
      })
    );

    expect(result.current.status).toBe("connected");

    const channel = mockClient._channels.get("realtime:public:tasks:all");
    expect(channel).toBeDefined();

    act(() => {
      channel._triggerEvent({
        eventType: "INSERT",
        new: { id: "task-100", title: "Build Realtime" },
        old: {},
        commit_timestamp: "2026-11-17T00:00:00Z",
      });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "INSERT",
        new: { id: "task-100", title: "Build Realtime" },
        table: "tasks",
      })
    );
  });

  it("deduplicates identical events arriving within 1.5 seconds", () => {
    const onEvent = vi.fn();

    renderHook(() =>
      useRealtimeSubscription({
        config: { table: "tasks" },
        onEvent,
        customManager: manager,
      })
    );

    const channel = mockClient._channels.get("realtime:public:tasks:all");

    act(() => {
      channel._triggerEvent({
        eventType: "UPDATE",
        new: { id: "task-100", title: "Build Realtime" },
        old: {},
        commit_timestamp: "2026-11-17T00:00:00Z",
      });
      // Fire duplicate event immediately
      channel._triggerEvent({
        eventType: "UPDATE",
        new: { id: "task-100", title: "Build Realtime" },
        old: {},
        commit_timestamp: "2026-11-17T00:00:00Z",
      });
    });

    // Should only have called onEvent once
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it("activates fallback polling when channel disconnects (NFR-REL-01)", () => {
    const onEvent = vi.fn();
    const onPoll = vi.fn();

    const { result } = renderHook(() =>
      useRealtimeSubscription({
        config: { table: "tasks", fallbackPollingInterval: 5000 },
        onEvent,
        onPoll,
        customManager: manager,
      })
    );

    expect(result.current.status).toBe("connected");
    expect(onPoll).not.toHaveBeenCalled();

    const channel = mockClient._channels.get("realtime:public:tasks:all");

    // Disconnect channel
    act(() => {
      channel._triggerStatus("TIMED_OUT");
    });

    // Immediate poll on disconnect
    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(true);

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onPoll).toHaveBeenCalledTimes(2);

    // Reconnect
    act(() => {
      channel._triggerStatus("SUBSCRIBED");
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.isPolling).toBe(false);

    // Advance timer again; no more polls should occur
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
  });
});

describe("useRealtimeConnection Hook", () => {
  it("tracks connection state and offers reconnect method", () => {
    const mockClient = createMockSupabaseClient();
    const manager = new RealtimeManager(mockClient);

    const { result } = renderHook(() => useRealtimeConnection(manager));

    expect(result.current.isConnecting).toBe(true);

    act(() => {
      manager.setStatus("connected");
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.status).toBe("connected");

    act(() => {
      manager.setStatus("polling");
    });

    expect(result.current.isPolling).toBe(true);

    act(() => {
      result.current.reconnect();
    });

    expect(result.current.isConnecting).toBe(true);
  });
});
