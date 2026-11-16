import { execFileSync } from "child_process";
import {
  FailureDiagnostic,
  RepairLoopState,
  RepairStrikeRecord,
} from "./types";
import { failureAnalyzer } from "./failure-analyzer";
import { repairPromptSynthesizer } from "./prompt-synthesizer";

export interface RepairRunnerOptions {
  gitExec?: (args: string[]) => string;
}

export interface AdvanceStrikeResult {
  nextState: RepairLoopState;
  prompt: string;
  shouldRollback: boolean;
  diagnostic: FailureDiagnostic;
}

export interface RollbackResult {
  success: boolean;
  rolledBackSha: string;
  error?: string;
}

/**
 * Autonomous 3-Strike Bounded Repair Orchestrator (REQ-VR-04, NFR-SEC-01).
 * Coordinates failure diagnosis, targeted prompt synthesis, and safe git rollback.
 */
export class BoundedRepairRunner {
  private gitExec: (args: string[]) => string;

  constructor(options: RepairRunnerOptions = {}) {
    this.gitExec =
      options.gitExec ??
      ((args: string[]) =>
        execFileSync("git", args, {
          encoding: "utf-8",
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        }));
  }

  /**
   * Captures the clean pre-run git HEAD commit SHA.
   */
  public capturePreRunCommit(): string {
    try {
      const sha = this.gitExec(["rev-parse", "HEAD"]).trim();
      return sha;
    } catch {
      return "UNKNOWN_PRE_RUN_SHA";
    }
  }

  /**
   * Initializes state for a fresh bounded repair loop.
   */
  public createInitialState(
    preRunCommitSha?: string,
    maxStrikes: number = 3
  ): RepairLoopState {
    const sha = preRunCommitSha || this.capturePreRunCommit();
    return {
      currentStrike: 0,
      maxStrikes: Math.max(1, maxStrikes),
      isTerminated: false,
      preRunCommitSha: sha,
      history: [],
    };
  }

  /**
   * Advances the repair state machine by analyzing the failure, recording the strike,
   * synthesizing a targeted prompt, and signaling when a rollback is mandatory.
   */
  public advanceStrike(
    state: RepairLoopState,
    errorOutput: string,
    stageName?: string,
    options: { diffSnapshot?: string; allowedFiles?: string[] } = {}
  ): AdvanceStrikeResult {
    if (state.isTerminated) {
      const diagnostic = failureAnalyzer.analyze(errorOutput, stageName);
      return {
        nextState: state,
        prompt: "",
        shouldRollback: true,
        diagnostic,
      };
    }

    const nextStrike = (state.currentStrike + 1) as 1 | 2 | 3;
    const diagnostic = failureAnalyzer.analyze(errorOutput, stageName);

    const prompt = repairPromptSynthesizer.synthesize(
      diagnostic,
      nextStrike,
      options
    );

    const strikeRecord: RepairStrikeRecord = {
      strikeNumber: nextStrike,
      diagnostic,
      prompt,
      diffSnapshot: options.diffSnapshot,
      timestamp: new Date().toISOString(),
    };

    const isTerminated = nextStrike >= state.maxStrikes;
    const shouldRollback = isTerminated;

    const nextState: RepairLoopState = {
      currentStrike: nextStrike,
      maxStrikes: state.maxStrikes,
      isTerminated,
      preRunCommitSha: state.preRunCommitSha,
      history: [...state.history, strikeRecord],
    };

    return {
      nextState,
      prompt,
      shouldRollback,
      diagnostic,
    };
  }

  /**
   * Executes an automated, safe git rollback to the pre-run commit SHA.
   * Completely restores the working directory and removes untracked working files.
   */
  public async executeRollback(
    preRunSha?: string
  ): Promise<RollbackResult> {
    const targetSha = preRunSha || "HEAD";

    try {
      this.gitExec(["reset", "--hard", targetSha]);
      this.gitExec(["clean", "-fd"]);

      return {
        success: true,
        rolledBackSha: targetSha,
      };
    } catch (err) {
      return {
        success: false,
        rolledBackSha: targetSha,
        error: (err as Error).message || String(err),
      };
    }
  }
}

export const boundedRepairRunner = new BoundedRepairRunner();
