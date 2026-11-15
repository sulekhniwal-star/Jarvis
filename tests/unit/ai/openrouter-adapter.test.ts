import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenRouterAdapter,
  OpenRouterError,
} from "@/lib/ai/adapters/openrouter";

describe("OpenRouter AI Provider Adapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("checks availability based on API key presence", async () => {
    const withKey = new OpenRouterAdapter({ apiKey: "sk-or-test-key" });
    expect(await withKey.isAvailable()).toBe(true);

    const withoutKey = new OpenRouterAdapter({ apiKey: "" });
    expect(await withoutKey.isAvailable()).toBe(false);
  });

  it("sends correct headers and serializes chat completion request", async () => {
    const mockResponse = {
      id: "gen-123",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello from OpenRouter Llama 3.3!",
          },
        },
      ],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40,
      },
    };

    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = String(url);
      capturedOptions = options;
      return Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const adapter = new OpenRouterAdapter({
      apiKey: "sk-or-test-key-xyz",
      referer: "https://jarvis.internal",
      title: "Jarvis AI Assistant",
    });

    const result = await adapter.complete({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: "You are Jarvis." },
        { role: "user", content: "Greet me." },
      ],
      temperature: 0.3,
      responseFormat: "json",
    });

    expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(capturedOptions?.method).toBe("POST");

    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-or-test-key-xyz");
    expect(headers["HTTP-Referer"]).toBe("https://jarvis.internal");
    expect(headers["X-Title"]).toBe("Jarvis AI Assistant");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(String(capturedOptions?.body));
    expect(body.model).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(body.messages).toHaveLength(2);
    expect(body.temperature).toBe(0.3);
    expect(body.response_format).toEqual({ type: "json_object" });

    expect(result.id).toBe("gen-123");
    expect(result.content).toBe("Hello from OpenRouter Llama 3.3!");
    expect(result.usage.totalTokens).toBe(40);
    expect(result.costInr).toBe(0); // Free model
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("throws normalized OpenRouterError with status code when upstream fails", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const adapter = new OpenRouterAdapter({ apiKey: "sk-test" });

    await expect(
      adapter.complete({
        messages: [{ role: "user", content: "Test" }],
      })
    ).rejects.toThrow(OpenRouterError);

    try {
      await adapter.complete({
        messages: [{ role: "user", content: "Test" }],
      });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect((err as OpenRouterError).status).toBe(429);
    }
  });

  it("handles Server-Sent Events (SSE) streaming chunks and terminates on [DONE]", async () => {
    const sseLines = [
      'data: {"id":"gen-1","choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"id":"gen-1","choices":[{"delta":{"content":" World"}}]}\n\n',
      'data: {"id":"gen-1","choices":[{"delta":{"content":"!"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const line of sseLines) {
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const adapter = new OpenRouterAdapter({ apiKey: "sk-test" });
    const chunks: string[] = [];

    for await (const chunk of adapter.stream({
      messages: [{ role: "user", content: "Stream test" }],
    })) {
      if (chunk.contentChunk) {
        chunks.push(chunk.contentChunk);
      }
    }

    expect(chunks.join("")).toBe("Hello World!");
  });
});
