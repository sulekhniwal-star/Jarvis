import {
  AICompletionRequest,
  AICompletionResponse,
  AIProviderAdapter,
  AIStreamChunk,
  ModelDefinition,
} from "../types";
import {
  DEFAULT_FREE_MODEL,
  calculateCostInr,
  getModelDefinition,
} from "../models";

export interface OpenRouterAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  referer?: string;
  title?: string;
  defaultTimeoutMs?: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: unknown
  ) {
    super(`[OpenRouter Error ${status}] ${message}`);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

export class OpenRouterAdapter implements AIProviderAdapter {
  public readonly providerName = "openrouter";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly referer: string;
  private readonly title: string;
  private readonly defaultTimeoutMs: number;

  constructor(options: OpenRouterAdapterOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || "";
    this.baseUrl =
      options.baseUrl || "https://openrouter.ai/api/v1/chat/completions";
    this.referer = options.referer || "https://jarvis.internal";
    this.title = options.title || "Jarvis AI Assistant";
    this.defaultTimeoutMs = options.defaultTimeoutMs || 60000;
  }

  public async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  public getModelInfo(model: string): ModelDefinition {
    return getModelDefinition(model);
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": this.referer,
      "X-Title": this.title,
      "Content-Type": "application/json",
    };
  }

  public async complete(
    request: AICompletionRequest
  ): Promise<AICompletionResponse> {
    const model = request.model || DEFAULT_FREE_MODEL;
    const startTime = Date.now();

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
    };

    if (request.responseFormat === "json") {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs || this.defaultTimeoutMs
    );

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errBody: unknown;
        try {
          errBody = await response.json();
        } catch {
          errBody = await response.text();
        }
        throw new OpenRouterError(
          `Request to OpenRouter failed with status ${response.status}`,
          response.status,
          errBody
        );
      }

      const json = await response.json();
      const latencyMs = Date.now() - startTime;

      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? "";

      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const completionTokens = json.usage?.completion_tokens ?? 0;
      const totalTokens = json.usage?.total_tokens ?? promptTokens + completionTokens;

      const costInr = calculateCostInr(model, promptTokens, completionTokens);

      return {
        id: json.id || `gen-${Date.now()}`,
        content,
        model,
        provider: this.providerName,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        costInr,
        latencyMs,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (
        err instanceof OpenRouterError ||
        (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "OpenRouterError")
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new OpenRouterError(message, 500, err);
    }
  }

  public async *stream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const model = request.model || DEFAULT_FREE_MODEL;

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
      stream: true,
    };

    if (request.responseFormat === "json") {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs || this.defaultTimeoutMs
    );

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : String(err);
      throw new OpenRouterError(message, 500, err);
    }

    clearTimeout(timeout);

    if (!response.ok) {
      let errBody: unknown;
      try {
        errBody = await response.json();
      } catch {
        errBody = await response.text();
      }
      throw new OpenRouterError(
        `Streaming request failed with status ${response.status}`,
        response.status,
        errBody
      );
    }

    if (!response.body) {
      throw new OpenRouterError("No response body received for stream", 500);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) {
            continue;
          }

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") {
            yield {
              contentChunk: "",
              isFinished: true,
              model,
            };
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              yield {
                contentChunk: delta,
                isFinished: false,
                model,
              };
            }
          } catch {
            // Ignore malformed partial chunks in stream
          }
        }
      }

      yield {
        contentChunk: "",
        isFinished: true,
        model,
      };
    } finally {
      reader.releaseLock();
    }
  }
}
