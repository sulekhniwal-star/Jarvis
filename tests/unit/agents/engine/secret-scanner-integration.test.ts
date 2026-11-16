import { describe, it, expect, vi } from "vitest";
import { VerificationHarness } from "@/lib/agents/engine/verification/verification-harness";
import { generateSecretFingerprint } from "@/lib/agents/engine/verification/secret-scanner/patterns";
import { validatePrePush } from "@/lib/git/push-validator";

describe("SecretScanner & VerificationHarness Integration (REQ-VR-03, NFR-SEC-02)", () => {
  it("blocks verification harness execution when diff contains an unapproved secret", async () => {
    const secretToken = "sk-ant-api03-" + "x".repeat(85);
    const diffWithSecret = `diff --git a/src/llm.ts b/src/llm.ts
--- a/src/llm.ts
+++ b/src/llm.ts
@@ -1,1 +1,2 @@
+const key = "${secretToken}";
`;

    const mockRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "Tests 1 passed",
      stderr: "",
      durationMs: 10,
    });

    const harness = new VerificationHarness(
      {
        stages: ["test"],
        failFast: true,
        diffPatch: diffWithSecret,
      },
      mockRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("failed");
    expect(result.failureDetails).toContain("Secret scan security gate failed");
    expect(result.secretReport).toBeDefined();
    expect(result.secretReport?.passed).toBe(false);

    // Fail-fast skips the test stage
    expect(result.stages[0]?.status).toBe("skipped");

    const secretArtifact = result.artifacts.find((a) => a.name === "secret-scan.md");
    expect(secretArtifact).toBeDefined();
    expect(secretArtifact?.content).toContain("# ❌ Secret & Entropy Scan Report (BLOCKED)");
    expect(secretArtifact?.content).toContain("ANTHROPIC_KEY");
  });

  it("permits verification harness execution when secret fingerprint is in allowedSecretFingerprints", async () => {
    const secretToken = "sk-ant-api03-" + "y".repeat(85);
    const fingerprint = generateSecretFingerprint(secretToken);

    const diffWithSecret = `diff --git a/src/llm.ts b/src/llm.ts
--- a/src/llm.ts
+++ b/src/llm.ts
@@ -1,1 +1,2 @@
+const key = "${secretToken}";
`;

    const mockRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "Tests 1 passed",
      stderr: "",
      durationMs: 10,
    });

    const harness = new VerificationHarness(
      {
        stages: ["test"],
        diffPatch: diffWithSecret,
        allowedSecretFingerprints: [fingerprint],
      },
      mockRunner
    );

    const result = await harness.runAll();

    expect(result.status).toBe("passed");
    expect(result.secretReport).toBeDefined();
    expect(result.secretReport?.passed).toBe(true);

    const secretArtifact = result.artifacts.find((a) => a.name === "secret-scan.md");
    expect(secretArtifact).toBeDefined();
    expect(secretArtifact?.content).toContain("# ✅ Secret & Entropy Scan Report (PASSED)");
    expect(secretArtifact?.content).toContain("Overridden by Owner Approval");
  });
});

describe("SecretScanner & Pre-Push Validator Integration (REQ-GH-03, REQ-VR-03)", () => {
  it("allows push validation to pass when secret is whitelisted via allowedSecretFingerprints", () => {
    const secretToken = "ghp_" + "1".repeat(36);
    const fingerprint = generateSecretFingerprint(secretToken);

    const mockGitExec = vi.fn().mockImplementation((args: string[]) => {
      const command = args.join(" ");

      if (command.includes("branch --show-current")) return "main\n";
      if (command.includes("status --porcelain")) return "";
      if (command.includes("log -1 --format=%H%x09%s")) return "sha123\thead message\n";
      if (command.includes("rev-list --count origin/main..HEAD")) return "1\n";
      if (command.includes("rev-list --count HEAD..origin/main")) return "0\n";
      if (command.includes("log origin/main..HEAD")) return "sha123\tshort\tcommit\tauthor\t2026-11-16\n";
      if (command.includes("diff --name-only origin/main..HEAD")) return "src/auth.ts\n";
      if (command.includes("diff origin/main..HEAD")) {
        return `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,1 +1,2 @@
+const token = "${secretToken}";
`;
      }
      return "";
    });

    const result = validatePrePush({
      gitExec: mockGitExec,
      allowedSecretFingerprints: [fingerprint],
    });

    expect(result.isReady).toBe(true);
    expect(result.hasSecrets).toBe(false);
    expect(result.detectedSecretFindings).toHaveLength(1);
    expect(result.detectedSecretFindings?.[0]?.isOverridden).toBe(true);
  });
});
