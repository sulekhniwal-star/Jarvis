import crypto from "crypto";

export interface ApprovalTokenPayload {
  id: string;
  actionType: string;
  targetResource: string;
  userId: string;
  expiresAt: string | Date;
}

export interface TokenVerificationResult {
  valid: boolean;
  reason?: "INVALID_FORMAT" | "ID_MISMATCH" | "EXPIRED" | "SIGNATURE_MISMATCH";
}

function getSecret(customSecret?: string): string {
  if (customSecret) return customSecret;
  return (
    process.env.APPROVAL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "javis-default-approval-hmac-secret-dev"
  );
}

export function buildCanonicalString(payload: ApprovalTokenPayload): string {
  const expiresIso =
    typeof payload.expiresAt === "string"
      ? new Date(payload.expiresAt).toISOString()
      : payload.expiresAt.toISOString();

  return [
    payload.id,
    payload.actionType,
    payload.targetResource,
    payload.userId,
    expiresIso,
  ].join(":");
}

export function generateApprovalToken(
  payload: ApprovalTokenPayload,
  customSecret?: string
): string {
  const secret = getSecret(customSecret);
  const canonical = buildCanonicalString(payload);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(canonical)
    .digest("hex");

  return `${payload.id}.${signature}`;
}

export function extractTokenId(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0]) return null;
  return parts[0];
}

export function verifyApprovalToken(
  token: string,
  expected: ApprovalTokenPayload,
  customSecret?: string
): TokenVerificationResult {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "INVALID_FORMAT" };
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "INVALID_FORMAT" };
  }

  const [tokenId, providedSignature] = parts;

  if (tokenId !== expected.id) {
    return { valid: false, reason: "ID_MISMATCH" };
  }

  const expiryTime =
    typeof expected.expiresAt === "string"
      ? new Date(expected.expiresAt).getTime()
      : expected.expiresAt.getTime();

  if (Date.now() > expiryTime) {
    return { valid: false, reason: "EXPIRED" };
  }

  const secret = getSecret(customSecret);
  const canonical = buildCanonicalString(expected);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(canonical)
    .digest("hex");

  try {
    const providedBuf = Buffer.from(providedSignature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    if (providedBuf.length !== expectedBuf.length) {
      return { valid: false, reason: "SIGNATURE_MISMATCH" };
    }

    const matches = crypto.timingSafeEqual(providedBuf, expectedBuf);
    if (!matches) {
      return { valid: false, reason: "SIGNATURE_MISMATCH" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }
}
