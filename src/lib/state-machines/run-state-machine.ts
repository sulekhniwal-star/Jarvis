import { AgentRunStatus } from "@/types/database";
import { InvalidStateTransitionError, StateTransitionMap } from "./types";

export class AgentRunStateMachine {
  public static readonly DEFAULT_MAX_RETRIES = 3;

  private static readonly TRANSITIONS: StateTransitionMap<AgentRunStatus> = {
    queued: ["running", "failed"],
    running: ["verifying", "failed", "timed_out"],
    verifying: ["completed", "failed"],
    failed: ["queued"],
    timed_out: ["queued"],
    completed: [],
  };

  public static canTransition(
    current: AgentRunStatus,
    target: AgentRunStatus,
    retryCount: number = 0,
    maxRetries: number = AgentRunStateMachine.DEFAULT_MAX_RETRIES
  ): boolean {
    if (current === target) return true;

    // Retry guard for failed / timed_out
    if ((current === "failed" || current === "timed_out") && target === "queued") {
      return retryCount < maxRetries;
    }

    const allowed = this.TRANSITIONS[current] ?? [];
    return allowed.includes(target);
  }

  public static assertTransition(
    current: AgentRunStatus,
    target: AgentRunStatus,
    retryCount: number = 0,
    maxRetries: number = AgentRunStateMachine.DEFAULT_MAX_RETRIES
  ): void {
    if (!this.canTransition(current, target, retryCount, maxRetries)) {
      if ((current === "failed" || current === "timed_out") && target === "queued") {
        throw new InvalidStateTransitionError(
          "AgentRun",
          current,
          target,
          `Exceeded maximum retries (${retryCount}/${maxRetries}). Run cannot be re-queued.`
        );
      }
      throw new InvalidStateTransitionError("AgentRun", current, target);
    }
  }

  public static isTerminal(
    status: AgentRunStatus,
    retryCount: number = 0,
    maxRetries: number = AgentRunStateMachine.DEFAULT_MAX_RETRIES
  ): boolean {
    if (status === "completed") return true;
    if ((status === "failed" || status === "timed_out") && retryCount >= maxRetries) {
      return true;
    }
    return false;
  }
}
