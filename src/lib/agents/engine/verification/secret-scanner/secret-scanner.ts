import {
  SecretFinding,
  SecretScanOptions,
  SecretScanReport,
} from "./types";
import {
  KNOWN_SECRET_PATTERNS,
  generateSecretFingerprint,
  redactSecretToken,
} from "./patterns";
import { extractHighEntropyTokens } from "./entropy";

/**
 * Pre-Commit Entropy & Secret Scanner (REQ-VR-03, NFR-SEC-02).
 */
export class SecretScanner {
  /**
   * Scans a text string for known credentials and high-entropy secret candidates.
   */
  public scanText(
    text: string,
    filePath?: string,
    options: SecretScanOptions = {}
  ): SecretScanReport {
    if (!text || typeof text !== "string") {
      return {
        passed: true,
        findings: [],
        scannedLinesCount: 0,
        secretsCount: 0,
        markdownSummary: "# ✅ Secret Scan Report (PASSED)\nNo content to scan.",
      };
    }

    const lines = text.split("\n");
    const findings: SecretFinding[] = [];
    const allowedFingerprints = new Set(options.allowedFingerprints || []);

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (rawLine === undefined) continue;
      const lineNumber = i + 1;

      this.inspectLine(
        rawLine,
        lineNumber,
        filePath,
        options,
        allowedFingerprints,
        findings
      );
    }

    const blockerCount = findings.filter((f) => f.severity === "blocker").length;
    const passed = blockerCount === 0;

    const report: SecretScanReport = {
      passed,
      findings,
      scannedLinesCount: lines.length,
      secretsCount: findings.length,
      markdownSummary: "",
    };

    report.markdownSummary = this.generateMarkdownSummary(report);
    return report;
  }

  /**
   * Scans a unified git diff patch, specifically inspecting added code lines (`+`).
   */
  public scanDiff(
    rawDiff: string,
    options: SecretScanOptions = {}
  ): SecretScanReport {
    if (!rawDiff || typeof rawDiff !== "string") {
      return {
        passed: true,
        findings: [],
        scannedLinesCount: 0,
        secretsCount: 0,
        markdownSummary: "# ✅ Secret Scan Report (PASSED)\nEmpty or invalid diff.",
      };
    }

    const lines = rawDiff.split("\n");
    const findings: SecretFinding[] = [];
    const allowedFingerprints = new Set(options.allowedFingerprints || []);
    let currentFile = "unknown";
    let currentNewLine = 0;
    let addedLinesCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;

      if (line.startsWith("diff --git a/")) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        currentFile = match && match[2] ? match[2].trim() : "unknown";
        continue;
      }

      if (line.startsWith("@@ ")) {
        const hunkMatch = line.match(/\+(\d+)(?:,(\d+))?\s+@@/);
        if (hunkMatch && hunkMatch[1]) {
          currentNewLine = parseInt(hunkMatch[1], 10);
        }
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        addedLinesCount++;
        const addedContent = line.substring(1);
        const lineNumber = currentNewLine++;

        this.inspectLine(
          addedContent,
          lineNumber,
          currentFile,
          options,
          allowedFingerprints,
          findings
        );
      } else if (!line.startsWith("-")) {
        currentNewLine++;
      }
    }

    const blockerCount = findings.filter((f) => f.severity === "blocker").length;
    const passed = blockerCount === 0;

    const report: SecretScanReport = {
      passed,
      findings,
      scannedLinesCount: addedLinesCount,
      secretsCount: findings.length,
      markdownSummary: "",
    };

    report.markdownSummary = this.generateMarkdownSummary(report);
    return report;
  }

  private inspectLine(
    content: string,
    lineNumber: number,
    filePath: string | undefined,
    options: SecretScanOptions,
    allowedFingerprints: Set<string>,
    findings: SecretFinding[]
  ): void {
    const matchedTokens = new Set<string>();

    // 1. Check known credential patterns
    for (const patternDef of KNOWN_SECRET_PATTERNS) {
      const match = patternDef.regex.exec(content);
      if (match) {
        const rawToken = match[0];
        matchedTokens.add(rawToken);

        const fingerprint = generateSecretFingerprint(rawToken);
        const isOverridden = allowedFingerprints.has(fingerprint);

        findings.push({
          secretType: patternDef.type,
          name: patternDef.name,
          line: lineNumber,
          file: filePath,
          description: patternDef.description,
          redactedSnippet: redactSecretToken(rawToken),
          fingerprint,
          severity: isOverridden ? "warning" : "blocker",
          isOverridden,
        });
      }
    }

    // 2. Check high-entropy tokens
    const minEntropy = options.minEntropyThreshold ?? 4.3;
    const entropyTokens = extractHighEntropyTokens(
      content,
      minEntropy,
      options.allowPlaceholders ?? false
    );

    for (const item of entropyTokens) {
      // Avoid duplicate reports if already caught by a known pattern
      if (Array.from(matchedTokens).some((m) => m.includes(item.token) || item.token.includes(m))) {
        continue;
      }

      const fingerprint = generateSecretFingerprint(item.token);
      const isOverridden = allowedFingerprints.has(fingerprint);

      findings.push({
        secretType: "generic_high_entropy",
        name: "High-Entropy Secret",
        line: lineNumber,
        file: filePath,
        description: `High-entropy random string (H=${item.entropy.toFixed(2)} bits/char)`,
        redactedSnippet: redactSecretToken(item.token),
        fingerprint,
        entropyScore: Number(item.entropy.toFixed(2)),
        severity: isOverridden ? "warning" : "blocker",
        isOverridden,
      });
    }
  }

  /**
   * Formats a clean Markdown summary report for Web Dashboard, Telegram, and audit logs.
   */
  public generateMarkdownSummary(report: SecretScanReport): string {
    const statusEmoji = report.passed ? "✅" : "❌";
    const statusText = report.passed ? "PASSED" : "BLOCKED";
    const lines: string[] = [];

    lines.push(`# ${statusEmoji} Secret & Entropy Scan Report (${statusText})`);
    lines.push(
      `- **Lines Scanned:** ${report.scannedLinesCount} | **Secrets Found:** ${report.secretsCount}`
    );

    if (report.findings.length === 0) {
      lines.push("\nNo sensitive credentials or high-entropy secrets detected.");
      return lines.join("\n");
    }

    lines.push("\n## Detected Sensitive Findings");
    for (const finding of report.findings) {
      const icon = finding.severity === "blocker" ? "🛑" : "⚠️";
      const overrideNote = finding.isOverridden ? " *(Overridden by Owner Approval)*" : "";
      const fileRef = finding.file ? ` in \`${finding.file}:${finding.line}\`` : ` on line ${finding.line}`;
      const entropyNote = finding.entropyScore ? ` (Entropy: ${finding.entropyScore})` : "";

      lines.push(
        `- ${icon} **${finding.secretType.toUpperCase()}** [${finding.severity.toUpperCase()}]${fileRef}:`
      );
      lines.push(
        `  - **Description:** ${finding.description}${entropyNote}${overrideNote}`
      );
      lines.push(
        `  - **Redacted Snippet:** \`${finding.redactedSnippet}\` | **Fingerprint:** \`${finding.fingerprint}\``
      );
    }

    if (!report.passed) {
      lines.push("\n### 🔒 Human Approval Override Instructions");
      lines.push(
        "To allow an intentional test fixture or token, approve the finding's fingerprint via Telegram approval card or submit an approval request with the fingerprint to the Approval Gate."
      );
    }

    return lines.join("\n");
  }
}

export const secretScanner = new SecretScanner();
