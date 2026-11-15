import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedSender, verifyWebhookSecret, validateUpdate } from "@/lib/telegram/guard";
import { TelegramUpdate } from "@/lib/telegram/types";

describe("TelegramSecurityGuard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OWNER_TELEGRAM_ID = "987654321";
    process.env.TELEGRAM_WEBHOOK_SECRET = "super-secret-token-xyz";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isAuthorizedSender", () => {
    it("returns true when sender ID matches OWNER_TELEGRAM_ID", () => {
      expect(isAuthorizedSender(987654321)).toBe(true);
      expect(isAuthorizedSender("987654321")).toBe(true);
    });

    it("returns false when sender ID does not match OWNER_TELEGRAM_ID", () => {
      expect(isAuthorizedSender(123456789)).toBe(false);
      expect(isAuthorizedSender("111111111")).toBe(false);
    });

    it("returns false when sender ID is null, undefined, or empty", () => {
      expect(isAuthorizedSender(undefined)).toBe(false);
      expect(isAuthorizedSender(null)).toBe(false);
      expect(isAuthorizedSender("")).toBe(false);
    });

    it("returns false when OWNER_TELEGRAM_ID is not configured", () => {
      delete process.env.OWNER_TELEGRAM_ID;
      expect(isAuthorizedSender(987654321)).toBe(false);
    });
  });

  describe("verifyWebhookSecret", () => {
    it("returns true when header matches configured secret", () => {
      expect(verifyWebhookSecret("super-secret-token-xyz")).toBe(true);
    });

    it("returns false when header does not match configured secret", () => {
      expect(verifyWebhookSecret("wrong-secret")).toBe(false);
      expect(verifyWebhookSecret(null)).toBe(false);
      expect(verifyWebhookSecret(undefined)).toBe(false);
    });

    it("returns true when TELEGRAM_WEBHOOK_SECRET is unset", () => {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
      expect(verifyWebhookSecret(null)).toBe(true);
      expect(verifyWebhookSecret("any-token")).toBe(true);
    });
  });

  describe("validateUpdate", () => {
    it("authorizes valid update originating from owner message", () => {
      const update: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 100,
          chat: { id: 987654321, type: "private" },
          from: { id: 987654321, is_bot: false, first_name: "Owner", username: "owner" },
          date: 1700000000,
          text: "/status",
        },
      };

      const result = validateUpdate(update);
      expect(result.isAuthorized).toBe(true);
      expect(result.senderId).toBe(987654321);
      expect(result.senderUsername).toBe("owner");
    });

    it("authorizes valid update originating from owner callback query", () => {
      const update: TelegramUpdate = {
        update_id: 2,
        callback_query: {
          id: "cb_1",
          from: { id: 987654321, is_bot: false, first_name: "Owner", username: "owner" },
          data: "approve_123",
        },
      };

      const result = validateUpdate(update);
      expect(result.isAuthorized).toBe(true);
      expect(result.senderId).toBe(987654321);
    });

    it("rejects update from unauthorized sender", () => {
      const update: TelegramUpdate = {
        update_id: 3,
        message: {
          message_id: 101,
          chat: { id: 999999999, type: "private" },
          from: { id: 999999999, is_bot: false, first_name: "Attacker", username: "attacker" },
          date: 1700000000,
          text: "/kill",
        },
      };

      const result = validateUpdate(update);
      expect(result.isAuthorized).toBe(false);
      expect(result.senderId).toBe(999999999);
      expect(result.reason).toContain("Unauthorized Telegram sender ID: 999999999");
    });

    it("rejects update with no sender info", () => {
      const update: TelegramUpdate = {
        update_id: 4,
      };

      const result = validateUpdate(update);
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain("No sender information found");
    });
  });
});
