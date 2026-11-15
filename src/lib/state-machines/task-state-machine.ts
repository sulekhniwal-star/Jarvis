import { TaskStatus } from "@/types/database";
import { InvalidStateTransitionError, StateTransitionMap } from "./types";

export class TaskStateMachine {
  private static readonly TRANSITIONS: StateTransitionMap<TaskStatus> = {
    intake: ["specifying", "cancelled"],
    specifying: ["planned", "cancelled"],
    planned: ["awaiting_approval", "running", "cancelled", "specifying"],
    awaiting_approval: ["running", "cancelled", "specifying"],
    running: ["verifying", "failed", "cancelled"],
    verifying: ["completed", "failed"],
    failed: ["intake", "specifying", "planned", "running", "cancelled"],
    completed: [],
    cancelled: [],
  };

  public static canTransition(current: TaskStatus, target: TaskStatus): boolean {
    if (current === target) return true;
    const allowed = this.TRANSITIONS[current] ?? [];
    return allowed.includes(target);
  }

  public static assertTransition(current: TaskStatus, target: TaskStatus): void {
    if (!this.canTransition(current, target)) {
      throw new InvalidStateTransitionError("Task", current, target);
    }
  }

  public static isTerminal(status: TaskStatus): boolean {
    return status === "completed" || status === "cancelled";
  }
}
