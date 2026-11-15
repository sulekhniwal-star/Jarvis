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
import { OpenRouterError } from "./openrouter";

export interface MockAdapterOptions {
  defaultResponse?: string;
  simulatedError?: { status: number; message: string };
  simulatedLatencyMs?: number;
  simulatedPromptTokens?: number;
  simulatedCompletionTokens?: number;
}

export class MockAIAdapter implements AIProviderAdapter {
  public readonly providerName = "mock";
  public defaultResponse: string;
  public customHandler?: (req: AICompletionRequest) => string;
  public simulatedError: { status: number; message: string } | null = null;
  public simulatedLatencyMs: number;
  public simulatedPromptTokens: number;
  public simulatedCompletionTokens: number;
  public readonly requestHistory: AICompletionRequest[] = [];

  constructor(options: MockAdapterOptions = {}) {
    this.defaultResponse = options.defaultResponse ?? "Mock response from Jarvis AI";
    this.simulatedError = options.simulatedError ?? null;
    this.simulatedLatencyMs = options.simulatedLatencyMs ?? 5;
    this.simulatedPromptTokens = options.simulatedPromptTokens ?? 25;
    this.simulatedCompletionTokens = options.simulatedCompletionTokens ?? 40;
  }

  public setCustomHandler(handler: (req: AICompletionRequest) => string): void {
    this.customHandler = handler;
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public getModelInfo(model: string): ModelDefinition {
    return getModelDefinition(model);
  }

  public async complete(
    request: AICompletionRequest
  ): Promise<AICompletionResponse> {
    this.requestHistory.push(request);

    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }

    if (this.simulatedError) {
      throw new OpenRouterError(
        this.simulatedError.message,
        this.simulatedError.status
      );
    }

    const model = request.model || DEFAULT_FREE_MODEL;
    const promptTokens = this.simulatedPromptTokens;
    const completionTokens = this.simulatedCompletionTokens;
    const totalTokens = promptTokens + completionTokens;
    const costInr = calculateCostInr(model, promptTokens, completionTokens);

    let content = this.customHandler
      ? this.customHandler(request)
      : this.defaultResponse;
    if (request.responseFormat === "json" && !this.customHandler) {
      try {
        JSON.parse(content);
      } catch {
        content = JSON.stringify({ message: content });
      }
    }

    return {
      id: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      content,
      model,
      provider: this.providerName,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      costInr,
      latencyMs: this.simulatedLatencyMs,
    };
  }

  public async *stream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    this.requestHistory.push(request);

    if (this.simulatedError) {
      throw new OpenRouterError(
        this.simulatedError.message,
        this.simulatedError.status
      );
    }

    const model = request.model || DEFAULT_FREE_MODEL;
    const words = this.defaultResponse.split(" ");

    for (const word of words) {
      if (this.simulatedLatencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
      }
      yield {
        contentChunk: word + " ",
        isFinished: false,
        model,
      };
    }

    yield {
      contentChunk: "",
      isFinished: true,
      model,
      usage: {
        promptTokens: this.simulatedPromptTokens,
        completionTokens: this.simulatedCompletionTokens,
        totalTokens: this.simulatedPromptTokens + this.simulatedCompletionTokens,
      },
    };
  }

  public reset(): void {
    this.requestHistory.length = 0;
    this.simulatedError = null;
  }
}
