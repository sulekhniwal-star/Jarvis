import { timingSafeEqual } from 'node:crypto';

/**
 * Validates the X-Telegram-Bot-Api-Secret-Token header using constant-time comparison.
 * Prevents timing attacks on the webhook endpoint.
 */
export function validateWebhookSecret(
  incomingSecret: string | null | undefined,
  expectedSecret: string
): boolean {
  if (!incomingSecret || !expectedSecret) {
    return false;
  }

  const incomingBuffer = Buffer.from(incomingSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
}

/**
 * Checks whether an incoming Telegram chat ID is authorized.
 */
export function isChatAuthorized(
  incomingChatId: number | string,
  authorizedChatId: number | string | null | undefined
): boolean {
  if (!authorizedChatId) return false;
  return String(incomingChatId) === String(authorizedChatId);
}
