import { AIGateway } from "@/lib/ai/gateway";
import { AIMessage } from "@/lib/ai/types";
import {
  PlanPayload,
  PlanPayloadSchema,
  PlannerInput,
} from "./types";
import { PLANNER_SYSTEM_PROMPT, formatSpecificationForPlanner } from "./prompts";
import { validateDAG } from "./dag";
import { evaluatePlanRisk } from "./risk";

export class PlannerValidationError extends Error {
  constructor(
    message: string,
    public readonly rawContent: string,
    public readonly validationErrors?: unknown
  ) {
    super(message);
    this.name = "PlannerValidationError";
    Object.setPrototypeOf(this, PlannerValidationError.prototype);
  }
}

export class PlannerDAGError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "PlannerDAGError";
    Object.setPrototypeOf(this, PlannerDAGError.prototype);
  }
}

export class PlannerAgent {
  constructor(private readonly aiGateway: AIGateway) {}

  public cleanJsonResponse(content: string): string {
    let cleaned = content.trim();

    if (cleaned.startsWith("```")) {
      const firstNewline = cleaned.indexOf("\n");
      if (firstNewline !== -1) {
        cleaned = cleaned.substring(firstNewline + 1);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();
    }

    return cleaned;
  }

  public async plan(input: PlannerInput): Promise<PlanPayload> {
    const formattedPrompt = formatSpecificationForPlanner(input);

    const messages: AIMessage[] = [
      {
        role: "system",
        content: PLANNER_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: formattedPrompt,
      },
    ];

    const response = await this.aiGateway.complete({
      messages,
      responseFormat: "json",
      temperature: 0.1,
      userId: input.userId,
      runId: input.runId,
    });

    const cleanedContent = this.cleanJsonResponse(response.content);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedContent);
    } catch (err) {
      throw new PlannerValidationError(
        `Failed to parse Planner Agent JSON output: ${(err as Error).message}`,
        response.content
      );
    }

    const validationResult = PlanPayloadSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      throw new PlannerValidationError(
        `Planner Agent output failed schema validation: ${validationResult.error.message}`,
        response.content,
        validationResult.error.issues
      );
    }

    const planData = validationResult.data;

    // 1. Verify DAG integrity and wave ordering
    const dagResult = validateDAG(planData.steps, planData.dependencies);
    if (!dagResult.isValid) {
      throw new PlannerDAGError(
        `Plan DAG validation failed: ${dagResult.error}`,
        dagResult
      );
    }

    // 2. Evaluate risk policies and reconcile required approvals
    const riskResult = evaluatePlanRisk(planData.steps);

    return {
      steps: riskResult.reconciledSteps,
      dependencies: planData.dependencies,
      riskAssessment: riskResult.riskAssessment,
      requiredApprovals: riskResult.requiredApprovals,
    };
  }
}
