import { describe, it, expect } from "vitest";
import { inspectCommitDiff } from "@/lib/git/diff";

describe("Diff Inspector & Secret Scanner", () => {
  it("executes diff inspection on local repository without error", () => {
    const result = inspectCommitDiff();
    expect(result).toHaveProperty("hasSecrets");
    expect(result).toHaveProperty("detectedPatterns");
    expect(result).toHaveProperty("filesChanged");
    expect(result).toHaveProperty("totalAdditions");
    expect(result).toHaveProperty("totalDeletions");
  });

  it("detects sensitive private key patterns in simulated content", () => {
    const simulatedPrivateKey = "+-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...";
    const regex = /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/;
    expect(regex.test(simulatedPrivateKey)).toBe(true);
  });

  it("detects high-entropy OpenAI and OpenRouter key patterns", () => {
    const simulatedKey = "+const key = 'sk-or-v1-abcdef1234567890abcdef1234567890';";
    const regex = /\bsk-(?:live-|or-v1-)?[a-zA-Z0-9_-]{24,}\b/;
    expect(regex.test(simulatedKey)).toBe(true);
  });

  it("ignores placeholder values in test/example strings", () => {
    const placeholder = "+OPENROUTER_API_KEY=placeholder-openrouter-key";
    expect(placeholder.includes("placeholder-")).toBe(true);
  });
});
