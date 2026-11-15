import { ApprovalStatus } from "@/types/database";
import { InvalidStateTransitionError, StateTransitionMap } from "./types";

export class ApprovalStateMachine {
  private static readonly TRANSITIONS: StateTransitionMap<ApprovalStatus> = {
    pending: ["approved", "rejected", "expired"],
    approved: [],
    rejected: [],
    expired: [],
  };

  public static isExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
    const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    return now.getTime() > expirationDate.getTime();
  }

  public static canDecide(
    status: ApprovalStatus,
    expiresAt: string | Date,
    now: Date = new Date()
  ): boolean {
    if (status !== "pending") return false;
    return !this.isExpired(expiresAt, now);
  }

  public static assertDecision(
    status: ApprovalStatus,
    target: "approved" | "rejected",
    expiresAt: string | Date,
    now: Date = new Date()
  ): void {
    if (status !== "pending") {
      throw new InvalidStateTransitionError(
        "Approval",
        status,
        target,
        `Cannot decide approval in terminal status '${status}'.`
      );
    }

    if (this.isExpired(expiresAt, now)) {
      throw new InvalidStateTransitionError(
        "Approval",
        status,
        target,
        `Cannot decide approval: request has expired (expiration: ${expiresAt}).`
      );
    }
  }

  public static isTerminal(status: ApprovalStatus): boolean {
    return status === "approved" || status === "rejected" || status === "expired";
  }
}
