import { describe, it, expect } from "vitest";
import { verifyWebhookSecret } from "@/lib/telegram/guard";
import {
  isPathTraversal,
  validateFileBoundaries,
} from "@/lib/agents/engine/verification/diff-inspector/boundary-validator";
import { DiffFile } from "@/lib/agents/engine/verification/diff-inspector/types";
import { SecurityAuditSuite } from "@/lib/security/audit-suite";

describe("Cryptographic Timing-Safety & Sandbox Boundaries (REQ-SEC-03, NFR-SEC-05)", () => {
  describe("Telegram Webhook Secret Verification (Timing-Safe)", () => {
    const validSecret = "production-secure-telegram-token-secret-999";

    it("accepts valid secret token matching expected secret", () => {
      const match = verifyWebhookSecret(validSecret, validSecret);
      expect(match).toBe(true);
    });

    it("rejects mismatched token with timing-safe comparison", () => {
      const match = verifyWebhookSecret("attacker-token-guess", validSecret);
      expect(match).toBe(false);
    });

    it("rejects prefix-matching token of different length", () => {
      const prefixToken = validSecret.substring(0, 10);
      const match = verifyWebhookSecret(prefixToken, validSecret);
      expect(match).toBe(false);
    });

    it("rejects null or undefined or empty token when secret is configured", () => {
      expect(verifyWebhookSecret(null, validSecret)).toBe(false);
      expect(verifyWebhookSecret(undefined, validSecret)).toBe(false);
      expect(verifyWebhookSecret("", validSecret)).toBe(false);
    });

    it("passes unconditionally if expected secret is not configured", () => {
      // When customSecret is empty and process.env.TELEGRAM_WEBHOOK_SECRET is empty
      const origEnv = process.env.TELEGRAM_WEBHOOK_SECRET;
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
      try {
        expect(verifyWebhookSecret("any-token")).toBe(true);
      } finally {
        if (origEnv) process.env.TELEGRAM_WEBHOOK_SECRET = origEnv;
      }
    });
  });

  describe("Directory Traversal & Root Escape Detection", () => {
    it("flags relative directory traversal patterns", () => {
      expect(isPathTraversal("../../etc/passwd")).toBe(true);
      expect(isPathTraversal("..\\..\\windows\\system32\\cmd.exe")).toBe(true);
      expect(isPathTraversal("src/components/../../../secret.key")).toBe(true);
      expect(isPathTraversal("foo/bar/..")).toBe(true);
      expect(isPathTraversal("../root")).toBe(true);
    });

    it("flags absolute Unix paths escaping workspace root", () => {
      expect(isPathTraversal("/etc/shadow")).toBe(true);
      expect(isPathTraversal("/var/data")).toBe(true);
    });

    it("flags absolute Windows drive letters escaping workspace root", () => {
      expect(isPathTraversal("C:/Windows/System32")).toBe(true);
      expect(isPathTraversal("d:\\secrets\\token.txt")).toBe(true);
    });

    it("flags URL encoded traversal sequences and null byte injections", () => {
      expect(isPathTraversal("src/%2e%2e/%2e%2e/env")).toBe(true);
      expect(isPathTraversal("src/app\0.ts")).toBe(true);
    });

    it("permits legitimate relative workspace paths", () => {
      expect(isPathTraversal("src/lib/feature.ts")).toBe(false);
      expect(isPathTraversal("tests/unit/security.test.ts")).toBe(false);
      expect(isPathTraversal("components/ui/button.tsx")).toBe(false);
      expect(isPathTraversal("package.json")).toBe(false);
    });

    it("emits PATH_TRAVERSAL_DETECTED blocker in validateFileBoundaries", () => {
      const maliciousFiles: DiffFile[] = [
        {
          oldPath: null,
          newPath: "../../etc/shadow",
          status: "added",
          additions: 10,
          deletions: 0,
          hunks: [],
          isBinary: false,
        },
      ];

      const violations = validateFileBoundaries(maliciousFiles);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0]?.code).toBe("PATH_TRAVERSAL_DETECTED");
      expect(violations[0]?.severity).toBe("blocker");
    });
  });

  describe("SecurityAuditSuite Engine", () => {
    it("executes full security audit with 100% passing controls", async () => {
      const suite = new SecurityAuditSuite();
      const report = await suite.runFullSecurityAudit();

      expect(report.passed).toBe(true);
      expect(report.criticalViolationsCount).toBe(0);
      expect(report.failedChecks).toBe(0);
      expect(report.passedChecks).toBe(report.totalChecks);
      expect(report.checks.length).toBeGreaterThanOrEqual(7);

      // Verify category coverage
      const categories = new Set(report.checks.map((c) => c.category));
      expect(categories).toContain("cryptography");
      expect(categories).toContain("sandbox_boundaries");
      expect(categories).toContain("secret_detection");
      expect(categories).toContain("financial_controls");
    });
  });
});
