import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelegramClient } from "@/lib/telegram/client";
import { TelegramApiError } from "@/lib/telegram/types";

describe("TelegramClient", () => {
  const originalFetch = globalThis.fetch;
  const mockToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws TelegramApiError if token is not provided or configured", async () => {
    const client = new TelegramClient({ botToken: "" });
    await expect(client.sendMessage(12345, "Hello")).rejects.toThrow(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  });

  it("sends a message successfully", async () => {
    const mockResponse = {
      ok: true,
      result: {
        message_id: 101,
        chat: { id: 12345, type: "private" },
        date: 1700000000,
        text: "Test message",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const client = new TelegramClient({ botToken: mockToken });
    const result = await client.sendMessage(12345, "Test message", {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[{ text: "Button", callback_data: "data_1" }]],
      },
    });

    expect(result.message_id).toBe(101);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe(`https://api.telegram.org/bot${mockToken}/sendMessage`);
    expect(calledInit.method).toBe("POST");
    expect(JSON.parse(calledInit.body)).toEqual({
      chat_id: 12345,
      text: "Test message",
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[{ text: "Button", callback_data: "data_1" }]],
      },
    });
  });

  it("edits message text successfully", async () => {
    const mockResponse = {
      ok: true,
      result: {
        message_id: 101,
        chat: { id: 12345, type: "private" },
        date: 1700000000,
        text: "Updated text",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const client = new TelegramClient({ botToken: mockToken });
    const result = await client.editMessageText(12345, 101, "Updated text");

    expect(result.text).toBe("Updated text");
    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe(`https://api.telegram.org/bot${mockToken}/editMessageText`);
    expect(JSON.parse(calledInit.body)).toEqual({
      chat_id: 12345,
      message_id: 101,
      text: "Updated text",
      parse_mode: "MarkdownV2",
    });
  });

  it("answers callback query successfully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true }),
    });

    const client = new TelegramClient({ botToken: mockToken });
    const result = await client.answerCallbackQuery("query_123", "Approved!", true);

    expect(result).toBe(true);
    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe(`https://api.telegram.org/bot${mockToken}/answerCallbackQuery`);
    expect(JSON.parse(calledInit.body)).toEqual({
      callback_query_id: "query_123",
      text: "Approved!",
      show_alert: true,
    });
  });

  it("retrieves updates via long polling", async () => {
    const mockUpdates = [
      {
        update_id: 1,
        message: {
          message_id: 10,
          chat: { id: 12345, type: "private" },
          date: 1700000000,
          text: "/status",
        },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: mockUpdates }),
    });

    const client = new TelegramClient({ botToken: mockToken });
    const updates = await client.getUpdates({ offset: 2, timeout: 30 });

    expect(updates).toHaveLength(1);
    expect(updates[0]?.update_id).toBe(1);
    const [, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(JSON.parse(calledInit.body)).toEqual({
      offset: 2,
      timeout: 30,
    });
  });

  it("handles webhook registration and deletion", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true }),
    });

    const client = new TelegramClient({ botToken: mockToken });
    const setRes = await client.setWebhook("https://example.com/api/telegram/webhook", {
      secretToken: "secret_123",
    });
    expect(setRes).toBe(true);

    const delRes = await client.deleteWebhook({ dropPendingUpdates: true });
    expect(delRes).toBe(true);
  });

  it("throws TelegramApiError when Telegram returns ok: false", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        ok: false,
        error_code: 400,
        description: "Bad Request: chat not found",
      }),
    });

    const client = new TelegramClient({ botToken: mockToken });

    await expect(client.sendMessage(99999, "Hello")).rejects.toThrow(TelegramApiError);
    try {
      await client.sendMessage(99999, "Hello");
    } catch (err) {
      const apiErr = err as TelegramApiError;
      expect(apiErr.errorCode).toBe(400);
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.description).toBe("Bad Request: chat not found");
    }
  });

  it("handles network failure gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));

    const client = new TelegramClient({ botToken: mockToken });
    await expect(client.sendMessage(12345, "Hello")).rejects.toThrow(
      "Network failure while contacting Telegram API: Network connection lost"
    );
  });
});
