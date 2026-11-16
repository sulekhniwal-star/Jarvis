import { describe, it, expect, vi } from "vitest";
import { BoundedRepairRunner } from "@/lib/agents/engine/verification/repair/repair-runner";
import { TelegramRecoveryNotifier } from "@/lib/agents/engine/verification/repair/telegram-notifier";
import { FailureDiagnostic } from "@/lib/agents/engine/verification/repair/types";

describe("BoundedRepairRunner 3-Strike Loop & Safe Git Rollback (REQ-VR-04, NFR-SEC-01)", () => {
  it("initializes state and captures clean pre-run commit SHA", () => {
    const mockGitExec = vi.fn().mockImplementation((args: string[]) => {
      if (args[0] === "rev-parse" && args[1] === "HEAD") {
        return "1234567890abcdef1234567890abcdef12345678\n";
      }
      return "";
    });

    const runner = new BoundedRepairRunner({ gitExec: mockGitExec });
    const state = runner.createInitialState();

    expect(state.currentStrike).toBe(0);
    expect(state.maxStrikes).toBe(3);
    expect(state.isTerminated).toBe(false);
    expect(state.preRunCommitSha).toBe("1234567890abcdef1234567890abcdef12345678");
  });

  it("advances through strikes 1, 2, and 3 with termination and rollback on strike 3", () => {
    const runner = new BoundedRepairRunner();
    let state = runner.createInitialState("preRunSha123");

    // Strike 1
    const strike1 = runner.advanceStrike(
      state,
      "src/a.ts:1:1 - error TS2322: Type '1' is not assignable to type 'string'."
    );
    expect(strike1.nextState.currentStrike).toBe(1);
    expect(strike1.shouldRollback).toBe(false);
    expect(strike1.nextState.isTerminated).toBe(false);
    expect(strike1.prompt).toContain("Strike 1 (Targeted Surgical Fix)");
    state = strike1.nextState;

    // Strike 2
    const strike2 = runner.advanceStrike(
      state,
      "AssertionError: expected true to be false"
    );
    expect(strike2.nextState.currentStrike).toBe(2);
    expect(strike2.shouldRollback).toBe(false);
    expect(strike2.nextState.isTerminated).toBe(false);
    expect(strike2.prompt).toContain("Strike 2 (Structural & Dependency Alignment)");
    state = strike2.nextState;

    // Strike 3
    const strike3 = runner.advanceStrike(
      state,
      "Failed to compile."
    );
    expect(strike3.nextState.currentStrike).toBe(3);
    expect(strike3.shouldRollback).toBe(true);
    expect(strike3.nextState.isTerminated).toBe(true);
    expect(strike3.prompt).toContain("Strike 3 (Final Attempt Before Revert)");
  });

  it("executes safe git rollback resetting hard to pre-run SHA and cleaning untracked files", async () => {
    const executedCommands: string[] = [];
    const mockGitExec = vi.fn().mockImplementation((args: string[]) => {
      executedCommands.push(args.join(" "));
      return "";
    });

    const runner = new BoundedRepairRunner({ gitExec: mockGitExec });
    const result = await runner.executeRollback("preRunCommitSha999");

    expect(result.success).toBe(true);
    expect(result.rolledBackSha).toBe("preRunCommitSha999");
    expect(executedCommands).toContain("reset --hard preRunCommitSha999");
    expect(executedCommands).toContain("clean -fd");
  });
});

describe("TelegramRecoveryNotifier Card & Action Generation (REQ-VR-04, REQ-TG-05)", () => {
  it("formats rich MarkdownV2 card with rollback status and inline recovery actions", () => {
    const notifier = new TelegramRecoveryNotifier();

    const diagnostic: FailureDiagnostic = {
      category: "syntax_type_error",
      stage: "typecheck",
      primaryError: "error TS2322: Type 'string' is not assignable to type 'number'.",
      affectedFiles: ["src/lib/calc.ts"],
      errorSnippets: ["const x: number = 'abc';"],
      suggestedStrategy: "Align parameter and return types.",
    };

    const card = notifier.formatRecoveryCard(
      "task-abc-123",
      "run-xyz-789",
      diagnostic,
      3,
      "c3ab8ff13720e8ad9047dd39466b3c8974e592c2"
    );

    expect(card.text).toContain("Jarvis Bounded Repair Exhausted");
    expect(card.text).toContain("task-abc-123");
    expect(card.text).toContain("run-xyz-789");
    expect(card.text).toContain("Safety Rollback");
    expect(card.text).toContain("c3ab8ff");

    // Check inline keyboard buttons
    const buttons = card.replyMarkup.inline_keyboard.flat();
    expect(buttons.some((b) => b.text === "🔄 Retry Task" && b.callback_data === "task_retry:task-abc-123")).toBe(true);
    expect(buttons.some((b) => b.text === "📋 View Failure Logs" && b.callback_data === "run_logs:run-xyz-789")).toBe(true);
    expect(buttons.some((b) => b.text === "❌ Dismiss Alert" && b.callback_data === "task_dismiss:task-abc-123")).toBe(true);
  });
});
