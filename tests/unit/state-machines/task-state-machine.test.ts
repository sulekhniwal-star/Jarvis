import { describe, it, expect } from "vitest";
import { TaskStateMachine } from "@/lib/state-machines/task-state-machine";
import { InvalidStateTransitionError } from "@/lib/state-machines/types";

describe("TaskStateMachine — Deterministic Task Transitions", () => {
  it("allows standard forward progression through lifecycle", () => {
    expect(TaskStateMachine.canTransition("intake", "specifying")).toBe(true);
    expect(TaskStateMachine.canTransition("specifying", "planned")).toBe(true);
    expect(TaskStateMachine.canTransition("planned", "awaiting_approval")).toBe(true);
    expect(TaskStateMachine.canTransition("planned", "running")).toBe(true);
    expect(TaskStateMachine.canTransition("awaiting_approval", "running")).toBe(true);
    expect(TaskStateMachine.canTransition("running", "verifying")).toBe(true);
    expect(TaskStateMachine.canTransition("verifying", "completed")).toBe(true);
  });

  it("blocks illegal state skips", () => {
    // Cannot jump from intake directly to running or completed
    expect(TaskStateMachine.canTransition("intake", "running")).toBe(false);
    expect(TaskStateMachine.canTransition("intake", "completed")).toBe(false);
    expect(TaskStateMachine.canTransition("specifying", "completed")).toBe(false);

    expect(() =>
      TaskStateMachine.assertTransition("intake", "completed")
    ).toThrow(InvalidStateTransitionError);
  });

  it("handles cancellation and failure paths", () => {
    expect(TaskStateMachine.canTransition("intake", "cancelled")).toBe(true);
    expect(TaskStateMachine.canTransition("running", "failed")).toBe(true);
    expect(TaskStateMachine.canTransition("verifying", "failed")).toBe(true);
    expect(TaskStateMachine.canTransition("failed", "planned")).toBe(true);
  });

  it("identifies terminal states correctly", () => {
    expect(TaskStateMachine.isTerminal("completed")).toBe(true);
    expect(TaskStateMachine.isTerminal("cancelled")).toBe(true);
    expect(TaskStateMachine.isTerminal("running")).toBe(false);
    expect(TaskStateMachine.isTerminal("failed")).toBe(false);
  });
});
