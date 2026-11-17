import { describe, it, expect } from "vitest";
import {
  calculateShannonEntropy,
  extractHighEntropyTokens,
} from "@/lib/agents/engine/verification/secret-scanner/entropy";
import {
  generateSecretFingerprint,
  redactSecretToken,
  KNOWN_SECRET_PATTERNS,
} from "@/lib/agents/engine/verification/secret-scanner/patterns";
import {
  SecretScanner,
  secretScanner,
} from "@/lib/agents/engine/verification/secret-scanner/secret-scanner";

describe("Shannon Entropy Calculator (REQ-VR-03, NFR-SEC-02)", () => {
  it("computes 0 entropy for empty or single-character strings", () => {
    expect(calculateShannonEntropy("")).toBe(0);
    expect(calculateShannonEntropy("aaaaaa")).toBe(0);
  });

  it("computes higher entropy for high-diversity random strings", () => {
    const lowEntropy = "abcabcabcabc";
    const highEntropy = "x8K9!mQ2#zL5@pW1$vB7%jN4";

    const scoreLow = calculateShannonEntropy(lowEntropy);
    const scoreHigh = calculateShannonEntropy(highEntropy);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
    expect(scoreHigh).toBeGreaterThan(4.0);
  });

  it("filters out UUIDs and Git commit hashes from high-entropy findings", () => {
    const uuidLine = "const id = '123e4567-e89b-12d3-a456-426614174000';";
    const shaLine = "const commit = 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2';";

    expect(extractHighEntropyTokens(uuidLine)).toHaveLength(0);
    expect(extractHighEntropyTokens(shaLine)).toHaveLength(0);
  });

  it("filters out common test placeholder prefixes", () => {
    const placeholderLine = "const key = 'sk-xxx-placeholder-1234567890abcdef';";
    expect(extractHighEntropyTokens(placeholderLine)).toHaveLength(0);
  });
});

describe("Secret Patterns & Fingerprinting (REQ-VR-03, NFR-SEC-02)", () => {
  it("generates deterministic 16-character SHA-256 fingerprint", () => {
    const token = "sk-test-secret-token-123456789";
    const fp1 = generateSecretFingerprint(token);
    const fp2 = generateSecretFingerprint(token);

    expect(fp1).toHaveLength(16);
    expect(fp1).toBe(fp2);
  });

  it("redacts sensitive tokens keeping only first 2 and last 2 characters", () => {
    const token = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890-XYZ99";
    const redacted = redactSecretToken(token);

    expect(redacted).toBe("[REDACTED_SECRET:sk...99]");
    expect(redacted).not.toContain("abcdefgh");
  });

  it("matches major cloud and AI provider credential patterns", () => {
    const sampleAnthropic = "sk-ant-api03-" + "a".repeat(85);
    const sampleOpenRouter = "sk-or-v1-" + "b".repeat(64);
    const sampleGemini = "AIzaSy" + "c".repeat(33);
    const sampleGithub = "ghp_" + "d".repeat(36);
    const sampleDbUri = "postgres://admin:superSecretP@ssword@db.supabase.co:5432/main";

    const matchType = (text: string) => KNOWN_SECRET_PATTERNS.find((p) => p.regex.test(text))?.type;

    expect(matchType(sampleAnthropic)).toBe("anthropic_key");
    expect(matchType(sampleOpenRouter)).toBe("openrouter_key");
    expect(matchType(sampleGemini)).toBe("google_gemini_key");
    expect(matchType(sampleGithub)).toBe("github_token");
    expect(matchType(sampleDbUri)).toBe("database_connection");
  });
});

describe("SecretScanner Orchestrator (REQ-VR-03, NFR-SEC-02)", () => {
  it("passes clean text with zero findings", () => {
    const cleanText = `
      export function sum(a: number, b: number): number {
        return a + b;
      }
    `;

    const report = secretScanner.scanText(cleanText, "src/calc.ts");

    expect(report.passed).toBe(true);
    expect(report.findings).toHaveLength(0);
    expect(report.markdownSummary).toContain("# ✅ Secret & Entropy Scan Report (PASSED)");
  });

  it("blocks text containing known secret token and provides fingerprint", () => {
    const secretLine = "const token = 'ghp_123456789012345678901234567890123456';";
    const report = secretScanner.scanText(secretLine, "src/auth.ts");

    expect(report.passed).toBe(false);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.secretType).toBe("github_token");
    expect(report.findings[0]?.severity).toBe("blocker");
    expect(report.findings[0]?.fingerprint).toBeDefined();
    expect(report.markdownSummary).toContain("# ❌ Secret & Entropy Scan Report (BLOCKED)");
    expect(report.markdownSummary).toContain("Human Approval Override Instructions");
  });

  it("allows secret when fingerprint is in allowedFingerprints whitelist", () => {
    const secretLine = "const token = 'ghp_123456789012345678901234567890123456';";
    const rawFp = generateSecretFingerprint("ghp_123456789012345678901234567890123456");

    const report = secretScanner.scanText(secretLine, "src/auth.ts", {
      allowedFingerprints: [rawFp],
    });

    expect(report.passed).toBe(true); // Overridden finding does not block
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.severity).toBe("warning");
    expect(report.findings[0]?.isOverridden).toBe(true);
    expect(report.markdownSummary).toContain("Overridden by Owner Approval");
  });

  it("scans unified diff patch additions while ignoring deleted lines", () => {
    const dummyOldKey = "sk-or-v1-" + "0".repeat(64);
    const dummyNewKey = "sk-or-v1-" + "b".repeat(64);
    const diffWithSecret = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,2 +1,3 @@
-const oldKey = "${dummyOldKey}";
 const normal = 1;
+const openRouterKey = "${dummyNewKey}";
`;

    const report = secretScanner.scanDiff(diffWithSecret);

    expect(report.passed).toBe(false);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.secretType).toBe("openrouter_key");
    expect(report.findings[0]?.file).toBe("src/config.ts");
    expect(report.markdownSummary).toContain("src/config.ts");
  });
});
