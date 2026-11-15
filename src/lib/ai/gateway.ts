import {
  AICompletionRequest,
  AICompletionResponse,
  AIProviderAdapter,
  AIStreamChunk,
} from "./types";
import {
  DEFAULT_FREE_MODEL,
  FREE_MODEL_FALLBACK_CHAIN,
  calculateCostInr,
  isFreeModel,
} from "./models";
import { ApprovalRepository } from "../repositories/approval-repository";
import { BudgetService, UsageLedgerService } from "./ledger";
import { OpenRouterError } from "./adapters/openrouter";

export class PaidInferenceApprovalRequiredError extends Error {
  constructor(
    public readonly model: string,
    public readonly estimatedCostInr: number,
    message?: string
  ) {
    super(
      message ??
        `[Approval Gate] Dispatching paid model '${model}' requires explicit owner approval. Estimated cost: ₹${estimatedCostInr.toFixed(4)}.`
    );
    this.name = "PaidInferenceApprovalRequiredError";
    Object.setPrototypeOf(this, PaidInferenceApprovalRequiredError.prototype);
  }
}

export class AllFreeModelsExhaustedError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super(
      `[AI Gateway] All free-tier models have failed due to rate limits or upstream outages. Paid models will NOT be called automatically without owner approval.`
    );
    this.name = "AllFreeModelsExhaustedError";
    Object.setPrototypeOf(this, AllFreeModelsExhaustedError.prototype);
  }
}

export interface AIGatewayOptions {
  adapter: AIProviderAdapter;
  approvalRepo?: ApprovalRepository;
  ledgerService?: UsageLedgerService;
  budgetService?: BudgetService;
  freeFallbackChain?: string[];
}

export class AIGateway {
  private readonly adapter: AIProviderAdapter;
  private readonly approvalRepo?: ApprovalRepository;
  private readonly ledgerService?: UsageLedgerService;
  private readonly budgetService?: BudgetService;
  private readonly freeFallbackChain: string[];

  constructor(options: AIGatewayOptions) {
    this.adapter = options.adapter;
    this.approvalRepo = options.approvalRepo;
    this.ledgerService = options.ledgerService;
    this.budgetService = options.budgetService;
    this.freeFallbackChain =
      options.freeFallbackChain ?? FREE_MODEL_FALLBACK_CHAIN;
  }

  private async verifyPaidModelApproval(
    model: string,
    userId?: string
  ): Promise<void> {
    const isFree = isFreeModel(model);
    if (isFree) {
      return;
    }

    // Estimate conservative cost (e.g., 2,000 prompt + 1,000 completion)
    const estimatedCostInr = calculateCostInr(model, 2000, 1000);

    if (!userId) {
      throw new PaidInferenceApprovalRequiredError(
        model,
        estimatedCostInr,
        `[Approval Gate] Paid model '${model}' requires an authenticated user with an approved authorization.`
      );
    }

    if (!this.approvalRepo) {
      throw new PaidInferenceApprovalRequiredError(
        model,
        estimatedCostInr,
        `[Approval Gate] Paid model '${model}' rejected: ApprovalRepository not configured.`
      );
    }

    const hasValidApproval = await this.approvalRepo.hasActiveApproval(
      userId,
      "paid_ai_inference"
    );

    if (!hasValidApproval) {
      throw new PaidInferenceApprovalRequiredError(model, estimatedCostInr);
    }

    // Check budget limits before paid dispatch
    if (this.budgetService) {
      await this.budgetService.checkBudgetLimits(userId, estimatedCostInr);
    }
  }

  public async complete(
    request: AICompletionRequest
  ): Promise<AICompletionResponse> {
    const requestedModel = request.model || DEFAULT_FREE_MODEL;

    // Check if paid model
    if (!isFreeModel(requestedModel)) {
      await this.verifyPaidModelApproval(requestedModel, request.userId);

      const response = await this.adapter.complete({
        ...request,
        model: requestedModel,
      });

      if (this.ledgerService && request.userId) {
        await this.ledgerService.recordUsage({
          userId: request.userId,
          runId: request.runId,
          provider: response.provider,
          model: response.model,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          costInr: response.costInr,
          isEstimated: false,
        });
      }

      return response;
    }

    // Free model hierarchy fallback chain
    const fallbackList = [
      requestedModel,
      ...this.freeFallbackChain.filter((m) => m !== requestedModel),
    ];

    const modelErrors: Record<string, string> = {};

    for (const modelToAttempt of fallbackList) {
      try {
        const response = await this.adapter.complete({
          ...request,
          model: modelToAttempt,
        });

        if (this.ledgerService && request.userId) {
          await this.ledgerService.recordUsage({
            userId: request.userId,
            runId: request.runId,
            provider: response.provider,
            model: response.model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            costInr: 0,
            isEstimated: false,
          });
        }

        return response;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        modelErrors[modelToAttempt] = errorMsg;

        // If error is 429 or 5xx, continue to next free model
        const isRecoverable =
          err instanceof OpenRouterError &&
          (err.status === 429 || err.status >= 500);

        if (!isRecoverable && !(err instanceof OpenRouterError)) {
          // Continue fallback on connection failure
        }
      }
    }

    // Never fall back to paid models automatically
    throw new AllFreeModelsExhaustedError(modelErrors);
  }

  public async *stream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const requestedModel = request.model || DEFAULT_FREE_MODEL;

    if (!isFreeModel(requestedModel)) {
      await this.verifyPaidModelApproval(requestedModel, request.userId);
    }

    for await (const chunk of this.adapter.stream(request)) {
      yield chunk;
    }
  }
}
