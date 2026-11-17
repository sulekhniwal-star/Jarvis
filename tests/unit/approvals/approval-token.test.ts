import { describe, it, expect } from "vitest";
import {
  generateApprovalToken,
  verifyApprovalToken,
  extractTokenId,
  buildCanonicalString,
} from "@/lib/approvals/approval-token";

describe("Cryptographic Approval Token Engine (REQ-APP-02)", () => {
  const samplePayload = {
    id: "app-12345678-abcd",
    actionType: "git_remote_push",
    targetResource: "origin/main",
    userId: "usr-98765432-wxyz",
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  it("builds a deterministic canonical string representation", () => {
    const canonical = buildCanonicalString(samplePayload);
    expect(canonical).toContain("app-12345678-abcd");
    expect(canonical).toContain("git_remote_push");
    expect(canonical).toContain("origin/main");
    expect(canonical).toContain("usr-98765432-wxyz");
  });

  it("generates an HMAC-SHA256 token prefixed with the approval ID", () => {
    const token = generateApprovalToken(samplePayload, "test-secret-key-123");
    expect(token.startsWith("app-12345678-abcd.")).toBe(true);

    const parts = token.split(".");
    expect(parts.length).toBe(2);
    expect(parts[1].length).toBe(64); // 256 bits = 64 hex characters
  });

  it("extracts the approval ID cleanly from the token", () => {
    const token = generateApprovalToken(samplePayload);
    expect(extractTokenId(token)).toBe("app-12345678-abcd");
    expect(extractTokenId("invalid-format")).toBeNull();
    expect(extractTokenId("")).toBeNull();
  });

  it("verifies a valid token with matching attributes", () => {
    const token = generateApprovalToken(samplePayload, "my-secret");
    const result = verifyApprovalToken(token, samplePayload, "my-secret");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("rejects token when targetResource has been tampered with", () => {
    const token = generateApprovalToken(samplePayload, "my-secret");
    const tampered = {
      ...samplePayload,
      targetResource: "origin/production-release",
    };
    const result = verifyApprovalToken(token, tampered, "my-secret");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects token when actionType has been altered", () => {
    const token = generateApprovalToken(samplePayload, "my-secret");
    const tampered = {
      ...samplePayload,
      actionType: "destructive_db_mutation",
    };
    const result = verifyApprovalToken(token, tampered, "my-secret");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects token when userId does not match", () => {
    const token = generateApprovalToken(samplePayload, "my-secret");
    const tampered = {
      ...samplePayload,
      userId: "unauthorized-user-id",
    };
    const result = verifyApprovalToken(token, tampered, "my-secret");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects token when approval request has expired", () => {
    const expiredPayload = {
      ...samplePayload,
      expiresAt: new Date(Date.now() - 5000).toISOString(),
    };
    const token = generateApprovalToken(expiredPayload, "my-secret");
    const result = verifyApprovalToken(token, expiredPayload, "my-secret");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("EXPIRED");
  });

  it("rejects malformed token strings", () => {
    expect(verifyApprovalToken("garbage", samplePayload).valid).toBe(false);
    expect(verifyApprovalToken("id.sig.extra", samplePayload).valid).toBe(false);
    expect(verifyApprovalToken("", samplePayload).valid).toBe(false);
    expect(
      verifyApprovalToken("other-id.1234567890abcdef", samplePayload).reason
    ).toBe("ID_MISMATCH");
  });
});
