import { describe, it, expect } from "vitest";
import { verifyGitHubWebhookSignature } from "@/lib/github/webhook";
import crypto from "crypto";

describe("verifyGitHubWebhookSignature", () => {
  const secret = "test-github-webhook-secret-12345";
  const rawBody = JSON.stringify({ ref: "refs/heads/main", after: "a1b2c3d4e5" });

  function generateSignature(body: string, sec: string): string {
    const hash = crypto.createHmac("sha256", sec).update(body, "utf-8").digest("hex");
    return `sha256=${hash}`;
  }

  it("returns true for a valid HMAC SHA-256 signature", () => {
    const validSignature = generateSignature(rawBody, secret);
    const result = verifyGitHubWebhookSignature(rawBody, validSignature, secret);
    expect(result).toBe(true);
  });

  it("returns false if the signature was generated with a different secret", () => {
    const wrongSignature = generateSignature(rawBody, "wrong-secret-value");
    const result = verifyGitHubWebhookSignature(rawBody, wrongSignature, secret);
    expect(result).toBe(false);
  });

  it("returns false if the body payload was modified after signing", () => {
    const validSignature = generateSignature(rawBody, secret);
    const modifiedBody = rawBody + " ";
    const result = verifyGitHubWebhookSignature(modifiedBody, validSignature, secret);
    expect(result).toBe(false);
  });

  it("returns false if signature header is missing or empty", () => {
    expect(verifyGitHubWebhookSignature(rawBody, null, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(rawBody, undefined, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(rawBody, "", secret)).toBe(false);
  });

  it("returns false if signature header does not start with sha256=", () => {
    const hashOnly = crypto.createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
    expect(verifyGitHubWebhookSignature(rawBody, hashOnly, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(rawBody, `sha1=${hashOnly}`, secret)).toBe(false);
  });

  it("returns true if no secret is configured (optional verification in dev)", () => {
    const originalEnv = process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;

    expect(verifyGitHubWebhookSignature(rawBody, null)).toBe(true);

    process.env.GITHUB_WEBHOOK_SECRET = originalEnv;
  });
});
