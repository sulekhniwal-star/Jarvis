import { describe, it, expect } from "vitest";
import { ApprovalStateMachine } from "@/lib/state-machines/approval-state-machine";
import { InvalidStateTransitionError } from "@/lib/state-machines/types";

describe("ApprovalStateMachine — Atomic Decisions & Expiration", () => {
  it("allows decisions on valid pending approvals", () => {
    const futureDate = new Date(Date.now() + 60000);
    expect(ApprovalStateMachine.canDecide("pending", futureDate)).toBe(true);

    expect(() =>
      ApprovalStateMachine.assertDecision("pending", "approved", futureDate)
    ).not.toThrow();

    expect(() =>
      ApprovalStateMachine.assertDecision("pending", "rejected", futureDate)
    ).not.toThrow();
  });

  it("detects expired approvals and blocks decisions", () => {
    const pastDate = new Date(Date.now() - 10000);
    expect(ApprovalStateMachine.isExpired(pastDate)).toBe(true);
    expect(ApprovalStateMachine.canDecide("pending", pastDate)).toBe(false);

    expect(() =>
      ApprovalStateMachine.assertDecision("pending", "approved", pastDate)
    ).toThrow(InvalidStateTransitionError);
  });

  it("prohibits changing terminal approval decisions", () => {
    const futureDate = new Date(Date.now() + 60000);

    expect(ApprovalStateMachine.canDecide("approved", futureDate)).toBe(false);
    expect(ApprovalStateMachine.canDecide("rejected", futureDate)).toBe(false);
    expect(ApprovalStateMachine.canDecide("expired", futureDate)).toBe(false);

    expect(() =>
      ApprovalStateMachine.assertDecision("approved", "rejected", futureDate)
    ).toThrow(InvalidStateTransitionError);
  });
});
