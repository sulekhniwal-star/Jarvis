import { AIGateway } from "@/lib/ai/gateway";
import { AIMessage } from "@/lib/ai/types";
import {
  ClarificationAnswer,
  SpecifierAgentResponse,
  SpecifierAgentResponseSchema,
  SpecifierInput,
} from "./types";
import { SPECIFIER_SYSTEM_PROMPT, formatUserPromptWithContext } from "./prompts";

export class SpecifierValidationError extends Error {
  constructor(
    message: string,
    public readonly rawContent: string,
    public readonly validationErrors?: unknown
  ) {
    super(message);
    this.name = "SpecifierValidationError";
    Object.setPrototypeOf(this, SpecifierValidationError.prototype);
  }
}

export class SpecifierAgent {
  constructor(private readonly aiGateway: AIGateway) {}

  /**
   * Sanitizes markdown fences, backticks, or trailing characters from raw LLM output.
   */
  public cleanJsonResponse(content: string): string {
    let cleaned = content.trim();

    // Strip ```json ... ``` or ``` ... ```
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

  /**
   * Evaluates a user task prompt and generates a specification or clarification questions.
   */
  public async specify(
    input: SpecifierInput
  ): Promise<SpecifierAgentResponse> {
    const formattedUserPrompt = formatUserPromptWithContext(input);

    const messages: AIMessage[] = [
      {
        role: "system",
        content: SPECIFIER_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: formattedUserPrompt,
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
      throw new SpecifierValidationError(
        `Failed to parse Specifier Agent JSON output: ${(err as Error).message}`,
        response.content
      );
    }

    const validationResult = SpecifierAgentResponseSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      throw new SpecifierValidationError(
        `Specifier Agent output failed schema validation: ${validationResult.error.message}`,
        response.content,
        validationResult.error.issues
      );
    }

    return validationResult.data;
  }

  /**
   * Resumes specification generation by injecting answered clarification questions into the context.
   */
  public async specifyWithClarifications(
    input: SpecifierInput,
    answers: ClarificationAnswer[]
  ): Promise<SpecifierAgentResponse> {
    const existing = input.clarifications ?? [];
    const mergedAnswers = [...existing, ...answers];

    return this.specify({
      ...input,
      clarifications: mergedAnswers,
    });
  }
}
