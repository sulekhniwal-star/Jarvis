import crypto from "crypto";
import { TelegramUpdate } from "./types";

/**
 * Validates whether an incoming Telegram sender numeric ID matches the authorized OWNER_TELEGRAM_ID.
 */
export function isAuthorizedSender(fromId: number | string | undefined | null): boolean {
  if (fromId === undefined || fromId === null || fromId === "") {
    return false;
  }

  const ownerId =
    process.env.OWNER_TELEGRAM_ID || process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!ownerId) {
    console.error("[TelegramSecurityGuard] OWNER_TELEGRAM_ID / TELEGRAM_OWNER_CHAT_ID environment variable is not configured.");
    return false;
  }

  return fromId.toString().trim() === ownerId.trim();
}

/**
 * Verifies that the X-Telegram-Bot-Api-Secret-Token header matches the configured TELEGRAM_WEBHOOK_SECRET.
 * Uses timing-safe constant-time comparison via SHA-256 buffer normalization (REQ-SEC-03, NFR-SEC-05).
 * In production, TELEGRAM_WEBHOOK_SECRET is mandatory.
 */
export function verifyWebhookSecret(
  headerSecret: string | null | undefined,
  customSecret?: string
): boolean {
  const expectedSecret = customSecret ?? process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[TelegramSecurityGuard] TELEGRAM_WEBHOOK_SECRET is required in production.");
      return false;
    }
    return true;
  }

  if (!headerSecret || typeof headerSecret !== "string") {
    return false;
  }

  // Digest normalization to 32 bytes ensures constant-time comparison without leaking length
  const expectedHash = crypto.createHash("sha256").update(expectedSecret).digest();
  const providedHash = crypto.createHash("sha256").update(headerSecret).digest();

  return crypto.timingSafeEqual(expectedHash, providedHash);
}

export interface UpdateValidationResult {
  isAuthorized: boolean;
  senderId?: number;
  senderUsername?: string;
  reason?: string;
}

/**
 * Inspects a TelegramUpdate to determine if its message or callback query originates
 * from the authorized single owner.
 */
export function validateUpdate(update: TelegramUpdate): UpdateValidationResult {
  const sender = update.message?.from ?? update.callback_query?.from;

  if (!sender) {
    return {
      isAuthorized: false,
      reason: "No sender information found in Telegram update.",
    };
  }

  if (!isAuthorizedSender(sender.id)) {
    return {
      isAuthorized: false,
      senderId: sender.id,
      senderUsername: sender.username,
      reason: `Unauthorized Telegram sender ID: ${sender.id}`,
    };
  }

  return {
    isAuthorized: true,
    senderId: sender.id,
    senderUsername: sender.username,
  };
}
