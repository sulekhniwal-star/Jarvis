import { describe, it, expect } from "vitest";
import {
  isFreeModel,
  getModelDefinition,
  calculateCostUsd,
  calculateCostInr,
  KNOWN_MODELS,
  FREE_MODEL_FALLBACK_CHAIN,
} from "@/lib/ai/models";

describe("Model Catalog & Pricing Service", () => {
  it("identifies approved free models correctly", () => {
    expect(isFreeModel("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
    expect(isFreeModel("google/gemini-2.0-flash-exp:free")).toBe(true);
    expect(isFreeModel("qwen/qwen-2.5-coder-32b-instruct:free")).toBe(true);
    expect(isFreeModel("custom-org/any-model:free")).toBe(true);
  });

  it("identifies paid models correctly", () => {
    expect(isFreeModel("anthropic/claude-3.5-sonnet")).toBe(false);
    expect(isFreeModel("openai/gpt-4o")).toBe(false);
    expect(isFreeModel("unknown/paid-model")).toBe(false);
  });

  it("retrieves catalog definitions with accurate context windows and tiers", () => {
    const llama = getModelDefinition("meta-llama/llama-3.3-70b-instruct:free");
    expect(llama.tier).toBe("free");
    expect(llama.contextWindow).toBe(128000);
    expect(llama.inputCostPer1MUsd).toBe(0);
    expect(llama.outputCostPer1MUsd).toBe(0);

    const claude = getModelDefinition("anthropic/claude-3.5-sonnet");
    expect(claude.tier).toBe("paid");
    expect(claude.contextWindow).toBe(200000);
    expect(claude.inputCostPer1MUsd).toBe(3.0);
    expect(claude.outputCostPer1MUsd).toBe(15.0);
  });

  it("calculates 0 USD cost for free tier models regardless of token count", () => {
    const freeCost = calculateCostUsd(
      "meta-llama/llama-3.3-70b-instruct:free",
      15000,
      4000
    );
    expect(freeCost).toBe(0);

    const freeCostInr = calculateCostInr(
      "meta-llama/llama-3.3-70b-instruct:free",
      15000,
      4000
    );
    expect(freeCostInr).toBe(0);
  });

  it("calculates accurate USD and INR cost for paid models", () => {
    // Claude 3.5 Sonnet: $3.00/1M input, $15.00/1M output
    // 10,000 prompt tokens = $0.0300
    // 2,000 completion tokens = $0.0300
    // Total USD = $0.0600
    // At 84 INR/USD = ₹5.0400 INR
    const promptTokens = 10000;
    const completionTokens = 2000;

    const costUsd = calculateCostUsd(
      "anthropic/claude-3.5-sonnet",
      promptTokens,
      completionTokens
    );
    expect(costUsd).toBe(0.06);

    const costInr = calculateCostInr(
      "anthropic/claude-3.5-sonnet",
      promptTokens,
      completionTokens,
      84.0
    );
    expect(costInr).toBe(5.04);
  });

  it("includes all primary free models in the fallback chain", () => {
    expect(FREE_MODEL_FALLBACK_CHAIN.length).toBeGreaterThanOrEqual(3);
    expect(FREE_MODEL_FALLBACK_CHAIN).toContain(
      "meta-llama/llama-3.3-70b-instruct:free"
    );
    expect(FREE_MODEL_FALLBACK_CHAIN).toContain(
      "google/gemini-2.0-flash-exp:free"
    );
    expect(FREE_MODEL_FALLBACK_CHAIN).toContain(
      "qwen/qwen-2.5-coder-32b-instruct:free"
    );
  });
});
