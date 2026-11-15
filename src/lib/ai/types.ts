export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export type AIResponseFormat = "text" | "json";

export interface AICompletionRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: AIResponseFormat;
  stream?: boolean;
  userId?: string;
  runId?: string;
  timeoutMs?: number;
}

export interface AICompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: AICompletionUsage;
  costInr: number;
  latencyMs: number;
}

export interface AIStreamChunk {
  contentChunk: string;
  isFinished: boolean;
  model?: string;
  usage?: AICompletionUsage;
}

export interface ModelDefinition {
  id: string;
  name: string;
  provider: string;
  tier: "free" | "paid";
  contextWindow: number;
  inputCostPer1MUsd: number;
  outputCostPer1MUsd: number;
  category: "general" | "reasoning" | "coding" | "fast";
  description?: string;
}

export interface AIProviderAdapter {
  readonly providerName: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk, void, unknown>;
  getModelInfo(model: string): ModelDefinition;
  isAvailable(): Promise<boolean>;
}
