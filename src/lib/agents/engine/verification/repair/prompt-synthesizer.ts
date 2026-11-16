import { FailureDiagnostic } from "./types";

export interface SynthesizerOptions {
  diffSnapshot?: string;
  allowedFiles?: string[];
}

/**
 * Targeted Repair Prompt Synthesizer (REQ-VR-04).
 * Generates strike-tiered, category-aware repair instructions for coding agents.
 */
export class RepairPromptSynthesizer {
  /**
   * Synthesizes a structured repair prompt based on the failure diagnostic and strike tier.
   */
  public synthesize(
    diagnostic: FailureDiagnostic,
    strikeNumber: number,
    options: SynthesizerOptions = {}
  ): string {
    const sections: string[] = [];
    const strike = Math.min(3, Math.max(1, strikeNumber));

    // 1. Strike Header & Tone
    const strikeTitles: Record<number, string> = {
      1: "Strike 1 (Targeted Surgical Fix)",
      2: "Strike 2 (Structural & Dependency Alignment)",
      3: "Strike 3 (Final Attempt Before Revert)",
    };

    sections.push(
      `# 🛠️ Automated Repair Request: ${strikeTitles[strike] || `Strike ${strike}`}`
    );

    // 2. High-Level Diagnosis & Remediation Strategy
    sections.push(
      `The previous code modification failed verification during the **${diagnostic.stage.toUpperCase()}** stage.`
    );
    sections.push(
      `- **Root Cause Category:** \`${diagnostic.category}\`\n- **Remediation Strategy:** ${diagnostic.suggestedStrategy}`
    );

    // 3. Primary Error & Code Snippets
    sections.push(`## Error Diagnostic\n\`\`\`\n${diagnostic.primaryError.trim()}\n\`\`\``);

    if (diagnostic.errorSnippets.length > 0) {
      sections.push(
        `## Error Log Details\n\`\`\`\n${diagnostic.errorSnippets.join("\n")}\n\`\`\``
      );
    }

    if (diagnostic.affectedFiles.length > 0) {
      sections.push(
        `## Identified Affected Files\n${diagnostic.affectedFiles
          .map((f) => `- \`${f}\``)
          .join("\n")}`
      );
    }

    // 4. Strike-Specific Guidance
    if (strike === 1) {
      sections.push(
        "## Strike 1 Directives\nApply a minimal, surgical fix addressing only the specific error above. Do not refactor or modify unrelated components."
      );
    } else if (strike === 2) {
      sections.push(
        "## Strike 2 Directives\nThe previous fix attempt did not pass verification. Step back and inspect imported types, module interfaces, edge cases, or side effects across the affected files."
      );
      if (options.diffSnapshot) {
        sections.push(
          `## Recent Diff Snapshot\n\`\`\`diff\n${options.diffSnapshot.trim()}\n\`\`\``
        );
      }
    } else if (strike === 3) {
      sections.push(
        "## Strike 3 Directives (CRITICAL)\n⚠️ **Final automated attempt before automatic workspace revert.** Make the most conservative, robust fix possible to satisfy compiler and test contracts."
      );
    }

    // 5. Strict Governance Guardrails
    sections.push("## Strict Governance Rules");
    if (options.allowedFiles && options.allowedFiles.length > 0) {
      sections.push(
        `- **Allowed Files Boundary:** You may ONLY edit files matching: ${options.allowedFiles
          .map((p) => `\`${p}\``)
          .join(", ")}.`
      );
    }
    sections.push("- **Zero Secret Leakage:** Never insert actual API keys, credentials, or private keys.");
    sections.push("- **Clean Code Standard:** Never leave `console.log`, `debugger`, or test focus markers (`it.only`, `test.only`).");
    sections.push("- **Preserve Existing Tests:** Never delete or alter assertions in existing test files to make tests pass artificially.");

    return sections.join("\n\n");
  }
}

export const repairPromptSynthesizer = new RepairPromptSynthesizer();
