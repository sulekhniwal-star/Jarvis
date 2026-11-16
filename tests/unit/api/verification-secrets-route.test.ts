import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/verification/secrets/route";
import { generateSecretFingerprint } from "@/lib/agents/engine/verification/secret-scanner/patterns";

describe("/api/verification/secrets Route Handlers (REQ-VR-03, NFR-SEC-02)", () => {
  describe("GET /api/verification/secrets", () => {
    it("returns supported secret types, entropy thresholds, and override instructions", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.description).toContain("Pre-Commit Entropy & Secret Scanner");
      expect(data.entropyThreshold).toBe(4.3);
      expect(data.supportedSecretTypes).toContain("openai_key");
      expect(data.supportedSecretTypes).toContain("anthropic_key");
      expect(data.supportedSecretTypes).toContain("database_connection");
      expect(data.overrideInstructions).toBeDefined();
    });
  });

  describe("POST /api/verification/secrets", () => {
    it("returns 200 with passed scan report on clean text", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "export const version = '1.0.0';",
          isDiff: false,
          filePath: "src/version.ts",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.passed).toBe(true);
      expect(data.findings).toHaveLength(0);
      expect(data.markdownSummary).toContain("PASSED");
    });

    it("returns 200 with blocked report when diff contains a credential", async () => {
      const secretToken = "sk-or-v1-" + "f".repeat(64);
      const diff = `diff --git a/src/secret.ts b/src/secret.ts
--- a/src/secret.ts
+++ b/src/secret.ts
@@ -1,1 +1,2 @@
+const key = "${secretToken}";
`;

      const request = new NextRequest("http://localhost:3000/api/verification/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: diff,
          isDiff: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.passed).toBe(false);
      expect(data.findings).toHaveLength(1);
      expect(data.findings[0]?.secretType).toBe("openrouter_key");
      expect(data.findings[0]?.severity).toBe("blocker");
      expect(data.findings[0]?.redactedSnippet).toContain("[REDACTED_SECRET:");
      expect(data.markdownSummary).toContain("BLOCKED");
    });

    it("allows secret to pass when fingerprint is in allowedFingerprints whitelist", async () => {
      const secretToken = "sk-or-v1-" + "a".repeat(64);
      const fingerprint = generateSecretFingerprint(secretToken);

      const request = new NextRequest("http://localhost:3000/api/verification/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `const testKey = "${secretToken}";`,
          isDiff: false,
          allowedFingerprints: [fingerprint],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.passed).toBe(true);
      expect(data.findings).toHaveLength(1);
      expect(data.findings[0]?.severity).toBe("warning");
      expect(data.findings[0]?.isOverridden).toBe(true);
      expect(data.markdownSummary).toContain("Overridden by Owner Approval");
    });

    it("returns 400 when content is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/verification/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDiff: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_FAILED");
    });
  });
});
