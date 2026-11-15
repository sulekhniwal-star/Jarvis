import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import { NextRequest } from "next/server";
import { TelegramClient } from "@/lib/telegram/client";

vi.mock("@/lib/telegram/client", () => {
  return {
    TelegramClient: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn().mockResolvedValue({ message_id: 123 }),
    })),
  };
});

describe("POST /api/telegram/webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.OWNER_TELEGRAM_ID = "987654321";
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret-token";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(body: any, secretHeader?: string | null): NextRequest {
    const headers = new Headers();
    if (secretHeader !== undefined && secretHeader !== null) {
      headers.set("x-telegram-bot-api-secret-token", secretHeader);
    }
    return new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("returns 401 when webhook secret is invalid", async () => {
    const req = createRequest({ update_id: 1 }, "wrong-secret");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid Telegram webhook secret token");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = createRequest("not-valid-json", "test-secret-token");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON update payload");
  });

  it("drops update from unauthorized sender and returns 200 with dropped: true", async () => {
    const unauthorizedUpdate = {
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 111111111, type: "private" },
        from: { id: 111111111, is_bot: false, first_name: "Intruder" },
        date: 1700000000,
        text: "/start",
      },
    };

    const req = createRequest(unauthorizedUpdate, "test-secret-token");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.dropped).toBe(true);

    const clientInstance = (TelegramClient as any).mock.results[0]?.value;
    if (clientInstance) {
      expect(clientInstance.sendMessage).not.toHaveBeenCalled();
    }
  });

  it("processes command update from authorized owner and sends response", async () => {
    const authorizedUpdate = {
      update_id: 2,
      message: {
        message_id: 20,
        chat: { id: 987654321, type: "private" },
        from: { id: 987654321, is_bot: false, first_name: "Owner" },
        date: 1700000000,
        text: "/start",
      },
    };

    const req = createRequest(authorizedUpdate, "test-secret-token");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.dropped).toBeUndefined();

    const clientInstance = (TelegramClient as any).mock.results[0]?.value;
    expect(clientInstance.sendMessage).toHaveBeenCalledWith(
      987654321,
      expect.stringContaining("Jarvis AI Command Centre")
    );
  });

  it("processes natural language prompt from authorized owner and sends acknowledgment", async () => {
    const authorizedUpdate = {
      update_id: 3,
      message: {
        message_id: 30,
        chat: { id: 987654321, type: "private" },
        from: { id: 987654321, is_bot: false, first_name: "Owner" },
        date: 1700000000,
        text: "Please add a health check endpoint",
      },
    };

    const req = createRequest(authorizedUpdate, "test-secret-token");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const clientInstance = (TelegramClient as any).mock.results[0]?.value;
    expect(clientInstance.sendMessage).toHaveBeenCalledWith(
      987654321,
      expect.stringContaining("Task Prompt Received")
    );
  });
});
