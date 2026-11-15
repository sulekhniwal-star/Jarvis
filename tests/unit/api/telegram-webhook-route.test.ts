import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import { NextRequest } from "next/server";
import { TelegramClient } from "@/lib/telegram/client";
import { TelegramIntakeService } from "@/lib/telegram/intake";
import { TelegramDecisionService } from "@/lib/telegram/decision";

vi.mock("@/lib/telegram/client", () => {
  return {
    TelegramClient: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn().mockResolvedValue({ message_id: 123 }),
    })),
  };
});

vi.mock("@/lib/telegram/intake", () => {
  return {
    TelegramIntakeService: vi.fn().mockImplementation(() => ({
      getActiveClarificationSession: vi.fn().mockResolvedValue(null),
      handleNewTaskPrompt: vi.fn().mockResolvedValue("Specification Formulated: Health check"),
      handleClarificationAnswer: vi.fn().mockResolvedValue("Specification Formulated: Answer processed"),
      cancelClarification: vi.fn().mockResolvedValue("Clarification Cancelled"),
    })),
  };
});

vi.mock("@/lib/telegram/decision", () => {
  return {
    TelegramDecisionService: vi.fn().mockImplementation(() => ({
      handleCallbackQuery: vi.fn().mockResolvedValue({ success: true, message: "Decided" }),
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

  it("processes natural language prompt from authorized owner and routes through intake service", async () => {
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

    const intakeInstance = (TelegramIntakeService as any).mock.results[0]?.value;
    expect(intakeInstance.handleNewTaskPrompt).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000000",
      "Please add a health check endpoint"
    );

    const clientInstance = (TelegramClient as any).mock.results[0]?.value;
    expect(clientInstance.sendMessage).toHaveBeenCalledWith(
      987654321,
      "Specification Formulated: Health check"
    );
  });

  it("routes answer to active clarification session when one is pending", async () => {
    const mockSession = {
      conversationId: "conv-1",
      taskId: "task-1",
      originalPrompt: "Fix stuff",
      questions: [],
      round: 1,
    };

    (TelegramIntakeService as any).mockImplementationOnce(() => ({
      getActiveClarificationSession: vi.fn().mockResolvedValue(mockSession),
      handleNewTaskPrompt: vi.fn(),
      handleClarificationAnswer: vi.fn().mockResolvedValue("Specification Formulated: Answer processed"),
      cancelClarification: vi.fn(),
    }));

    const authorizedUpdate = {
      update_id: 4,
      message: {
        message_id: 40,
        chat: { id: 987654321, type: "private" },
        from: { id: 987654321, is_bot: false, first_name: "Owner" },
        date: 1700000000,
        text: "Use PostgreSQL",
      },
    };

    const req = createRequest(authorizedUpdate, "test-secret-token");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const clientInstance = (TelegramClient as any).mock.results[0]?.value;
    expect(clientInstance.sendMessage).toHaveBeenCalledWith(
      987654321,
      "Specification Formulated: Answer processed"
    );
  });

  it("processes callback query update from authorized owner and delegates to decision service", async () => {
    const callbackUpdate = {
      update_id: 5,
      callback_query: {
        id: "cb-test-1",
        from: { id: 987654321, is_bot: false, first_name: "Owner" },
        message: {
          message_id: 50,
          chat: { id: 987654321, type: "private" },
          date: 1700000000,
        },
        data: "appr:plan:11111111-2222-3333-4444-555555555555",
      },
    };

    const req = createRequest(callbackUpdate, "test-secret-token");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const decisionInstance = (TelegramDecisionService as any).mock.results[0]?.value;
    expect(decisionInstance.handleCallbackQuery).toHaveBeenCalledWith(
      callbackUpdate.callback_query,
      "00000000-0000-0000-0000-000000000000"
    );
  });
});
