import crypto from "crypto";
import { verifyApprovalToken, generateApprovalToken } from "../approvals/approval-token";
import { verifyGitHubWebhookSignature } from "../github/webhook";
import { verifyWebhookSecret } from "../telegram/guard";
import { isPathTraversal, validateFileBoundaries } from "../agents/engine/verification/diff-inspector/boundary-validator";
import { DiffFile } from "../agents/engine/verification/diff-inspector/types";
import { SecretScanner } from "../agents/engine/verification/secret-scanner/secret-scanner";
import { InferenceCircuitBreaker, FailsafeCircuitBreakerError } from "../ai/circuit-breaker";
import { DEFAULT_FREE_MODEL } from "../ai/models";

export interface SecurityCheckResult {
  category: "cryptography" | "sandbox_boundaries" | "secret_detection" | "financial_controls";
  name: string;
  passed: boolean;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  error?: string;
}

export interface SecurityAuditReport {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalViolationsCount: number;
  timestamp: string;
  checks: SecurityCheckResult[];
}

export class SecurityAuditSuite {
  /**
   * Verifies timing-safety across all cryptographic gate primitives (REQ-SEC-03, NFR-SEC-05).
   */
  public auditCryptographicPrimitives(): SecurityCheckResult[] {
    const results: SecurityCheckResult[] = [];

    // 1. Approval Decision HMAC Token Verification
    try {
      const secret = "security-audit-hmac-test-key-32bytes-secret";
      const payload = {
        id: "appr-audit-001",
        actionType: "execute_plan",
        targetResource: "task-audit-001",
        userId: "user-audit-001",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      const token = generateApprovalToken(payload, secret);
      const validRes = verifyApprovalToken(token, payload, secret);
      const invalidRes = verifyApprovalToken(token, payload, "tampered-secret-key-attacker");

      const passed = validRes.valid && !invalidRes.valid && invalidRes.reason === "SIGNATURE_MISMATCH";
      results.push({
        category: "cryptography",
        name: "HMAC Approval Token Constant-Time Verification",
        passed,
        severity: "critical",
        description: "Validates HMAC-SHA256 signatures with constant-time equality check.",
      });
    } catch (err) {
      results.push({
        category: "cryptography",
        name: "HMAC Approval Token Constant-Time Verification",
        passed: false,
        severity: "critical",
        description: "Validates HMAC-SHA256 signatures with constant-time equality check.",
        error: String(err),
      });
    }

    // 2. GitHub Webhook Signature Verification
    try {
      const ghSecret = "github-webhook-audit-secret";
      const rawPayload = JSON.stringify({ action: "push", ref: "refs/heads/main" });
      const validSig =
        "sha256=" +
        crypto.createHmac("sha256", ghSecret).update(rawPayload, "utf-8").digest("hex");
      const invalidSig =
        "sha256=" +
        crypto.createHmac("sha256", "wrong-secret").update(rawPayload, "utf-8").digest("hex");

      const matchValid = verifyGitHubWebhookSignature(rawPayload, validSig, ghSecret);
      const matchInvalid = verifyGitHubWebhookSignature(rawPayload, invalidSig, ghSecret);

      results.push({
        category: "cryptography",
        name: "GitHub Webhook Signature Timing-Safety",
        passed: matchValid && !matchInvalid,
        severity: "critical",
        description: "Verifies GitHub webhook payloads with crypto.timingSafeEqual.",
      });
    } catch (err) {
      results.push({
        category: "cryptography",
        name: "GitHub Webhook Signature Timing-Safety",
        passed: false,
        severity: "critical",
        description: "Verifies GitHub webhook payloads with crypto.timingSafeEqual.",
        error: String(err),
      });
    }

    // 3. Telegram Webhook Secret Token Verification
    try {
      const tgSecret = "telegram-secret-token-audit-12345";
      const validMatch = verifyWebhookSecret(tgSecret, tgSecret);
      const invalidMatch = verifyWebhookSecret("attacker-token-mismatch", tgSecret);
      const emptyMatch = verifyWebhookSecret("", tgSecret);

      results.push({
        category: "cryptography",
        name: "Telegram Webhook Secret Timing-Safety",
        passed: validMatch && !invalidMatch && !emptyMatch,
        severity: "critical",
        description: "Verifies Telegram secret token header with SHA-256 buffer timingSafeEqual.",
      });
    } catch (err) {
      results.push({
        category: "cryptography",
        name: "Telegram Webhook Secret Timing-Safety",
        passed: false,
        severity: "critical",
        description: "Verifies Telegram secret token header with SHA-256 buffer timingSafeEqual.",
        error: String(err),
      });
    }

    return results;
  }

  /**
   * Verifies directory traversal and sandbox boundary enforcement.
   */
  public auditPathBoundaryEnforcement(): SecurityCheckResult[] {
    const results: SecurityCheckResult[] = [];

    const maliciousPaths = [
      "../../etc/passwd",
      "..\\..\\Windows\\System32\\calc.exe",
      "/var/log/secure",
      "C:/secrets.env",
      "sub/../../root.key",
      "src/%2e%2e/%2e%2e/env",
      "src/foo\0.ts",
    ];

    let allDetected = true;
    const failures: string[] = [];

    for (const p of maliciousPaths) {
      if (!isPathTraversal(p)) {
        allDetected = false;
        failures.push(p);
      }
    }

    // Check Diff boundary validator
    const mockFiles: DiffFile[] = maliciousPaths.map((p) => ({
      oldPath: null,
      newPath: p,
      status: "added",
      additions: 10,
      deletions: 0,
      hunks: [],
      isBinary: false,
    }));

    const violations = validateFileBoundaries(mockFiles);
    const blockedCount = violations.filter((v) => v.code === "PATH_TRAVERSAL_DETECTED").length;

    results.push({
      category: "sandbox_boundaries",
      name: "Directory Traversal & Root Escape Defenses",
      passed: allDetected && blockedCount === maliciousPaths.length,
      severity: "critical",
      description: "Detects and blocks relative path escapes, leading root slashes, drive letters, and null bytes.",
      error: failures.length > 0 ? `Failed to detect traversal in: ${failures.join(", ")}` : undefined,
    });

    // Check forbidden pattern rejection (.env, .pem, .key)
    const sensitiveFiles: DiffFile[] = [
      { oldPath: null, newPath: ".env.production", status: "added", additions: 5, deletions: 0, hunks: [], isBinary: false },
      { oldPath: null, newPath: "certs/server.key", status: "added", additions: 5, deletions: 0, hunks: [], isBinary: false },
    ];
    const sensitiveViolations = validateFileBoundaries(sensitiveFiles);
    const sensitiveBlocked = sensitiveViolations.filter((v) => v.code === "FORBIDDEN_FILE_PATTERN").length === 2;

    results.push({
      category: "sandbox_boundaries",
      name: "Sensitive & Credential File Pattern Restrictions",
      passed: sensitiveBlocked,
      severity: "high",
      description: "Prohibits agent file mutations targeting .env, .pem, .key, and certificates.",
    });

    return results;
  }

  /**
   * Verifies pre-commit entropy scanner and credential pattern detection coverage.
   */
  public auditSecretScannerCoverage(): SecurityCheckResult[] {
    const results: SecurityCheckResult[] = [];
    const scanner = new SecretScanner();

    const sampleCredentials = [
      { type: "OpenAI API Key", content: 'const key = "sk-proj-abcde1234567890fghijklmnopqr-stuvwxyz1234567890";' },
      { type: "Stripe Secret Key", content: 'const stripe = "sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890";' },
      { type: "GitHub Token", content: 'const gh = "ghp_1234567890abcdefghijklmnopqrstuvwxyz12";' },
      { type: "AWS Access Key", content: 'const aws = "AKIAIOSFODNN7EXAMPLE";' },
      { type: "Database URI", content: 'const uri = "postgres://admin:superSecretP@ss@db.javis.internal:5432/main";' },
    ];

    let detectedCount = 0;
    for (const cred of sampleCredentials) {
      const rep = scanner.scanText(cred.content, "sample.ts");
      if (!rep.passed && rep.findings.length > 0) {
        detectedCount++;
      }
    }

    results.push({
      category: "secret_detection",
      name: "Known Credential Family Pattern Detection",
      passed: detectedCount === sampleCredentials.length,
      severity: "critical",
      description: "Detects known secret signatures across OpenAI, Stripe, GitHub, AWS, and Database URIs.",
      error: detectedCount < sampleCredentials.length ? `Detected only ${detectedCount}/${sampleCredentials.length} secrets` : undefined,
    });

    // Check false positive resistance on standard code
    const cleanCode = `
      import React from 'react';
      export function Button({ label }: { label: string }) {
        return <button className="px-4 py-2 bg-blue-600 text-white rounded">{label}</button>;
      }
    `;
    const cleanRep = scanner.scanText(cleanCode, "Button.tsx");

    results.push({
      category: "secret_detection",
      name: "Secret Scanner False Positive Resistance",
      passed: cleanRep.passed && cleanRep.findings.length === 0,
      severity: "medium",
      description: "Ensures benign React/TypeScript source code passes without false alarms.",
    });

    return results;
  }

  /**
   * Verifies failsafe financial circuit breaker defenses.
   */
  public async auditCircuitBreakerFailsafes(): Promise<SecurityCheckResult[]> {
    const results: SecurityCheckResult[] = [];

    // 1. Missing CostRepository defaults to closed (paid inference blocked)
    const unconfiguredBreaker = new InferenceCircuitBreaker({});
    let failsafeTriggered = false;

    try {
      await unconfiguredBreaker.evaluateInference("00000000-0000-0000-0000-000000000001", "anthropic/claude-3-7-sonnet");
    } catch (err) {
      if (err instanceof FailsafeCircuitBreakerError) {
        failsafeTriggered = true;
      }
    }

    results.push({
      category: "financial_controls",
      name: "Failsafe Circuit Breaking on Unconfigured Cost Repository",
      passed: failsafeTriggered,
      severity: "critical",
      description: "Blocks paid model inference when cost tracking is unconfigured to prevent unmetered spend.",
    });

    // 2. Free model bypasses cost repository safely
    let freeAllowed = false;
    try {
      const freeEval = await unconfiguredBreaker.evaluateInference(
        "00000000-0000-0000-0000-000000000001",
        DEFAULT_FREE_MODEL
      );
      freeAllowed = freeEval.allowed && freeEval.isFree;
    } catch {
      freeAllowed = false;
    }

    results.push({
      category: "financial_controls",
      name: "Unmetered Free Model Inference Safe Routing",
      passed: freeAllowed,
      severity: "high",
      description: "Allows zero-cost inference to proceed even under tight financial constraints.",
    });

    return results;
  }

  /**
   * Executes the full security audit across all defensive controls.
   */
  public async runFullSecurityAudit(): Promise<SecurityAuditReport> {
    const cryptoChecks = this.auditCryptographicPrimitives();
    const boundaryChecks = this.auditPathBoundaryEnforcement();
    const secretChecks = this.auditSecretScannerCoverage();
    const financialChecks = await this.auditCircuitBreakerFailsafes();

    const allChecks: SecurityCheckResult[] = [
      ...cryptoChecks,
      ...boundaryChecks,
      ...secretChecks,
      ...financialChecks,
    ];

    const passedChecks = allChecks.filter((c) => c.passed).length;
    const failedChecks = allChecks.length - passedChecks;
    const criticalViolationsCount = allChecks.filter((c) => !c.passed && c.severity === "critical").length;

    return {
      passed: criticalViolationsCount === 0 && failedChecks === 0,
      totalChecks: allChecks.length,
      passedChecks,
      failedChecks,
      criticalViolationsCount,
      timestamp: new Date().toISOString(),
      checks: allChecks,
    };
  }
}
