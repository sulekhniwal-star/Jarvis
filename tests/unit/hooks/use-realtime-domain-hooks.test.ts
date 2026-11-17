import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { useRealtimeRuns } from "@/hooks/use-realtime-runs";
import { useRealtimeApprovals } from "@/hooks/use-realtime-approvals";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";
import { KanbanTask } from "@/components/projects/kanban-task-card";
import { EnrichedAgentRun } from "@/types/agent-runs";

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
        _triggerStatus: (status: string) => {
          if (statusCallback) statusCallback(status);
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

describe("useRealtimeTasks Hook", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: RealtimeManager;

  const initialTasks: KanbanTask[] = [
    {
      id: "task-1",
      project_id: "proj-1",
      title: "Initial Task",
      status: "intake",
      priority: "medium",
      risk_level: "low",
    },
  ];

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    manager = new RealtimeManager(mockClient);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("handles INSERT, UPDATE, and DELETE realtime events", () => {
    const { result } = renderHook(() =>
      useRealtimeTasks({
        projectId: "proj-1",
        initialTasks,
        customManager: manager,
      })
    );

    const channel = mockClient._channels.get("realtime:public:tasks:project_id=eq.proj-1");
    expect(channel).toBeDefined();

    // 1. INSERT event
    act(() => {
      channel._triggerEvent({
        eventType: "INSERT",
        new: {
          id: "task-2",
          project_id: "proj-1",
          title: "Second Task",
          status: "specifying",
          priority: "high",
          risk_level: "low",
        },
        old: {},
        commit_timestamp: "2026-11-17T00:00:01Z",
      });
    });

    expect(result.current.tasks.length).toBe(2);
    expect(result.current.tasks.find((t) => t.id === "task-2")).toBeDefined();

    // 2. UPDATE event
    act(() => {
      channel._triggerEvent({
        eventType: "UPDATE",
        new: {
          id: "task-1",
          project_id: "proj-1",
          title: "Initial Task",
          status: "planned",
          priority: "medium",
          risk_level: "low",
        },
        old: {},
        commit_timestamp: "2026-11-17T00:00:02Z",
      });
    });

    expect(result.current.tasks.find((t) => t.id === "task-1")?.status).toBe("planned");

    // 3. DELETE event
    act(() => {
      channel._triggerEvent({
        eventType: "DELETE",
        new: {},
        old: { id: "task-2" },
        commit_timestamp: "2026-11-17T00:00:03Z",
      });
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks.find((t) => t.id === "task-2")).toBeUndefined();
  });

  it("optimistically updates status and rolls back on API failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const { result } = renderHook(() =>
      useRealtimeTasks({
        projectId: "proj-1",
        initialTasks,
        customManager: manager,
      })
    );

    let success = false;
    await act(async () => {
      success = await result.current.transitionTaskStatus("task-1", "running");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Network timeout");
    // Status should have rolled back to intake
    expect(result.current.tasks.find((t) => t.id === "task-1")?.status).toBe("intake");
  });
});

describe("useRealtimeRuns Hook", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: RealtimeManager;

  const initialRuns: EnrichedAgentRun[] = [
    {
      id: "run-1",
      task_id: "task-1",
      agent_engine: "aider",
      status: "completed",
      created_at: "2026-11-17T00:00:00Z",
      durationMs: 4000,
    },
  ];

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    manager = new RealtimeManager(mockClient);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("updates runs and recalculates aggregate metrics on realtime event", () => {
    const { result } = renderHook(() =>
      useRealtimeRuns({
        initialRuns,
        customManager: manager,
      })
    );

    expect(result.current.metrics.totalRuns).toBe(1);
    expect(result.current.metrics.completedRuns).toBe(1);
    expect(result.current.metrics.successRate).toBe(100);

    const channel = mockClient._channels.get("realtime:public:agent_runs:all");

    // Insert a running execution
    act(() => {
      channel._triggerEvent({
        eventType: "INSERT",
        new: {
          id: "run-2",
          task_id: "task-2",
          agent_engine: "aider",
          status: "running",
          created_at: "2026-11-17T00:01:00Z",
        },
        old: {},
        commit_timestamp: "2026-11-17T00:01:00Z",
      });
    });

    expect(result.current.runs.length).toBe(2);
    expect(result.current.metrics.totalRuns).toBe(2);
    expect(result.current.metrics.activeRuns).toBe(1);

    // Transition run-2 to failed
    act(() => {
      channel._triggerEvent({
        eventType: "UPDATE",
        new: {
          id: "run-2",
          task_id: "task-2",
          agent_engine: "aider",
          status: "failed",
          created_at: "2026-11-17T00:01:00Z",
          durationMs: 6000,
        },
        old: {},
        commit_timestamp: "2026-11-17T00:01:05Z",
      });
    });

    expect(result.current.metrics.activeRuns).toBe(0);
    expect(result.current.metrics.failedRuns).toBe(1);
    // 1 completed, 1 failed => 50% success rate
    expect(result.current.metrics.successRate).toBe(50);
  });
});

describe("useRealtimeApprovals Hook", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: RealtimeManager;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    manager = new RealtimeManager(mockClient);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("adds pending approval and removes it when approved or rejected", () => {
    const { result } = renderHook(() =>
      useRealtimeApprovals({
        customManager: manager,
      })
    );

    expect(result.current.count).toBe(0);

    const channel = mockClient._channels.get("realtime:public:approvals:all");

    // New approval arrives
    act(() => {
      channel._triggerEvent({
        eventType: "INSERT",
        new: {
          id: "app-1",
          action_type: "git_push",
          target_resource: "origin/main",
          status: "pending",
          expires_at: "2026-11-17T01:00:00Z",
        },
        old: {},
        commit_timestamp: "2026-11-17T00:00:00Z",
      });
    });

    expect(result.current.count).toBe(1);
    expect(result.current.approvals[0].id).toBe("app-1");

    // Approval granted
    act(() => {
      channel._triggerEvent({
        eventType: "UPDATE",
        new: {
          id: "app-1",
          status: "approved",
        },
        old: {},
        commit_timestamp: "2026-11-17T00:00:10Z",
      });
    });

    // Should be removed from pending list
    expect(result.current.count).toBe(0);
  });
});
