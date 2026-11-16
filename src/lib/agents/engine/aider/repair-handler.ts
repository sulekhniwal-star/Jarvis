import { RepairState, RepairStrike } from "./types";

/**
 * 3-Strike Bounded Repair Handler implementing docs/CODING_AGENT_INTERFACE.md §5.
 * Strictly bounds automated error repair loops to prevent runaway token spend and infinite retries.
 */
export class AiderRepairHandler {
  /**
   * Initializes a fresh repair loop state.
   */
  public createInitialState(maxStrikes: number = 3): RepairState {
    return {
      currentStrike: 0,
      maxStrikes: Math.max(1, maxStrikes),
      isTerminated: false,
      history: [],
    };
  }

  /**
   * Advances the repair state machine, compiling the appropriate targeted prompt
   * or signalling an automatic rollback upon reaching strike 3.
   */
  public recordStrike(
    state: RepairState,
    errorDetails: string,
    diffSnapshot?: string
  ): {
    nextState: RepairState;
    repairPrompt: string;
    shouldRollback: boolean;
  } {
    if (state.isTerminated) {
      return {
        nextState: state,
        repairPrompt: "",
        shouldRollback: true,
      };
    }

    const nextStrikeNumber = (state.currentStrike + 1) as 1 | 2 | 3;
    const instructions = this.compileRepairPrompt(
      nextStrikeNumber,
      errorDetails,
      diffSnapshot
    );

    const strikeRecord: RepairStrike = {
      strikeNumber: nextStrikeNumber,
      errorDetails,
      diffSnapshot,
      instructions,
      timestamp: new Date().toISOString(),
    };

    const isTerminated = nextStrikeNumber >= state.maxStrikes;
    const shouldRollback = isTerminated;

    const nextState: RepairState = {
      currentStrike: nextStrikeNumber,
      maxStrikes: state.maxStrikes,
      isTerminated,
      history: [...state.history, strikeRecord],
    };

    return {
      nextState,
      repairPrompt: instructions,
      shouldRollback,
    };
  }

  /**
   * Compiles the specialized repair prompt for each strike tier.
   */
  public compileRepairPrompt(
    strikeNumber: number,
    errorDetails: string,
    diffSnapshot?: string
  ): string {
    const sections: string[] = [];

    if (strikeNumber === 1) {
      // Strike 1: Targeted error fix based on test stack trace
      sections.push("# Automated Repair Request: Strike 1 (Targeted Test Fix)");
      sections.push(
        "The previous code modification failed verification. Review the exact error logs below and provide a minimal, targeted fix without modifying unrelated code."
      );
      sections.push("## Verification Error Log\n```\n" + errorDetails.trim() + "\n```");
      sections.push(
        "Focus strictly on resolving the assertion failures or compilation errors above."
      );
    } else if (strikeNumber === 2) {
      // Strike 2: Review and dependency / side-effect fix
      sections.push("# Automated Repair Request: Strike 2 (Review & Dependency Fix)");
      sections.push(
        "The previous repair attempt still failed verification. Analyze the existing diff for missed imports, unintended side-effects, or broken type contracts."
      );
      sections.push("## Verification Error Log\n```\n" + errorDetails.trim() + "\n```");
      if (diffSnapshot) {
        sections.push("## Recent Changes Diff\n```diff\n" + diffSnapshot.trim() + "\n```");
      }
      sections.push(
        "Ensure all exports, imports, and type signatures are properly aligned with project dependencies."
      );
    } else {
      // Strike 3: Termination warning
      sections.push("# Automated Repair Request: Strike 3 (Final Attempt Before Revert)");
      sections.push(
        "Final automated repair attempt before automatic termination and workspace rollback."
      );
      sections.push("## Verification Error Log\n```\n" + errorDetails.trim() + "\n```");
    }

    return sections.join("\n\n");
  }
}
