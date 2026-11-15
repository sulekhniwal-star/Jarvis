import { describe, it, expect } from "vitest";
import { AgentRunStateMachine } from "@/lib/state-machines/run-state-machine";
import { InvalidStateTransitionError } from "@/lib/state-machines/types";

describe("AgentRunStateMachine — Execution Lifecycle & Bounded Retries", () => {
  it("allows normal execution lifecycle transitions", () => {
    expect(AgentRunStateMachine.canTransition("queued", "running")).toBe(true);
    expect(AgentRunStateMachine.canTransition("running", "verifying")).toBe(true);
    expect(AgentRunStateMachine.canTransition("verifying", "completed")).toBe(true);
  });

  it("permits retry when within retry limits", () => {
    expect(AgentRunStateMachine.canTransition("failed", "queued", 0, 3)).toBe(true);
    expect(AgentRunStateMachine.canTransition("failed", "queued", 2, 3)).toBe(true);
    expect(AgentRunStateMachine.canTransition("timed_out", "queued", 1, 3)).toBe(true);
  });

  it("blocks re-queuing when maximum retries are exceeded", () => {
    expect(AgentRunStateMachine.canTransition("failed", "queued", 3, 3)).toBe(false);
    expect(AgentRunStateMachine.canTransition("failed", "queued", 4, 3)).toBe(false);

    expect(() =>
      AgentRunStateMachine.assertTransition("failed", "queued", 3, 3)
    ).toThrow(InvalidStateTransitionError);
  });

  it("marks terminal completed run correctly", () => {
    expect(AgentRunStateMachine.isTerminal("completed")).toBe(true);
    expect(AgentRunStateMachine.isTerminal("running")).toBe(false);
    expect(AgentRunStateMachine.isTerminal("failed", 1, 3)).toBe(false);
    expect(AgentRunStateMachine.isTerminal("failed", 3, 3)).toBe(true);
  });
});
