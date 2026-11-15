import { z } from "zod";

export const AcceptanceCriterionSchema = z.object({
  id: z.string().min(1, "Acceptance criterion ID is required"),
  title: z.string().min(1, "Title is required"),
  given: z.string().min(1, "Given precondition is required"),
  when: z.string().min(1, "When action/trigger is required"),
  then: z.string().min(1, "Then outcome is required"),
});

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

export const ClarificationQuestionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  question: z.string().min(1, "Question text is required"),
  rationale: z.string().min(1, "Rationale is required"),
  options: z.array(z.string()).optional(),
  recommendedOption: z.string().optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

export const AmbiguityDimensionsSchema = z.object({
  goalClarity: z.number().min(0).max(1),
  technicalBoundaries: z.number().min(0).max(1),
  acceptanceMeasurability: z.number().min(0).max(1),
  preconditions: z.number().min(0).max(1),
});

export type AmbiguityDimensions = z.infer<typeof AmbiguityDimensionsSchema>;

export const AmbiguityAssessmentSchema = z.object({
  score: z.number().min(0).max(1),
  dimensions: AmbiguityDimensionsSchema,
  reasoning: z.string().min(1, "Ambiguity reasoning is required"),
});

export type AmbiguityAssessment = z.infer<typeof AmbiguityAssessmentSchema>;

export const SpecificationPayloadSchema = z.object({
  scope: z.string().min(10, "Scope description must be at least 10 characters"),
  exclusions: z.string().min(5, "Exclusions must be at least 5 characters"),
  acceptanceCriteria: z
    .array(AcceptanceCriterionSchema)
    .min(1, "At least one acceptance criterion is required"),
  assumptions: z.array(z.string()).default([]),
});

export type SpecificationPayload = z.infer<typeof SpecificationPayloadSchema>;

export const SpecifiedResultSchema = z.object({
  status: z.literal("specified"),
  ambiguity: AmbiguityAssessmentSchema,
  specification: SpecificationPayloadSchema,
});

export type SpecifiedResult = z.infer<typeof SpecifiedResultSchema>;

export const NeedsClarificationResultSchema = z.object({
  status: z.literal("needs_clarification"),
  ambiguity: AmbiguityAssessmentSchema,
  questions: z
    .array(ClarificationQuestionSchema)
    .min(1, "At least one clarification question is required")
    .max(3, "At most three clarification questions are permitted"),
});

export type NeedsClarificationResult = z.infer<
  typeof NeedsClarificationResultSchema
>;

export const SpecifierAgentResponseSchema = z.discriminatedUnion("status", [
  SpecifiedResultSchema,
  NeedsClarificationResultSchema,
]);

export type SpecifierAgentResponse = z.infer<
  typeof SpecifierAgentResponseSchema
>;

export interface ClarificationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface SpecifierInput {
  rawPrompt: string;
  projectId?: string;
  projectContext?: string;
  userId?: string;
  runId?: string;
  clarifications?: ClarificationAnswer[];
}
