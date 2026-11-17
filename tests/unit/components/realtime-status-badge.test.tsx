import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RealtimeStatusBadge } from "@/components/layout/realtime-status-badge";
import { RealtimeManager } from "@/lib/realtime/realtime-manager";

function createMockSupabaseClient() {
  const channels = new Map<string, any>();
  return {
    channel: vi.fn((key: string) => {
      const mockChannel = {
        key,
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb: any) => {
          if (cb) cb("SUBSCRIBED");
          return mockChannel;
        }),
      };
      channels.set(key, mockChannel);
      return mockChannel;
    }),
    removeChannel: vi.fn(),
    _channels: channels,
  };
}

describe("RealtimeStatusBadge Component", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: RealtimeManager;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    manager = new RealtimeManager(mockClient);
  });

  it("renders Live state when manager status is connected", () => {
    manager.setStatus("connected");
    render(<RealtimeStatusBadge customManager={manager} />);

    expect(screen.getByText("Live")).toBeDefined();
    expect(screen.getByRole("status")).toHaveAttribute(
      "title",
      expect.stringContaining("Real-time WebSocket connected")
    );
  });

  it("renders Polling state when manager status is polling", () => {
    manager.setStatus("polling");
    render(<RealtimeStatusBadge customManager={manager} />);

    expect(screen.getByText("Polling")).toBeDefined();
    expect(
      screen.getByRole("status").getAttribute("title")
    ).toContain("fallback polling active");
  });

  it("renders Connecting state when manager status is connecting", () => {
    manager.setStatus("connecting");
    render(<RealtimeStatusBadge customManager={manager} />);

    expect(screen.getByText("Connecting")).toBeDefined();
  });

  it("renders Offline state and calls reconnect on click", () => {
    manager.setStatus("disconnected");
    const reconnectSpy = vi.spyOn(manager, "reconnect");

    render(<RealtimeStatusBadge customManager={manager} />);

    const badgeBtn = screen.getByRole("status");
    expect(screen.getByText("Offline")).toBeDefined();

    fireEvent.click(badgeBtn);
    expect(reconnectSpy).toHaveBeenCalledTimes(1);
  });
});
