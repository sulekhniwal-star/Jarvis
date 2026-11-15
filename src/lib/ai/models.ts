import { ModelDefinition } from "./types";

export const DEFAULT_USD_INR_EXCHANGE_RATE = 84.0;

export const KNOWN_MODELS: Record<string, ModelDefinition> = {
  // Free Tier Models
  "meta-llama/llama-3.3-70b-instruct:free": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct (Free)",
    provider: "openrouter",
    tier: "free",
    contextWindow: 128000,
    inputCostPer1MUsd: 0.0,
    outputCostPer1MUsd: 0.0,
    category: "general",
    description: "Primary free model for reasoning, planning, and task orchestration.",
  },
  "google/gemini-2.0-flash-exp:free": {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Experimental (Free)",
    provider: "openrouter",
    tier: "free",
    contextWindow: 1000000,
    inputCostPer1MUsd: 0.0,
    outputCostPer1MUsd: 0.0,
    category: "fast",
    description: "High-speed multi-modal and large-context specification extraction.",
  },
  "qwen/qwen-2.5-coder-32b-instruct:free": {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B Instruct (Free)",
    provider: "openrouter",
    tier: "free",
    contextWindow: 32768,
    inputCostPer1MUsd: 0.0,
    outputCostPer1MUsd: 0.0,
    category: "coding",
    description: "Specialized free model for code generation and syntax verification.",
  },

  // Paid Tier Models (Approval Gated)
  "anthropic/claude-3.5-sonnet": {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "openrouter",
    tier: "paid",
    contextWindow: 200000,
    inputCostPer1MUsd: 3.0,
    outputCostPer1MUsd: 15.0,
    category: "coding",
    description: "Premier coding and architectural reasoning model. Gated by explicit approval.",
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openrouter",
    tier: "paid",
    contextWindow: 128000,
    inputCostPer1MUsd: 2.5,
    outputCostPer1MUsd: 10.0,
    category: "general",
    description: "High capability multi-turn instruction following. Gated by explicit approval.",
  },
};

export const DEFAULT_FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export const FREE_MODEL_FALLBACK_CHAIN: string[] = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
];

export function isFreeModel(model: string): boolean {
  if (model.endsWith(":free")) {
    return true;
  }
  const def = KNOWN_MODELS[model];
  return def ? def.tier === "free" : false;
}

export function getModelDefinition(model: string): ModelDefinition {
  if (KNOWN_MODELS[model]) {
    return KNOWN_MODELS[model];
  }

  // Handle uncataloged models with safe fallback defaults
  const isFree = isFreeModel(model);
  return {
    id: model,
    name: model,
    provider: "unknown",
    tier: isFree ? "free" : "paid",
    contextWindow: 32768,
    // Conservative default pricing for unknown paid models ($5 in / $15 out)
    inputCostPer1MUsd: isFree ? 0.0 : 5.0,
    outputCostPer1MUsd: isFree ? 0.0 : 15.0,
    category: "general",
    description: `Dynamic model definition for '${model}'.`,
  };
}

export function calculateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const def = getModelDefinition(model);
  if (def.tier === "free") {
    return 0.0;
  }
  const inputCost = (promptTokens * def.inputCostPer1MUsd) / 1000000;
  const outputCost = (completionTokens * def.outputCostPer1MUsd) / 1000000;
  return Number((inputCost + outputCost).toFixed(6));
}

export function calculateCostInr(
  model: string,
  promptTokens: number,
  completionTokens: number,
  exchangeRate: number = DEFAULT_USD_INR_EXCHANGE_RATE
): number {
  const costUsd = calculateCostUsd(model, promptTokens, completionTokens);
  return Number((costUsd * exchangeRate).toFixed(4));
}
